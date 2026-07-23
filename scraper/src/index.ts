// src/index.ts
import { GenericScraper } from './scrapers/genericScraper';
import { DealSite } from './types';
import * as fs from 'fs';
import * as path from 'path';

type ScrapeMode = 'html' | 'js' | 'pdf' | 'manual';

interface SourceDefinition {
    name: string;
    url?: string;
    scrapeMode?: ScrapeMode;
    notes?: string;
    scraperKey?: string;
    paginationSelector?: string;
    maxPages?: number;
    loadMoreSelector?: string;
    loadMoreText?: string;
    containerSelector?: string;
    maxLoadMoreClicks?: number;
    loadMoreWaitForSelector?: string;
    aliases?: string[];
}

interface SourceCategoryDefinition {
    description?: string;
    sourceIds: string[];
}

interface SourceRegistryFile {
    sources: Record<string, SourceDefinition>;
    categories: Record<string, SourceCategoryDefinition>;
}

function loadSourceRegistry(): SourceRegistryFile {
    const registryPath = path.join(__dirname, '..', 'sources.json');
    const raw = fs.readFileSync(registryPath, 'utf-8');
    return JSON.parse(raw) as SourceRegistryFile;
}

function isScrapeableSource(source: SourceDefinition): boolean {
    return source.scrapeMode !== 'pdf' && source.scrapeMode !== 'manual';
}

function buildSitesToScrape(registry: SourceRegistryFile, category?: string): DealSite[] {
    const selectedCategories = category ? [category] : Object.keys(registry.categories);
    const seenSourceIds = new Set<string>();
    const sites: DealSite[] = [];

    for (const categoryKey of selectedCategories) {
        const categoryDefinition = registry.categories[categoryKey];

        if (!categoryDefinition) {
            console.warn(`[WARN] Unknown source category: ${categoryKey}`);
            continue;
        }

        for (const sourceId of categoryDefinition.sourceIds) {
            if (seenSourceIds.has(sourceId)) {
                continue;
            }

            seenSourceIds.add(sourceId);
            const source = registry.sources[sourceId];

            if (!source) {
                console.warn(`[WARN] Missing source definition for id: ${sourceId}`);
                continue;
            }

            if (!source.url) {
                console.log(`[INFO] Skipping ${source.name}: no URL configured`);
                continue;
            }

            if (!isScrapeableSource(source)) {
                console.log(`[INFO] Skipping ${source.name}: ${source.notes ?? `unsupported mode (${source.scrapeMode ?? 'unknown'})`}`);
                continue;
            }

            const site: DealSite = {
                name: source.name,
                url: source.url,
                category: categoryKey,
                sourceId: sourceId,
                notes: source.notes,
            };

            if (source.scraperKey) {
                site.scraperKey = source.scraperKey;
            }

            if (source.paginationSelector) {
                site.paginationSelector = source.paginationSelector;
            }

            if (source.maxPages !== undefined) {
                site.maxPages = source.maxPages;
            }

            if (source.scrapeMode === 'js') {
                site.useJsScraping = true;
            }

            if (source.loadMoreSelector) {
                site.loadMoreSelector = source.loadMoreSelector;
            }

            if (source.loadMoreText) {
                site.loadMoreText = source.loadMoreText;
            }

            if (source.containerSelector) {
                site.containerSelector = source.containerSelector;
            }

            if (source.maxLoadMoreClicks !== undefined) {
                site.maxLoadMoreClicks = source.maxLoadMoreClicks;
            }

            if (source.loadMoreWaitForSelector) {
                site.loadMoreWaitForSelector = source.loadMoreWaitForSelector;
            }

            sites.push(site);
        }
    }

    return sites;
}

const main = async () => {
    const registry = loadSourceRegistry();
    const requestedCategory = process.argv.slice(2).find(arg => !arg.startsWith('-'));
    const sitesToScrape = buildSitesToScrape(registry, requestedCategory);

    // ============================================================
    // Initialize scraper with sites
    // ============================================================
    const scraper = new GenericScraper(sitesToScrape);

    console.log('\n' + '='.repeat(70));
    console.log('  Generic Deal Scraper');
    console.log('='.repeat(70));
    console.log('\n[INFO] This scraper finds 1-for-x deals from web pages.');
    console.log('[INFO] For best results, use URLs of pages with full deal text.');
    console.log('[INFO] Refer to README.md for usage guidance.\n');

    if (requestedCategory) {
        console.log(`[INFO] Category filter: ${requestedCategory}`);
    }

    const sites = scraper.getSites();
    console.log(`[INFO] Loaded ${sites.length} scrapeable site(s) from ${Object.keys(registry.categories).length} category group(s):`);
    sites.forEach((site, i) => {
        const noteSuffix = site.notes ? ` - ${site.notes}` : '';
        console.log(`  ${i + 1}. ${site.name.padEnd(24)} [${site.category}] ${site.url}${noteSuffix}`);
    });

    try {
        console.log('\n' + '='.repeat(70));
        console.log('Starting scraping...');
        console.log('='.repeat(70));

        // Scrape all configured sites, optionally filtered by category
        const deals = requestedCategory ? await scraper.scrape(requestedCategory) : await scraper.scrape();
        
        // Or scrape by category only:
        // const deals = await scraper.scrape('food');
        
        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save all deals to one file
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const fileName = `deals_${timestamp}.json`;
        const outputPath = path.join(outputDir, fileName);
        fs.writeFileSync(outputPath, JSON.stringify(deals, null, 2), 'utf-8');
        
        console.log('\n' + '='.repeat(70));
        console.log('  SUMMARY');
        console.log('='.repeat(70));
        console.log(`Total deals found: ${deals.length}`);
        console.log(`Output file: ${fileName}`);

        const dealsBySource = deals.reduce((acc, deal) => {
            acc[deal.source_id] = (acc[deal.source_id] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const zeroDealSources = sites.filter(site => {
            const sourceId = site.sourceId ?? site.name;
            return !dealsBySource[sourceId];
        });

        if (zeroDealSources.length > 0) {
            console.log('\nSources with 0 deals found:');
            zeroDealSources.forEach(site => {
                const noteSuffix = site.notes ? ` - ${site.notes}` : '';
                console.log(`  ${site.name.padEnd(30)} [${site.category}] ${site.url}${noteSuffix}`);
            });
        }
        
        if (deals.length > 0) {
            // Group by merchant
            const dealsByMerchant = deals.reduce((acc, deal) => {
                acc[deal.merchant_name] = (acc[deal.merchant_name] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);
            
            console.log('\nDeals by merchant:');
            Object.entries(dealsByMerchant)
                .sort(([, a], [, b]) => b - a)
                .forEach(([merchant, count]) => {
                    console.log(`  ${merchant.padEnd(30)} ${count} deals`);
                });
            
            // Show sample deals
            console.log('\nSample deals:');
            deals.slice(0, 5).forEach((deal, i) => {
                console.log(`  ${i + 1}. [${deal.deal_nature}] ${deal.description.substring(0, 60)}...`);
                console.log(`     Merchant: ${deal.merchant_name}`);
            });
        }
        
        console.log('\n' + '='.repeat(70));
        console.log('✓ Scraping completed!');
        console.log('='.repeat(70) + '\n');
    } catch (error) {
        console.error('\n[ERROR] Scraping failed:', error);
        if (error instanceof Error) {
            console.error('[ERROR] Stack:', error.stack);
        }
        process.exit(1);
    }
};

main();
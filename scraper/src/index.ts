// src/index.ts
import { GenericScraper } from './scrapers/genericScraper';
import { DealSite } from './types';
import * as fs from 'fs';
import * as path from 'path';

const main = async () => {
    // ============================================================
    // Configure sites to scrape here
    // ============================================================
    const sitesToScrape: DealSite[] = [
        // Add your deal pages here. Use full pages containing the deal text,
        // not just listing/category pages.
        // { name: 'Site Name', url: 'https://example.com/deals-page', category: 'food' },
        
        // Active deal sites:
        { name: 'SassyMama SG', url: 'https://www.sassymamasg.com/play-deals-promo-codes-discounts-attractions-dining/', category: 'general' },
    ];

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

    const sites = scraper.getSites();
    console.log(`[INFO] Configured ${sites.length} site(s) to scrape:`);
    sites.forEach((site, i) => {
        console.log(`  ${i + 1}. ${site.name.padEnd(20)} [${site.category}] ${site.url}`);
    });

    try {
        console.log('\n' + '='.repeat(70));
        console.log('Starting scraping...');
        console.log('='.repeat(70));

        // Scrape all configured sites
        const deals = await scraper.scrape();
        
        // Or scrape by category only:
        // const deals = await scraper.scrape('food');
        
        // Create output directory if it doesn't exist
        const outputDir = path.join(__dirname, '..', 'output');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Save all deals to one file including site names
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
        const siteNames = sites.map(s => s.name.replace(/\s+/g, '_')).join('_');
        const fileName = `deals_${timestamp}_${siteNames}.json`;
        const outputPath = path.join(outputDir, fileName);
        fs.writeFileSync(outputPath, JSON.stringify(deals, null, 2), 'utf-8');
        
        console.log('\n' + '='.repeat(70));
        console.log('  SUMMARY');
        console.log('='.repeat(70));
        console.log(`Total deals found: ${deals.length}`);
        console.log(`Output file: ${fileName}`);
        
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
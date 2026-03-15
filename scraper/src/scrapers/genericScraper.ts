import { HttpClient } from '../utils/httpClient';
import { DealParser } from '../parsers/dealParser';
import { Deal, DealSite } from '../types';
import { siteScrapers } from './siteScrapers';
import * as cheerio from 'cheerio';
import puppeteer, { Page } from 'puppeteer';

/**
 * Simple deal parsing for sites without custom scrapers.
 * Looks for deal patterns in HTML content.
 */
export function parseDealsFromHtml($: cheerio.Root, sourceUrl: string, dealParser: DealParser): Deal[] {
    const deals: Deal[] = [];
    const domain = new URL(sourceUrl).hostname;
    const bodyText = $('body').text();

    if (dealParser.validateDeal(bodyText)) {
        const validityDates = dealParser.extractValidityDates(bodyText);
        const merchantName = dealParser.extractMerchantName(bodyText) || domain;
        const dealType = dealParser.extractDealType(bodyText) || '1-for-1';
        const location = dealParser.extractLocation(bodyText) || 'Singapore';

        // Find first link that might be the deal URL
        const firstLink = $('a').first().attr('href');
        let dealUrl = sourceUrl;
        if (firstLink) {
            dealUrl = firstLink.startsWith('http') ? firstLink : new URL(firstLink, sourceUrl).href;
        }

        deals.push({
            merchant_name: merchantName,
            time_period_start: validityDates.start,
            time_period_end: validityDates.end,
            deal_nature: dealType,
            location: location,
            terms_conditions: null,
            url: dealUrl,
            description: bodyText.substring(0, 500),
            source_url: domain,
            deal_image: null,
        });
    }

    return deals;
}

/**
 * Common scrape implementation that follows pagination links for multi-page HTML deal listings.
 */
export async function scrapeWithHtmlPagination(params: {
    site: DealSite;
    httpClient: HttpClient;
    dealParser: DealParser;
}): Promise<Deal[]> {
    const { site, httpClient, dealParser } = params;
    const maxPages = site.maxPages ?? 5;
    const visited = new Set<string>();
    const allDeals: Deal[] = [];

    let currentUrl = site.url;
    for (let pageIndex = 0; pageIndex < maxPages; pageIndex++) {
        if (!currentUrl || visited.has(currentUrl)) {
            break;
        }

        visited.add(currentUrl);
        console.log(`[DEBUG] [${site.name}] Scraping page ${pageIndex + 1} / ${maxPages}: ${currentUrl}`);

        let html: string;
        try {
            html = await httpClient.getText(currentUrl);
        } catch (error) {
            console.error(`[ERROR] [${site.name}] Failed to fetch page ${currentUrl}:`, error);
            break;
        }

        const $ = cheerio.load(html);
        const deals = parseDealsFromHtml($, currentUrl, dealParser);
        allDeals.push(...deals);

        const nextUrl = findNextPageUrl(html, currentUrl, site.paginationSelector);
        if (!nextUrl) {
            break;
        }

        currentUrl = nextUrl;
    }

    return allDeals;
}

/**
 * Find the "next page" URL in HTML using a selector or common pagination patterns.
 */
export function findNextPageUrl(html: string, baseUrl: string, paginationSelector?: string): string | null {
    const $ = cheerio.load(html);
    const base = new URL(baseUrl);

    // If a selector is provided, use it first
    if (paginationSelector) {
        const nextEl = $(paginationSelector).first();
        const href = nextEl.attr('href') || nextEl.attr('data-href');
        if (href) {
            try {
                return new URL(href, base).href;
            } catch {
                return null;
            }
        }
    }

    // Common patterns for next links
    const candidates = [
        'a[rel="next"]',
        'a.next',
        'a.pagination__next',
        'a.pager-next',
        'a:contains("Next")',
        'a:contains("next")',
        'a:contains(">>")',
    ];

    for (const selector of candidates) {
        const el = $(selector).first();
        const href = el.attr('href');
        if (href) {
            try {
                return new URL(href, base).href;
            } catch {
                continue;
            }
        }
    }

    // Some pages use javascript pagination via data attributes
    const dataNext = $('[data-next-page]').attr('data-next-page');
    if (dataNext) {
        try {
            return new URL(dataNext, base).href;
        } catch {
            return null;
        }
    }

    return null;
}

export async function scrapeWithJs(url: string): Promise<string> {
    console.log(`[DEBUG] Scraping with JS: ${url}`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    const html = await page.content();
    await browser.close();
    return html;
}

export async function handleLoadMore(page: Page, options: { loadMoreSelector?: string; loadMoreText?: string; maxClicks?: number; waitForNewItemsSelector?: string } = {}): Promise<void> {
    const {
        loadMoreSelector = '.load-more, .btn-load-more, [class*="load"][class*="more"]',
        loadMoreText,
        maxClicks = 10,
        waitForNewItemsSelector,
    } = options;

    let clicks = 0;

    while (clicks < maxClicks) {
        try {
            // Wait for the load-more control to appear (if it exists)
            await page.waitForSelector(loadMoreSelector, { timeout: 5000 });

            // Click the load more control (optionally matching on text)
            const clicked = await page.evaluate(
                ({ selector, text }) => {
                    const nodes = Array.from(document.querySelectorAll(selector));
                    if (nodes.length === 0) return false;

                    const match = text
                        ? nodes.find(n => (n.textContent || '').toLowerCase().includes(text.toLowerCase()))
                        : nodes[0];

                    if (!match) return false;

                    // If already hidden/not visible, stop
                    const style = window.getComputedStyle(match as Element);
                    if (style.display === 'none' || style.visibility === 'hidden') return false;

                    (match as HTMLElement).click();
                    return true;
                },
                { selector: loadMoreSelector, text: loadMoreText }
            );

            if (!clicked) {
                console.log('[DEBUG] No clickable load-more element found');
                break;
            }

            // Wait for new deals to appear, if a selector is provided.
            if (waitForNewItemsSelector) {
                const previousCount = await page.$$eval(waitForNewItemsSelector, items => items.length);
                await Promise.race([
                    page.waitForFunction(
                        (sel, prev) => document.querySelectorAll(sel).length > prev,
                        {},
                        waitForNewItemsSelector,
                        previousCount
                    ),
                    new Promise(resolve => setTimeout(resolve, 4000)),
                ]);
            } else {
                await new Promise(resolve => setTimeout(resolve, 3000)); // default wait
            }

            clicks++;
            console.log(`[DEBUG] Clicked load more (${clicks}/${maxClicks})`);
        } catch (error) {
            console.log(`[DEBUG] No more load more buttons or timeout (${error})`);
            break;
        }
    }
}

export class GenericScraper {
    private httpClient: HttpClient;
    private dealParser: DealParser;
    private sitesToScrape: DealSite[];

    constructor(sites: DealSite[] = []) {
        this.httpClient = new HttpClient();
        this.dealParser = new DealParser();
        this.sitesToScrape = sites;
    }

    /**
     * Get all sites to scrape
     */
    getSites(): DealSite[] {
        return this.sitesToScrape;
    }

    /**
     * Set the sites to scrape
     */
    setSites(sites: DealSite[]): void {
        this.sitesToScrape = sites;
    }

    /**
     * Add a site to scrape
     */
    addSite(site: DealSite): void {
        this.sitesToScrape.push(site);
    }

    /**
     * Scrape sites, optionally filtered by category
     */
    async scrapeByCategory(category?: string): Promise<Deal[]> {
        const sites = category 
            ? this.sitesToScrape.filter(s => s.category === category)
            : this.sitesToScrape;

        if (sites.length === 0) {
            console.log('[WARN] No sites configured to scrape. Add sites using setSites() or addSite()');
            return [];
        }

        console.log(`\n[INFO] Scraping ${sites.length} site(s)${category ? ` (category: ${category})` : ''}`);
        
        const allDeals: Deal[] = [];

        for (let i = 0; i < sites.length; i++) {
            const site = sites[i];
            console.log(`\n[${i + 1}/${sites.length}] ${site.name} (${site.url})`);

const deals = await this.scrapeSite(site);
            allDeals.push(...deals);

            // Be polite - wait between requests
            if (i < sites.length - 1) {
                await this.sleep(3000);
            }
        }

        console.log(`\n[INFO] Total deals found: ${allDeals.length}`);
        return allDeals;
    }

    /**
     * Scrape deals from a single page (fallback for simple sites)
     */
    async scrapePage(url: string): Promise<Deal[]> {
        try {
            console.log(`[DEBUG] Scraping: ${url}`);
            const html = await this.httpClient.getText(url);
            console.log(`[DEBUG] Received HTML (length: ${html.length} chars)`);
            const $ = cheerio.load(html);
            const deals = parseDealsFromHtml($, url, this.dealParser);
            console.log(`[DEBUG] Found ${deals.length} deals`);
            if (deals.length > 0) {
                console.log(`[DEBUG] Sample deal: ${deals[0].description.substring(0, 50)}...`);
            }
            return deals;
        } catch (error) {
            console.error(`[ERROR] Error scraping ${url}: ${error}`);
            if (error instanceof Error) {
                console.error(`[ERROR] Stack: ${error.stack}`);
            }
            return [];
        }
    }

    /**
     * Scrape deals from a site, using a custom strategy if available.
     */
    private async scrapeSite(site: DealSite): Promise<Deal[]> {
        const hostname = new URL(site.url).hostname.replace(/^www\./, '');
        const scraperKey = site.scraperKey ?? hostname;
        const customScraper = siteScrapers[scraperKey];

        if (customScraper) {
            console.log(`[DEBUG] Using custom scraper for: ${site.name} (${scraperKey})`);
            return await customScraper({ site, httpClient: this.httpClient, dealParser: this.dealParser });
        }

        if (site.useJsScraping) {
            console.log(`[DEBUG] Using JS-based scraper for: ${site.name}`);
            const html = await scrapeWithJs(site.url);
            const $ = cheerio.load(html);
            return parseDealsFromHtml($, site.url, this.dealParser);
        }

        console.log(`[DEBUG] Using default HTML scraper for: ${site.name}`);
        return await scrapeWithHtmlPagination({ site, httpClient: this.httpClient, dealParser: this.dealParser });
    }

    /**
     * Main method: Scrape all configured sites
     */
    async scrape(category?: string): Promise<Deal[]> {
        return await this.scrapeByCategory(category);
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
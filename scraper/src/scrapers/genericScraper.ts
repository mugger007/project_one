import { HttpClient } from '../utils/httpClient';
import { DealParser } from '../parsers/dealParser';
import { Deal, DealSite } from '../types';

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
            
            const deals = await this.scrapePage(site.url);
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
     * Scrape deals from a single page
     */
    async scrapePage(url: string): Promise<Deal[]> {
        try {
            console.log(`[DEBUG] Scraping: ${url}`);
            const html = await this.httpClient.getText(url);
            console.log(`[DEBUG] Received HTML (length: ${html.length} chars)`);
            const deals = this.dealParser.parseDealsFromHtml(html, url);
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
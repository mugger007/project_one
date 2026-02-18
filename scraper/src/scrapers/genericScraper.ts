import { HttpClient } from '../utils/httpClient';
import { DealParser } from '../parsers/dealParser';
import { Deal, SearchResult, ScraperOptions } from '../types';
import * as cheerio from 'cheerio';

export class GenericScraper {
    private httpClient: HttpClient;
    private dealParser: DealParser;

    constructor() {
        this.httpClient = new HttpClient();
        this.dealParser = new DealParser();
    }

    /**
     * Search Google for deal-related queries and return URLs
     */
    async searchGoogle(query: string, maxResults: number = 10): Promise<SearchResult[]> {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${maxResults}`;
        const results: SearchResult[] = [];

        try {
            const html = await this.httpClient.getText(searchUrl);
            const $ = cheerio.load(html);

            // Extract search result links
            // Google's structure: look for main result divs
            $('div.g, div[data-sokoban-container]').each((_: number, elem: cheerio.Element) => {
                const $elem = $(elem);
                const $link = $elem.find('a[href]').first();
                const href = $link.attr('href');
                
                if (href && href.startsWith('http') && !href.includes('google.com')) {
                    const title = $link.text().trim() || $elem.find('h3').first().text().trim();
                    const snippet = $elem.find('.VwiC3b, .yXK7lf').first().text().trim();

                    results.push({
                        url: href,
                        title,
                        snippet,
                    });
                }
            });

            return results.slice(0, maxResults);
        } catch (error) {
            console.error(`Error searching Google: ${error}`);
            return [];
        }
    }

    /**
     * Scrape deals from a single page
     */
    async scrapePage(url: string): Promise<Deal[]> {
        try {
            console.log(`Scraping: ${url}`);
            const html = await this.httpClient.getText(url);
            const deals = this.dealParser.parseDealsFromHtml(html, url);
            console.log(`  Found ${deals.length} deals`);
            return deals;
        } catch (error) {
            console.error(`Error scraping ${url}: ${error}`);
            return [];
        }
    }

    /**
     * Main method: Search Google and scrape results for deals
     */
    async searchAndScrape(options: ScraperOptions): Promise<Deal[]> {
        const { searchTerm, maxSitesToScrape = 5 } = options;
        
        console.log(`Searching Google for: "${searchTerm}"`);
        const searchResults = await this.searchGoogle(searchTerm, maxSitesToScrape);
        console.log(`Found ${searchResults.length} URLs to scrape\n`);

        const allDeals: Deal[] = [];

        for (let i = 0; i < searchResults.length; i++) {
            const result = searchResults[i];
            console.log(`[${i + 1}/${searchResults.length}] ${result.url}`);
            
            const deals = await this.scrapePage(result.url);
            allDeals.push(...deals);

            // Be polite - wait between requests
            if (i < searchResults.length - 1) {
                await this.sleep(2000);
            }
        }

        console.log(`\nTotal deals found: ${allDeals.length}`);
        return allDeals;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
import { Deal } from '../types';
import * as cheerio from 'cheerio';

export class DealParser {
    private dealPatterns = [
        /\b1\s*for\s*\d+\b/i,
        /\bbuy\s*1\s*get\s*\d+\b/i,
        /\b1-for-\d+\b/i,
        /\bone\s*for\s*\d+\b/i,
        /\b1\+\d+\b/i,
        /\bbogo\b/i, // buy one get one
    ];

    /**
     * Extract deal type from text (e.g., "1-for-1", "buy 1 get 1")
     */
    extractDealType(text: string): string | null {
        for (const pattern of this.dealPatterns) {
            const match = text.match(pattern);
            if (match) {
                return match[0].trim();
            }
        }
        return null;
    }

    /**
     * Validate if text contains a deal pattern
     */
    validateDeal(text: string): boolean {
        return this.dealPatterns.some(pattern => pattern.test(text));
    }

    /**
     * Extract price information from text
     */
    extractPrices(text: string): number[] {
        const pricePattern = /\$?\d+\.?\d*/g;
        const matches = text.match(pricePattern);
        if (!matches) return [];
        
        return matches
            .map(p => parseFloat(p.replace('$', '')))
            .filter(p => !isNaN(p) && p > 0);
    }

    /**
     * Parse deals from HTML content
     */
    parseDealsFromHtml(html: string, sourceUrl: string): Deal[] {
        const $ = cheerio.load(html);
        const deals: Deal[] = [];
        const domain = new URL(sourceUrl).hostname;

        // Search for deal patterns in various elements
        const elements = $('div, article, section, li, p, span, h1, h2, h3, h4');

        elements.each((_: number, elem: cheerio.Element) => {
            const $elem = $(elem);
            const text = $elem.text().trim();

            // Skip if text is too long (likely not a deal title)
            if (text.length > 500 || text.length < 5) return;

            if (this.validateDeal(text)) {
                const dealType = this.extractDealType(text);
                if (!dealType) return;

                const prices = this.extractPrices(text);
                const link = $elem.find('a').first().attr('href') || 
                            $elem.closest('a').attr('href');
                
                let dealUrl = sourceUrl;
                if (link) {
                    dealUrl = link.startsWith('http') 
                        ? link 
                        : new URL(link, sourceUrl).href;
                }

                deals.push({
                    title: text.substring(0, 200),
                    dealType,
                    originalPrice: prices[0],
                    discountedPrice: prices[1],
                    url: dealUrl,
                    sourceSite: domain,
                    description: text.substring(0, 300),
                    scrapedAt: new Date().toISOString(),
                });
            }
        });

        // Remove duplicates based on title and URL
        return this.deduplicateDeals(deals);
    }

    /**
     * Remove duplicate deals
     */
    private deduplicateDeals(deals: Deal[]): Deal[] {
        const seen = new Set<string>();
        return deals.filter(deal => {
            const key = `${deal.title}-${deal.url}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
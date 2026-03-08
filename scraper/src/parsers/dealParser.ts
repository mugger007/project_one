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
     * Extract dates from text looking for validity periods
     */
    extractValidityDates(text: string): { start: string | null, end: string | null } {
        const result = { start: null as string | null, end: null as string | null };
        
        // Pattern 1: "valid from X to Y" or "from X to Y"
        const fromToPattern = /(?:valid\s+)?from\s+([\d]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+[\d]{4})\s+(?:to|till|until)\s+([\d]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+[\d]{4})/gi;
        const fromToMatches = text.match(fromToPattern);
        if (fromToMatches && fromToMatches.length > 0) {
            const match = fromToMatches[0];
            const fromMatch = match.match(/from\s+([\d]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+[\d]{4})/i);
            const toMatch = match.match(/(?:to|till|until)\s+([\d]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+[\d]{4})/i);
            if (fromMatch) result.start = fromMatch[1];
            if (toMatch) result.end = toMatch[1];
            return result;
        }

        // Pattern 2: "valid from X" (start date only)
        const validFromPattern = /(?:valid\s+)?from\s+([\d]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+[\d]{4})/gi;
        const validFromMatches = text.match(validFromPattern);
        if (validFromMatches && validFromMatches.length > 0) {
            const cleanDate = validFromMatches[0].replace(/^(?:valid\s+)?from\s+/i, '');
            result.start = cleanDate;
        }

        // Pattern 3: "valid till/until X" or "till/until X" (end date only)
        const validTillPattern = /(?:valid\s+)?(?:till|until)\s+([\d]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+[\d]{4})/gi;
        const validTillMatches = text.match(validTillPattern);
        if (validTillMatches && validTillMatches.length > 0) {
            const cleanDate = validTillMatches[0].replace(/^(?:valid\s+)?(?:till|until)\s+/i, '');
            result.end = cleanDate;
        }

        return result;
    }

    /**
     * Extract merchant name from deal text
     */
    extractMerchantName(text: string): string | null {
        // Clean the text first
        const cleanText = text.trim();
        
        // Pattern 1: "Merchant Name: deal description" - extract text before colon
        const colonMatch = cleanText.match(/^([^:]+?):\s*(?:1-for-1|buy\s*1\s*get\s*1|bogo|1\+1|deal|promotion)/i);
        if (colonMatch && colonMatch[1]) {
            const merchant = colonMatch[1].trim();
            // Validate it's a reasonable merchant name (not too long, not generic)
            if (merchant.length <= 50 && merchant.length >= 2 && !/^(the|this|that|here|there|we|our|check|score|get|from|looking|if|on|for|with|they|more|info|jump|to|dining|deals|promos|credit|card|experience|shopping|discount|unmissable|feast|bank|plus|activity|bookmark|delectable|daily|promotion|tuesday|wednesday|sunday|thursday|perfect|excuse|enjoy|month|wave|grandma|group|chat|rolling|exclusive|take|pick|main|sundae|flash|senior|id|fab|lunch|set|include|hotpot|buffet|dinner|lunch|breakfast|high\s+tea|brunch|set|meal|burger|fish|chip|oyster|kid|ramadan|buka|puasa|iftar|coffee|lifestyle|app|ticket|pretzel|smoothie|cake|cat|festival|wheel|carnival|playland|goodie|posted|day|ago|by|sassy|mama|directory|social|media|back|what|new|free)$/i.test(merchant.toLowerCase())) {
                return merchant;
            }
        }
        
        // Pattern 2: Known merchant patterns with specific keywords
        const knownPatterns = [
            // Restaurant/hotel chains and specific names
            /(Swensen['']?s|Honbo|Big Fish Small Fish|Goodwood Park Hotel|Atrium Restaurant|Coffee Lounge|PAW Patrol Live|Auntie Anne['']?s|Beauty in The Pot|Permata Singapore|Carnivore Brazilian Churrascaria|Racines|The Blue Tiffin|Opus Bar and Grill|voco Orchard Singapore|Sofitel Singapore City Centre)/i,
            // Generic patterns for restaurant names
            /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)(?:\s+(?:restaurant|hotel|cafe|bar|lounge|buffet|bakery|grill|churrascaria))/i
        ];
        
        for (const pattern of knownPatterns) {
            const match = cleanText.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }
        
        // Pattern 3: First sentence subject for "Merchant is offering/having/has" patterns
        const subjectMatch = cleanText.match(/^([A-Z][^.!?]*?)\s+(?:is\s+(?:offering|running|having|calling)|has|offers?)\s+(?:all|you|an?|the)?\s*(?:1-for-1|buy\s*1\s*get\s*1|bogo|1\+1|deal|promotion|special)/i);
        if (subjectMatch && subjectMatch[1]) {
            const merchant = subjectMatch[1].trim();
            if (merchant.length <= 50 && merchant.length >= 2) {
                return merchant;
            }
        }
        
        return null;
    }

    /**
     * Check if URL is external (not from the same domain)
     */
    isExternalUrl(url: string, domain: string): boolean {
        try {
            const urlObj = new URL(url);
            return !urlObj.hostname.includes(domain.replace('www.', ''));
        } catch {
            return false;
        }
    }

    /**
     * Extract the sentence containing the deal pattern
     */
    private extractDealSentence(text: string): string {
        // Split by periods, question marks, exclamation marks
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
        
        // Find the first sentence containing a deal pattern
        for (const sentence of sentences) {
            if (this.validateDeal(sentence)) {
                return sentence.trim();
            }
        }
        
        // Fallback: return first 200 chars if no sentence found but pattern exists
        return text.substring(0, 200);
    }

    /**
     * Parse deals from HTML content using deal boundaries (h3 to hr)
     */
    parseDealsFromHtml(html: string, sourceUrl: string): Deal[] {
        console.log(`[DEBUG] Parsing HTML from ${sourceUrl}`);
        const $ = cheerio.load(html);
        const deals: Deal[] = [];
        const domain = new URL(sourceUrl).hostname;

        // Strategy: Find all h3 tags that contain deal patterns, then collect content until the next hr tag
        const h3Elements = $('h3');
        console.log(`[DEBUG] Found ${h3Elements.length} h3 elements to check`);

        let dealCount = 0;
        const processedHeadings = new Set<string>();

        h3Elements.each((_: number, h3Elem: cheerio.Element) => {
            const $h3 = $(h3Elem);
            const h3Text = $h3.text().trim();
            
            // Skip if this heading has already been processed (dedup)
            if (processedHeadings.has(h3Text)) {
                console.log(`[DEBUG] Skipping duplicate heading: ${h3Text.substring(0, 50)}`);
                return;
            }

            if (this.validateDeal(h3Text)) {
                console.log(`[DEBUG] Found h3 heading with deal: "${h3Text.substring(0, 80)}..."`);
                dealCount++;
                processedHeadings.add(h3Text);
                
                // Collect all content from this h3 until the next hr tag
                let $current = $h3.next();
                let sectionText = h3Text; // Start with the heading
                const sectionLinks: string[] = [];

                while ($current.length > 0 && $current.prop('tagName')?.toLowerCase() !== 'hr') {
                    const currentText = $current.text().trim();
                    if (currentText.length > 0) {
                        sectionText += '\n' + currentText;
                    }

                    // Collect links from this section
                    $current.find('a').each((i: number, link: cheerio.Element) => {
                        const href = $(link).attr('href');
                        if (href) {
                            sectionLinks.push(href);
                        }
                    });

                    $current = $current.next();
                }

                // Extract deal information from the entire section
                const dealType = this.extractDealType(h3Text);
                if (!dealType) {
                    console.log('[DEBUG] Could not extract deal type from h3');
                    return;
                }

                const prices = this.extractPrices(sectionText);
                console.log(`[DEBUG] Extracted ${prices.length} prices: ${prices.join(', ')}`);
                
                // Extract validity dates from the entire section
                const validityDates = this.extractValidityDates(sectionText);
                console.log(`[DEBUG] Extracted dates - Start: ${validityDates.start}, End: ${validityDates.end}`);
                
                // Extract merchant name primarily from h3 heading
                const merchantName = this.extractMerchantName(h3Text) || domain;
                console.log(`[DEBUG] Extracted merchant from h3: ${merchantName}`);
                
                // Find the best URL from the section's links
                let dealUrl = sourceUrl;
                for (const link of sectionLinks) {
                    const fullUrl = link.startsWith('http') 
                        ? link 
                        : new URL(link, sourceUrl).href;
                    
                    // Prefer external URLs for deals
                    if (this.isExternalUrl(fullUrl, domain)) {
                        dealUrl = fullUrl;
                        break;
                    } else if (dealUrl === sourceUrl) {
                        dealUrl = fullUrl;
                    }
                }

                deals.push({
                    merchant_name: merchantName,
                    time_period_start: validityDates.start,
                    time_period_end: validityDates.end,
                    deal_nature: dealType,
                    location: null,
                    terms_conditions: sectionText.substring(0, 400),
                    url: dealUrl,
                    description: h3Text.substring(0, 250),
                    source_url: domain,
                });
            }
        });

        console.log(`[DEBUG] H3 headings checked: ${h3Elements.length}, Deals found: ${dealCount}`);
        console.log(`[DEBUG] Raw deals found: ${deals.length}`);

        // Remove duplicates based on description and URL
        const dedupedDeals = this.deduplicateDeals(deals);
        console.log(`[DEBUG] After deduplication: ${dedupedDeals.length} deals`);
        
        return dedupedDeals;
    }

    /**
     * Remove duplicate deals
     */
    private deduplicateDeals(deals: Deal[]): Deal[] {
        const seen = new Set<string>();
        return deals.filter(deal => {
            const key = `${deal.description}-${deal.url}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
}
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
        
        // Look for various date patterns
        const datePatterns = [
            // "valid from X to Y", "valid till X", "valid until X"
            /(?:valid\s+from|from)\s+([\d]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+[\d]{4})/gi,
            /(?:valid\s+(?:till|until)|until)\s+([\d]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+[\d]{4})/gi,
            /(?:valid\s+from|from)\s+([\d]{1,2}[-/][\d]{1,2}[-/][\d]{4})/gi,
            /(?:valid\s+(?:till|until)|until)\s+([\d]{1,2}[-/][\d]{1,2}[-/][\d]{4})/gi,
            // Direct date mentions
            /([\d]{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\s+[\d]{4})/gi,
            /([\d]{1,2}[-/][\d]{1,2}[-/][\d]{4})/gi
        ];

        for (const pattern of datePatterns) {
            const matches = text.match(pattern);
            if (matches) {
                for (const match of matches) {
                    const cleanDate = match.replace(/^(?:valid\s+(?:from|till|until)|from|until)\s+/i, '');
                    if (!result.start) {
                        result.start = cleanDate;
                    } else if (!result.end) {
                        result.end = cleanDate;
                    }
                }
            }
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
     * Parse deals from HTML content
     */
    parseDealsFromHtml(html: string, sourceUrl: string): Deal[] {
        console.log(`[DEBUG] Parsing HTML from ${sourceUrl}`);
        const $ = cheerio.load(html);
        const deals: Deal[] = [];
        const domain = new URL(sourceUrl).hostname;

        // Search for deal patterns in various elements
        const elements = $('div, article, section, li, p, span, h1, h2, h3, h4');
        console.log(`[DEBUG] Found ${elements.length} HTML elements to check`);

        let elementsChecked = 0;
        let minLengthElements = 0;
        let matchedPatterns = 0;

        elements.each((_: number, elem: cheerio.Element) => {
            const $elem = $(elem);
            const text = $elem.text().trim();
            elementsChecked++;

            // Skip very short text
            if (text.length < 10) return;
            minLengthElements++;

            if (this.validateDeal(text)) {
                matchedPatterns++;
                
                // Extract just the sentence with the deal
                const dealSentence = this.extractDealSentence(text);
                console.log(`[DEBUG] Match #${matchedPatterns}: "${dealSentence.substring(0, 100)}..."`);
                
                const dealType = this.extractDealType(dealSentence);
                if (!dealType) {
                    console.log('[DEBUG] Could not extract deal type');
                    return;
                }

                const prices = this.extractPrices(dealSentence);
                console.log(`[DEBUG] Extracted ${prices.length} prices: ${prices.join(', ')}`);
                
                const validityDates = this.extractValidityDates(text);
                console.log(`[DEBUG] Extracted dates - Start: ${validityDates.start}, End: ${validityDates.end}`);
                
                const merchantName = this.extractMerchantName(dealSentence) || domain;
                console.log(`[DEBUG] Extracted merchant: ${merchantName}`);
                
                const link = $elem.find('a').first().attr('href') || 
                            $elem.closest('a').attr('href');
                
                let dealUrl = sourceUrl;
                if (link) {
                    const fullUrl = link.startsWith('http') 
                        ? link 
                        : new URL(link, sourceUrl).href;
                    
                    // Prefer external URLs for deals, fallback to internal
                    if (this.isExternalUrl(fullUrl, domain)) {
                        dealUrl = fullUrl;
                    } else if (!dealUrl || dealUrl === sourceUrl) {
                        dealUrl = fullUrl;
                    }
                }

                deals.push({
                    merchant_name: merchantName,
                    time_period_start: validityDates.start,
                    time_period_end: validityDates.end,
                    deal_nature: dealType,
                    location: null,
                    terms_conditions: text.substring(0, 400),
                    url: dealUrl,
                    description: dealSentence.substring(0, 250),
                    source_url: domain,
                });
            }
        });

        console.log(`[DEBUG] Elements checked: ${elementsChecked}, Min length passed: ${minLengthElements}, Pattern matches: ${matchedPatterns}`);
        console.log(`[DEBUG] Raw deals found: ${deals.length}`);

        // Remove duplicates based on title and URL
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
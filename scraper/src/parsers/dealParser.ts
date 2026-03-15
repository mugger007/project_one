import { Deal } from '../types';
import * as cheerio from 'cheerio';

export class DealParser {
    private dealPatterns = [
        /\b1\s*,?\s*for\s*,?\s*\d+\b/i,
        /\bbuy\s*1\s*,?\s*get\s*,?\s*\d+\b/i,
        /\bbuy\s*one\s*,?\s*get\s*,?\s*one\b/i,
        /\bone\s*for\s*one\b/i,
        /\b1-for-\d+\b/i,
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
     * Extract dates from text looking for validity periods
     */
    extractValidityDates(text: string): { start: string | null, end: string | null } {
        const result = { start: null as string | null, end: null as string | null };

        // Pattern 0: "DD MMM - DD MMM" (e.g. "09 Mar - 15 Mar")
        const monthDayPattern = /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*-\s*(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+(\d{4}))?/i;
        const monthDayMatch = text.match(monthDayPattern);
        if (monthDayMatch) {
            const startDay = monthDayMatch[1];
            const startMonth = monthDayMatch[2];
            const endDay = monthDayMatch[3];
            const endMonth = monthDayMatch[4];
            const year = monthDayMatch[5] || `${new Date().getFullYear()}`;

            result.start = `${startDay} ${startMonth} ${year}`;
            result.end = `${endDay} ${endMonth} ${year}`;
            return result;
        }

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
        
        // Pattern 2: First sentence subject for "Merchant is offering/having/has" patterns
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
     * Extract location from text, focusing on Singapore-specific keywords
     */
    extractLocation(text: string): string | null {
        const lowerText = text.toLowerCase();
        const singaporeKeywords = [
            /\bsingapore\b/i,
            /\bsg\b/i,
            /\bs'pore\b/i,
            /\bcentral\s+region\b/i,
            /\beast\s+region\b/i,
            /\bnorth\s+region\b/i,
            /\bsouth\s+region\b/i,
            /\bwest\s+region\b/i,
            /\bchangi\b/i,
            /\bsentosa\b/i,
            /\bmarina\s+bay\b/i,
            /\borchard\b/i,
            /\bbugis\b/i,
            /\btampines\b/i,
            /\bjurong\b/i,
            /\bwoodlands\b/i,
            /\byishun\b/i,
            /\btoa\s+payoh\b/i,
            /\bhougang\b/i,
            /\bpunggol\b/i,
            /\bsembawang\b/i,
        ];

        for (const keyword of singaporeKeywords) {
            if (keyword.test(lowerText)) {
                return 'Singapore';
            }
        }

        return null;
    }

    /**
     * Extract terms and conditions URL from HTML chunk
     */
    extractTermsConditionsUrl(html: string, baseUrl: string): string | null {
        const $ = cheerio.load(html);
        let termsUrl: string | null = null;

        $('a').each((_, link) => {
            const linkText = $(link).text().trim().toLowerCase();
            const href = $(link).attr('href');

            if (href && (
                linkText.includes('terms') && linkText.includes('conditions') ||
                linkText.includes('terms & conditions') ||
                linkText.includes('t&c') ||
                linkText.includes('terms and conditions') ||
                linkText.includes('terms of use') ||
                linkText.includes('conditions of use') ||
                /^terms$/i.test(linkText) ||
                /^conditions$/i.test(linkText)
            )) {
                termsUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
                return false; // break out of each
            }
        });

        return termsUrl;
    }

    /**
     * Extract deal image URL from HTML chunk
     */
    extractDealImageUrl(html: string, baseUrl: string): string | null {
        const $ = cheerio.load(html);
        const img = $('img').first();
        if (img.length > 0) {
            const src = img.attr('src') || img.attr('data-src') || img.attr('data-lazy-src');
            if (src) {
                return src.startsWith('http') ? src : new URL(src, baseUrl).href;
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

}
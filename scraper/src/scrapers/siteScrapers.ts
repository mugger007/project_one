import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';
import { Deal, DealSite } from '../types';
import { HttpClient } from '../utils/httpClient';
import { DealParser } from '../parsers/dealParser';
import { scrapeWithHtmlPagination, handleLoadMore, parseDealsFromHtml } from './genericScraper';

export type SiteScraper = (params: {
    site: DealSite;
    httpClient: HttpClient;
    dealParser: DealParser;
}) => Promise<Deal[]>;

/**
 * Scraper implementation tailored for SassyMama SG.
 *
 * SassyMama layouts each deal as:
 * <h3>Title</h3>
 * <figure>...</figure>
 * <p>Details</p>
 * <p><strong>Deal validity:</strong> ...</p>
 * <hr />
 */
export async function scrapeSassyMamaSG(params: {
    site: DealSite;
    httpClient: HttpClient;
    dealParser: DealParser;
}): Promise<Deal[]> {
    const { site, httpClient, dealParser } = params;
    let html: string;

    try {
        html = await httpClient.getText(site.url);
    } catch (error) {
        console.error(`[ERROR] [${site.name}] Failed to fetch page ${site.url}:`, error);
        return [];
    }

    const $ = cheerio.load(html);
    const domain = new URL(site.url).hostname;
    const deals: Deal[] = [];

    $('h3').each((_, h3Elem) => {
        const $h3 = $(h3Elem);
        const headingText = $h3.text().trim();
        if (!dealParser.validateDeal(headingText)) {
            return;
        }

        // Collect section content until the next <hr />
        let $current = $h3.next();
        let sectionText = headingText;
        let sectionHtml = headingText;
        const sectionLinks: string[] = [];

        while ($current.length > 0 && $current.prop('tagName')?.toLowerCase() !== 'hr') {
            const currentText = $current.text().trim();
            const currentHtml = $current.html()?.trim() || '';
            if (currentText.length > 0) {
                sectionText += '\n' + currentText;
                sectionHtml += '\n' + currentHtml;
            }

            $current.find('a').each((i, link) => {
                const href = $(link).attr('href');
                if (href) {
                    sectionLinks.push(href);
                }
            });

            $current = $current.next();
        }

        // Extract description from first <p> tag
        const firstP = $h3.nextAll('p').first();
        const description = firstP.length > 0 ? firstP.text().trim() : sectionText;

        // Extract validity dates using the parser's method
        const validityDates = dealParser.extractValidityDates(sectionText);

        // Extract location, default to Singapore
        const location = dealParser.extractLocation(sectionText) || 'Singapore';

        // Extract terms_conditions URL using generic parser
        const termsConditionsUrl = dealParser.extractTermsConditionsUrl(sectionHtml, site.url);

        // Extract deal image URL using generic parser
        const dealImage = dealParser.extractDealImageUrl(sectionHtml, site.url);

        const dealType = dealParser.extractDealType(sectionText) || dealParser.extractDealType(headingText) || '1-for-1';
        const merchantName = dealParser.extractMerchantName(headingText) || domain;

        let dealUrl = site.url;
        for (const link of sectionLinks) {
            const fullUrl = link.startsWith('http') ? link : new URL(link, site.url).href;
            if (!dealParser.isExternalUrl(fullUrl, domain)) {
                // prefer internal 2nd-level urls if available
                dealUrl = fullUrl;
                continue;
            }
            dealUrl = fullUrl;
            break;
        }

        deals.push({
            merchant_name: merchantName,
            time_period_start: validityDates.start,
            time_period_end: validityDates.end,
            deal_nature: dealType,
            location: location,
            terms_conditions: termsConditionsUrl,
            url: dealUrl,
            description: description,
            source_url: domain,
            deal_image: dealImage,
        });
    });

    // Deduplicate on description + URL
    const seen = new Set<string>();
    return deals.filter(deal => {
        const key = `${deal.description}-${deal.url}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

/**
 * Scraper implementation for CapitaLand SG using JS rendering and Load More.
 */
export async function scrapeCapitaLand(params: {
    site: DealSite;
    httpClient: HttpClient;
    dealParser: DealParser;
}): Promise<Deal[]> {
    const { site, dealParser } = params;

    console.log(`[DEBUG] [${site.name}] Starting JS-based scraping with load more: ${site.url}`);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    try {
        await page.goto(site.url, { waitUntil: 'networkidle2' });

        // Handle Load More
        await handleLoadMore(page, {
            loadMoreSelector: site.loadMoreSelector,
            maxClicks: site.maxLoadMoreClicks
        });

        // Get the final HTML
        const html = await page.content();
        const $ = cheerio.load(html);
        const deals: Deal[] = [];
        const domain = new URL(site.url).hostname;

        // Parse each deal card
        $('.cmp-listing-card--deal').each((_, card) => {
            const $card = $(card);
            const $link = $card.find('.cmp-listing-card__link');
            const url = $link.attr('href');
            if (!url) return;

            const fullUrl = url.startsWith('http') ? url : new URL(url, site.url).href;

            // Extract title/description
            const title = $card.find('.cmp-listing-card__title').text().trim();
            if (!dealParser.validateDeal(title)) {
                return; // skip non-1-for-1 deals
            }

            // Extract merchant name
            const merchantName = $card.find('.cmp-listing-card__type').text().trim() || domain;

            const description = title; // Use title as description

            // Extract deal type from title
            const dealType = dealParser.extractDealType(title) || '1-for-1';

            // Extract location
            const location = $card.find('.cmp-listing-card__location-text').text().trim() || 'Singapore';

            // Extract validity dates from duration text
            const durationText = $card.find('.cmp-listing-card__duration-text').text().trim();
            const validityDates = dealParser.extractValidityDates(durationText);

            // Extract deal image
            const $img = $card.find('img');
            let dealImage: string | null = null;
            if ($img.length > 0) {
                const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy-src');
                if (src) {
                    dealImage = src.startsWith('http') ? src : new URL(src, site.url).href;
                }
            }

            deals.push({
                merchant_name: merchantName,
                time_period_start: validityDates.start,
                time_period_end: validityDates.end,
                deal_nature: dealType,
                location: location,
                terms_conditions: null, // CapitaLand might not have T&C links in cards
                url: fullUrl,
                description: description,
                source_url: domain,
                deal_image: dealImage,
            });
        });

        console.log(`[DEBUG] [${site.name}] JS scraping completed, found ${deals.length} deals`);
        return deals;

    } catch (error) {
        console.error(`[ERROR] [${site.name}] JS scraping failed:`, error);
        return [];
    } finally {
        await browser.close();
    }
}

/**
 * Site-specific scraper registry.
 * Keyed by hostname (without www). Supports custom scraping behavior for complex aggregators.
 */
export const siteScrapers: Record<string, SiteScraper> = {
    'myfave.com': scrapeWithHtmlPagination,
    'sassymamasg.com': scrapeSassyMamaSG,
    'capitaland.com': scrapeCapitaLand,
    'allsgpromo.com': scrapeWithHtmlPagination,
    'divedeals.sg': scrapeWithHtmlPagination,
    'singpromos.com': scrapeWithHtmlPagination,
    'greatdeals.com.sg': scrapeWithHtmlPagination,
};

export interface Deal {
    merchant_name: string;
    time_period_start: string | null;
    time_period_end: string | null;
    deal_nature: string; // e.g., "1-for-1", "1-for-2", "buy-1-get-1"
    location: string | null;
    terms_conditions: string | null;
    url: string;
    description: string;
    source_url: string;
    deal_image: string | null;
}



export interface DealSite {
    name: string;
    url: string;
    category: string; // e.g., 'food', 'general', 'travel'

    /**
     * Optional CSS selector to follow pagination links for multi-page deal listings.
     * If provided, the scraper will try to follow "next" pages to collect all deals.
     */
    paginationSelector?: string;

    /**
     * Maximum number of pages to follow when using pagination.
     */
    maxPages?: number;

    /**
     * Optional key used to select a custom scraping strategy for this site.
     * This allows special handling of sites that require custom navigation/parsing.
     */
    scraperKey?: string;

    /**
     * If true, use JavaScript-based scraping with Puppeteer for dynamic content.
     */
    useJsScraping?: boolean;

    /**
     * CSS selector for the "load more" button in JS-based scraping.
     */
    loadMoreSelector?: string;

    /**
     * Optional text to match inside the "load more" control.
     * This supports cases where the load-more button is identified by text rather than a stable selector.
     */
    loadMoreText?: string;

    /**
     * CSS selector for the container element to extract content from after JS loading.
     */
    containerSelector?: string;

    /**
     * Maximum number of "load more" clicks for JS-based scraping.
     */
    maxLoadMoreClicks?: number;

    /**
     * Optional selector to watch for new items appearing after clicking load more.
     * When provided, the scraper waits until more of this selector appear after each click.
     */
    loadMoreWaitForSelector?: string;
}
export interface Deal {
    title: string;
    dealType: string; // e.g., "1-for-1", "1-for-2", "buy-1-get-1"
    originalPrice?: number;
    discountedPrice?: number;
    url: string;
    sourceSite: string;
    description?: string;
    scrapedAt: string;
}

export interface ScraperOptions {
    searchTerm: string;
    maxResults?: number;
    maxSitesToScrape?: number;
    timeout?: number;
}

export interface SearchResult {
    url: string;
    title: string;
    snippet: string;
}
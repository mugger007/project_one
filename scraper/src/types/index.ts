export interface Deal {
    merchant_name: string;
    time_period_start: string | null;
    time_period_end: string | null;
    deal_nature: string; // e.g., "1-for-1", "1-for-2", "buy-1-get-1"
    location: string | null;
    terms_conditions: string;
    url: string;
    description: string;
    source_url: string;
}



export interface DealSite {
    name: string;
    url: string;
    category: string; // e.g., 'food', 'general', 'travel'
}
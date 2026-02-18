// src/index.ts
import { GenericScraper } from './scrapers/genericScraper';
import { ScraperOptions } from './types';
import * as fs from 'fs';
import * as path from 'path';

const main = async () => {
    const scraper = new GenericScraper();

    // Example search queries for deal scraping
    const queries: ScraperOptions[] = [
        {
            searchTerm: '1 for 1 restaurant deals Singapore 2026',
            maxSitesToScrape: 5,
        },
        {
            searchTerm: 'buy 1 get 1 free food deals',
            maxSitesToScrape: 3,
        },
    ];

    try {
        for (const query of queries) {
            console.log('\n' + '='.repeat(60));
            const deals = await scraper.searchAndScrape(query);
            
            // Save results to JSON file
            const fileName = `deals_${query.searchTerm.replace(/\s+/g, '_').substring(0, 30)}.json`;
            const outputPath = path.join(__dirname, '..', 'output', fileName);
            
            // Create output directory if it doesn't exist
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            fs.writeFileSync(outputPath, JSON.stringify(deals, null, 2), 'utf-8');
            console.log(`\nSaved ${deals.length} deals to ${fileName}`);
            console.log('='.repeat(60));
        }
        
        console.log('\n✓ Scraping completed successfully!');
    } catch (error) {
        console.error('Error during scraping:', error);
        process.exit(1);
    }
};

main();
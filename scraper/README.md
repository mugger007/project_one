# Generic Deal Scraper

A TypeScript-based web scraper that searches Google for one-for-x deals (e.g., 1-for-1, buy-1-get-1) and scrapes deal information from multiple websites.

## Features

- 🔍 **Google Search Integration**: Automatically searches Google for deal-related queries
- 🌐 **Generic Scraping**: Works across multiple websites without site-specific configuration
- ✅ **Deal Validation**: Uses regex patterns to identify and validate deals
- 📊 **Structured Output**: Saves deals as JSON with title, price, URL, and source
- 🎯 **Pattern Matching**: Recognizes various deal formats ("1-for-1", "buy 1 get 1", "1+1", etc.)

## Setup

1. Install dependencies:
```bash
cd scraper
npm install
```

2. Build the project:
```bash
npm run build
```

3. Run the scraper:
```bash
npm start
```

## Usage

Edit [src/index.ts](src/index.ts) to customize search queries:

```typescript
const queries: ScraperOptions[] = [
    {
        searchTerm: '1 for 1 restaurant deals Singapore 2026',
        maxSitesToScrape: 5,
    },
];
```

## Output

Results are saved in the `output/` folder as JSON files:

```json
[
  {
    "title": "1-for-1 Pizza Deal at Restaurant ABC",
    "dealType": "1-for-1",
    "originalPrice": 25.90,
    "url": "https://example.com/deals",
    "sourceSite": "example.com",
    "scrapedAt": "2026-02-19T10:30:00.000Z"
  }
]
```

## How It Works

1. **Search**: Queries Google with your search term
2. **Extract URLs**: Parses search results to get top website URLs
3. **Scrape**: Visits each URL and extracts HTML content
4. **Parse**: Identifies deal patterns using regex
5. **Validate**: Filters and validates deals
6. **Save**: Outputs structured JSON files

## Project Structure

```
scraper/
├── src/
│   ├── index.ts              # Main entry point
│   ├── types/
│   │   └── index.ts          # TypeScript interfaces
│   ├── scrapers/
│   │   └── genericScraper.ts # Google search & scraping logic
│   ├── parsers/
│   │   └── dealParser.ts     # Deal pattern matching & validation
│   └── utils/
│       └── httpClient.ts     # HTTP request utility
├── output/                   # Generated JSON files
├── package.json
└── tsconfig.json
```

## Customization

### Add Deal Patterns

Edit [src/parsers/dealParser.ts](src/parsers/dealParser.ts):

```typescript
private dealPatterns = [
    /\b2\s*for\s*\d+\b/i,  // Add "2-for-x" pattern
    // ... existing patterns
];
```

### Adjust Scraping Behavior

Modify [src/scrapers/genericScraper.ts](src/scrapers/genericScraper.ts) to change:
- Request delays (default: 2 seconds)
- User agent headers
- Maximum results per search

## Development

```bash
# Build and run in one command
npm run dev

# Clean output files
npm run clean
```

## Notes

- Be respectful of websites' terms of service and robots.txt
- The scraper includes delays between requests to avoid overwhelming servers
- Results may vary depending on Google's search results and website structures
- Some websites may block automated scraping Project

This project is a web scraping application designed to fetch and parse data from various websites based on generic search criteria. It is structured to facilitate easy extension and maintenance.

## Project Structure

```
scraper
├── src
│   ├── index.ts               # Entry point of the application
│   ├── scrapers
│   │   └── genericScraper.ts  # Contains methods for generic web scraping
│   ├── parsers
│   │   └── dealParser.ts      # Parses the scraped data into a structured format
│   ├── utils
│   │   └── httpClient.ts      # Utility for making HTTP requests
│   └── types
│       └── index.ts           # Defines data structures used in the application
├── package.json                # npm configuration file
├── tsconfig.json              # TypeScript configuration file
└── README.md                   # Documentation for the project
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd scraper
   ```

2. Install the dependencies:
   ```
   npm install
   ```

## Usage

To run the scraper, execute the following command:
```
npm start
```

This will initiate the scraping process as defined in `src/index.ts`.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.
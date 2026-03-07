# Generic Deal Scraper

A TypeScript-based web scraper that finds one-for-x deals (e.g., 1-for-1, buy-1-get-1) from web pages using pattern matching.

## ⚠️ Important Notes

This scraper works best with **direct deal pages** that have full deal text in their HTML. It **does not** work well with:

- Category/listing pages (deals shown as links only)
- JavaScript-heavy sites (where content loads after page render)
- Sites requiring authentication

### Finding the Right URLs

- ❌ Listing pages (e.g. `/promotions/`) usually contain only links; they tend to return zero matches.
- ❌ Some known dead URLs: Chope promotions, Burpple `/deals`.
- ✅ Good targets are individual deal or blog post pages that literally include strings like "1-for-1" or "buy 1 get 1" in the HTML.

You can verify a page by viewing source (Ctrl+U) and searching for patterns.

### Detected Patterns

The parser searches for:

- `1 for 1`
- `1-for-1`
- `buy 1 get 1`
- `1+1`
- `BOGO` (buy one get one)

Adjust `src/parsers/dealParser.ts` if you need additional patterns.

## Features

- 🎯 **Pattern Matching**: Detects "1-for-1", "buy 1 get 1", "BOGO", "1+1", etc.
- 🌐 **Generic Parsing**: Works across any website with HTML content
- ✅ **Deal Validation**: Filters and validates matching patterns
- 📊 **Structured Output**: JSON output with deal details
- 🐛 **Debug Logging**: Comprehensive logging for troubleshooting
- 🔧 **Customizable**: Easy to add your own sites and patterns

## Quick Start

```bash
cd scraper
npm install
npm run build
npm start
```

## Usage Examples

### Configure Sites to Scrape

Edit [src/index.ts](src/index.ts) and add your sites:

```typescript
const sitesToScrape: DealSite[] = [
    { name: 'MySite', url: 'https://mysite.com/deals-page', category: 'food' },
    { name: 'AnotherSite', url: 'https://another.com/promotions', category: 'general' },
];

const scraper = new GenericScraper(sitesToScrape);
const deals = await scraper.scrape();
```

### Scrape by Category

```typescript
const scraper = new GenericScraper(sitesToScrape);

// Only scrape food-related sites
const foodDeals = await scraper.scrape('food');
```

### Add Sites Dynamically

```typescript
const scraper = new GenericScraper();

// Add sites one by one
scraper.addSite({ 
    name: 'NewSite', 
    url: 'https://newsite.com/deals', 
    category: 'food' 
});

// Or set all at once
scraper.setSites([
    { name: 'Site1', url: 'https://site1.com/deals', category: 'food' },
    { name: 'Site2', url: 'https://site2.com/deals', category: 'general' },
]);

const deals = await scraper.scrape();
```

### Test Pattern Matching

Create a test file to verify patterns work:

```html
<!-- test-deals.html -->
<html><body>
    <div>
        <h2>Amazing 1-for-1 Pizza Deal!</h2>
        <p>Original price: $25.90</p>
    </div>
    <div>
        <h2>Buy 1 Get 1 Free Burgers</h2>
        <p>$15.00 for both</p>
    </div>
</body></html>
```

Then scrape it:
```typescript
const scraper = new GenericScraper([
    { name: 'Test', url: 'file://path/to/test-deals.html', category: 'test' }
]);
const deals = await scraper.scrape();
```

## Output

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
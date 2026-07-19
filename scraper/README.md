# Generic Deal Scraper

A TypeScript-based web scraper that finds one-for-x deals (e.g., 1-for-1, buy-1-get-1) from web pages using pattern matching.

## ⚠️ Important Notes

This scraper works best with **direct deal pages** that have full deal text in their HTML. It **does** support:

- ✅ **Static HTML pages** with full deal text
- ✅ **Multi-page sites** with pagination links
- ✅ **JavaScript-heavy sites** with dynamic content (using Puppeteer)
- ✅ **Load More buttons** and infinite scroll (with JS rendering)

It **does not** work well with:

- ❌ Category/listing pages (deals shown as links only)
- ❌ Sites requiring authentication

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
- 🌐 **HTML Parsing**: Works across static HTML websites
- 🤖 **JS Rendering**: Supports JavaScript-heavy sites with Puppeteer
- 📄 **Pagination**: Follows multi-page pagination links automatically
- 🔄 **Load More Support**: Handles "Load More" buttons and dynamic content
- ✅ **Deal Validation**: Filters and validates matching patterns
- 📊 **Structured Output**: JSON output with deal details (merchant, dates, images, location)
- 🐛 **Debug Logging**: Comprehensive logging for troubleshooting
- 🔧 **Custom Scrapers**: Easy to add site-specific parsing logic
- 🎯 **Categories**: Organize sites by category and scrape selectively

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

### Configure JS-Based Scraping (Dynamic Content)

For sites that load content via JavaScript, enable JS rendering:

```typescript
const sitesToScrape: DealSite[] = [
    {
        name: 'CapitaLand Deals',
        url: 'https://www.capitaland.com/sg/en/shop/malls/deals.html',
        category: 'general',
        useJsScraping: true,                          // Enable JS rendering
        loadMoreSelector: '.btn-load-more',            // Selector for load more button
        loadMoreText: 'Load More',                      // Optional: match by text
        maxLoadMoreClicks: 10,                         // How many times to click
        loadMoreWaitForSelector: '.deal-card',         // Wait for new items after click
        containerSelector: 'body',                     // Element to extract content from
    },
];

const scraper = new GenericScraper(sitesToScrape);
const deals = await scraper.scrape();
```

**Note**: JS-based scraping uses Puppeteer and is slower than HTML-only parsing. Use only for sites that require it.

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
│   ├── index.ts                    # Entry point; configures sites and runs scraper
│   ├── scrapers
│   │   ├── genericScraper.ts       # HTML pagination, JS rendering, and deal parsing
│   │   └── siteScrapers.ts         # Site-specific scrapers (SassyMama, CapitaLand, etc.)
│   ├── parsers
│   │   └── dealParser.ts           # Extracts deal info: type, dates, merchant, location
│   ├── utils
│   │   └── httpClient.ts           # HTTP client with retry logic
│   └── types
│       └── index.ts                # TypeScript interfaces: Deal, DealSite
├── dist                            # Compiled JavaScript (generated)
├── output                          # Generated JSON files (git-ignored)
├── sources.json                    # Normalized source registry and category references
├── package.json                    # npm configuration & dependencies
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This file
```

## Scraper Architecture

### HTML Parsing
- **scrapeWithHtmlPagination**: Fetches a page, extracts deals via pattern matching, follows pagination links
- **parseDealsFromHtml**: Uses Cheerio to find deal patterns in HTML content

### JavaScript Rendering
- **scrapeWithJs**: Uses Puppeteer to render a page with JavaScript execution
- **handleLoadMore**: Clicks "Load More" buttons and waits for new content to appear

### Site-Specific Scrapers
- **siteScrapers registry**: Maps domains to custom scrapers (e.g., CapitaLand, SassyMama)
- Allows special handling for complex aggregators with unique HTML structures

## Supported Sites

The scraper is pre-configured with these sites:

1. **MyFave** - HTML pagination
2. **SassyMama SG** - Custom HTML parser for blog layout
3. **CapitaLand Deals** - JS-based with Load More button
4. **AllSGPromo** - HTML pagination
5. **DiveDeals** - HTML pagination
6. **SingPromos** - HTML pagination
7. **GreatDeals SG** - HTML pagination

Add or modify sources in [sources.json](sources.json); only add new code in [src/index.ts](src/index.ts) when a source needs a new scraper strategy.

## Source Registry

The [sources.json](sources.json) file is the single source of truth for scrape targets.

It uses a normalized structure:

- `sources` holds each source once, with metadata like `url`, `scrapeMode`, and `notes`
- `categories` points to those sources by ID so the same source can appear in multiple categories without duplication
- `notes` replaces inline JSON comments, since JSON itself does not support comments

`index.ts` reads this registry, converts the scrapeable entries into `DealSite[]`, and skips entries marked as `manual` or `pdf` until support exists.

### Recommended Workflow

1. Add or update a source in `sources.json` under `sources`
2. Reference that source ID from one or more category lists under `categories`
3. Put human-readable hints in `notes` instead of inline comments
4. Let `index.ts` build the runtime site list automatically

### Category Filtering

You can scrape only one category by passing it as the first CLI argument:

```bash
npm start -- general_deal_aggregators
```

That keeps the runtime configuration in sync with the registry instead of requiring a second hardcoded list in `index.ts`.

### When to Add Custom Scrapers

If a source needs special navigation or HTML parsing, add a handler in [src/scrapers/siteScrapers.ts](src/scrapers/siteScrapers.ts) and point the source entry at it via `scraperKey`.

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
import puppeteer from 'puppeteer';

interface GetTextOptions {
    headers?: Record<string, string>;
    browserFallback?: boolean;
    browserReferrer?: string;
    browserUserAgent?: string;
    preRequestDelayMs?: number;
}

export class HttpClient {
    private userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    ];

    private buildDefaultHeaders(userAgent: string): Record<string, string> {
        return {
            'User-Agent': userAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0',
        };
    }

    /**
     * Make GET request with retry logic for 403 errors
     */
    async getText(url: string, options: GetTextOptions = {}): Promise<string> {
        const userAgent = options.browserUserAgent ?? this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        const headers = {
            ...this.buildDefaultHeaders(userAgent),
            ...(options.headers ?? {}),
        };

        if (options.preRequestDelayMs && options.preRequestDelayMs > 0) {
            await this.sleep(options.preRequestDelayMs);
        }

        console.log(`[DEBUG] HTTP GET (text): ${url}`);
        const maxRetries = 3;
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers,
                });
                console.log(`[DEBUG] Response status: ${response.status} ${response.statusText}`);
                console.log(`[DEBUG] Content-Type: ${response.headers.get('content-type')}`);
                
                if (!response.ok) {
                    // For 403, retry with delay or fall back to a browser render.
                    if (response.status === 403 && options.browserFallback) {
                        console.log('[WARN] Got 403, trying browser fallback rendering...');
                        return await this.getTextWithBrowser(url, options, headers);
                    }

                    if (response.status === 403 && attempt < maxRetries) {
                        const delay = 1000 * (2 ** (attempt - 1)); // exponential backoff
                        console.log(`[WARN] Got 403, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})...`);
                        await this.sleep(delay);
                        continue;
                    }
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const text = await response.text();
                console.log(`[DEBUG] Received ${text.length} characters`);
                return text;
            } catch (error) {
                lastError = error;
                console.error(`[ERROR] Attempt ${attempt}/${maxRetries} failed:`, error);
                
                // Wait before next retry
                if (attempt < maxRetries) {
                    const delay = 1000 * (2 ** (attempt - 1));
                    await this.sleep(delay);
                }
            }
        }

        if (options.browserFallback) {
            console.log('[WARN] Fetch retries exhausted, trying browser fallback rendering...');
            return await this.getTextWithBrowser(url, options, headers);
        }

        console.error(`[ERROR] Failed to fetch ${url} after ${maxRetries} attempts`);
        throw lastError;
    }

    private async getTextWithBrowser(url: string, options: GetTextOptions, headers: Record<string, string>): Promise<string> {
        const browser = await puppeteer.launch({ headless: true });
        try {
            const page = await browser.newPage();
            await page.setUserAgent(options.browserUserAgent ?? headers['User-Agent']);
            await page.setExtraHTTPHeaders(headers);

            if (options.browserReferrer) {
                await page.setExtraHTTPHeaders({
                    ...headers,
                    referer: options.browserReferrer,
                });
            }

            await page.goto(url, { waitUntil: 'networkidle2' });
            const html = await page.content();
            console.log(`[DEBUG] Browser fallback received ${html.length} characters`);
            return html;
        } finally {
            await browser.close();
        }
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
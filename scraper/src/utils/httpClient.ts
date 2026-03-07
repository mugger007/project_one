export class HttpClient {
    private defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

    /**
     * Make GET request with retry logic for 403 errors
     */
    async getText(url: string, headers: Record<string, string> = {}): Promise<string> {
        console.log(`[DEBUG] HTTP GET (text): ${url}`);
        const maxRetries = 3;
        let lastError: any;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        ...this.defaultHeaders,
                        ...headers,
                    },
                });
                console.log(`[DEBUG] Response status: ${response.status} ${response.statusText}`);
                console.log(`[DEBUG] Content-Type: ${response.headers.get('content-type')}`);
                
                if (!response.ok) {
                    // For 403, retry with delay
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

        console.error(`[ERROR] Failed to fetch ${url} after ${maxRetries} attempts`);
        throw lastError;
    }

    /**
     * Sleep utility
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
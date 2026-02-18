export class HttpClient {
    private defaultHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    };

    async get(url: string, headers: Record<string, string> = {}): Promise<any> {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...this.defaultHeaders,
                ...headers,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    async getText(url: string, headers: Record<string, string> = {}): Promise<string> {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                ...this.defaultHeaders,
                ...headers,
            },
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.text();
    }

    async post(url: string, body: any, headers: Record<string, string> = {}): Promise<any> {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...this.defaultHeaders,
                ...headers,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }
}
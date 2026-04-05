import { AppSettings } from "../types";

export interface FirecrawlSearchResult {
  success: boolean;
  data: {
    url: string;
    title?: string;
    description?: string;
    markdown?: string;
  }[];
}

export async function firecrawlSearch(query: string, settings: AppSettings): Promise<{url: string, markdown?: string}[]> {
  if (!settings.firecrawlToken) {
    console.warn("Firecrawl token not provided, skipping web search.");
    return [];
  }

  try {
    const response = await fetch('/api/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://api.firecrawl.dev/v2/search',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.firecrawlToken}`,
          'Content-Type': 'application/json',
        },
        body: {
          query,
          sources: ["web"],
          categories: [],
          limit: settings.skillLimit || 5,
          scrapeOptions: {
            onlyMainContent: true,
            maxAge: 172800000,
            parsers: [],
            formats: [{ type: "markdown" }]
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Firecrawl search error:", errorText);
      return [];
    }

    const result: any = await response.json();
    
    // Firecrawl v2 search returns { success: true, data: [...] }
    if (result.success && Array.isArray(result.data)) {
      return result.data.map((item: any) => ({
        url: item.url || "",
        markdown: item.markdown || ""
      }));
    }

    // Fallback for different response structures
    if (Array.isArray(result)) {
      return result.map((item: any) => ({
        url: item.url || "",
        markdown: item.markdown || ""
      }));
    }

    console.warn("Firecrawl search returned unexpected structure:", result);
    return [];
  } catch (error) {
    console.error("Firecrawl search failed:", error);
    return [];
  }
}

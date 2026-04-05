import { GoogleGenAI, Type } from "@google/genai";
import { Platform, Skill, GeneratedSkill, AppSettings, AIProvider } from "../types";
import { API_ENDPOINTS, APP_METADATA } from "../constants";
import { firecrawlSearch } from "./firecrawlService";

function repairJSON(jsonString: string): string {
  let repaired = jsonString.trim();
  
  // Handle unescaped newlines in strings which break JSON.parse
  // This is common in AI responses
  repaired = repaired.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  
  // Try to fix common truncation issues
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === '\\') {
      escaped = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (!inString) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
      if (char === '[') openBrackets++;
      if (char === ']') openBrackets--;
    }
  }
  
  if (inString) repaired += '"';
  while (openBrackets > 0) {
    repaired += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    repaired += '}';
    openBraces--;
  }
  
  return repaired;
}

function extractJSON(text: string): any {
  if (!text) return null;
  
  // Clean up common AI artifacts
  let cleaned = text.trim();
  
  // Remove markdown code blocks if present
  if (cleaned.includes('```')) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      cleaned = match[1];
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to find the largest JSON block (either array or object)
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    
    let jsonCandidate = "";
    if (arrayMatch && objectMatch) {
      // Use the one that starts earlier
      jsonCandidate = arrayMatch.index! < objectMatch.index! ? arrayMatch[0] : objectMatch[0];
    } else {
      jsonCandidate = (arrayMatch || objectMatch)?.[0] || "";
    }

    if (jsonCandidate) {
      try {
        return JSON.parse(jsonCandidate);
      } catch (e2) {
        // Try repairing the candidate
        try {
          return JSON.parse(repairJSON(jsonCandidate));
        } catch (e3) {
          // If it's an array, try to find the last valid object in it
          if (jsonCandidate.startsWith('[')) {
             const lastBrace = jsonCandidate.lastIndexOf('}');
             if (lastBrace !== -1) {
               try {
                 return JSON.parse(repairJSON(jsonCandidate.substring(0, lastBrace + 1) + ']'));
               } catch (e4) { /* ignore */ }
             }
          }
          return null;
        }
      }
    }
    
    // Last ditch effort: repair the whole text
    try {
      return JSON.parse(repairJSON(cleaned));
    } catch (e5) {
      return null;
    }
  }
}

async function callAI(
  prompt: string, 
  settings: AppSettings, 
  schema?: any, 
  tools?: any[]
): Promise<string> {
  const { provider, apiKey, baseUrl, discoveryModel, synthesisModel } = settings;
  const model = prompt.includes("Search for AI agent skills") ? discoveryModel : synthesisModel;

  const isGoogle = provider === 'Google';
  
  if (isGoogle) {
    if (!apiKey) {
      throw new Error("No API key provided. Please enter an API key in the settings menu.");
    }

    // If running locally (localhost), we use the proxy to avoid CORS issues
    const isLocal = typeof window !== 'undefined' && 
                   (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

    if (isLocal) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const body = {
        contents: [{ parts: [{ text: prompt }] }],
        tools: tools && tools.length > 0 ? tools : undefined,
        generationConfig: {
          responseMimeType: schema ? "application/json" : undefined,
          responseSchema: schema || undefined
        }
      };

      try {
        const proxyRes = await fetch('/api/proxy', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            url, 
            method: "POST", 
            headers: { "Content-Type": "application/json" },
            body 
          })
        });

        const responseText = await proxyRes.text();
        if (!proxyRes.ok) throw new Error(responseText);
        
        const data = JSON.parse(responseText);
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      } catch (error: any) {
        console.error("Google Proxy AI Error:", error);
        throw new Error(`Google AI Error (via Proxy): ${error.message}`);
      }
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: tools && tools.length > 0 ? tools : undefined,
          responseMimeType: schema ? "application/json" : undefined,
          responseSchema: schema || undefined
        }
      });
      return response.text || "";
    } catch (error: any) {
      console.error("Google AI Error:", error);
      throw new Error(`Google AI Error: ${error.message || JSON.stringify(error)}`);
    }
  }

  // Generic fetch for other providers (OpenAI-compatible or custom)
  let url = "";
  let body: any = {};
  let headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  if (provider === 'OpenAI') {
    if (!apiKey) throw new Error("OpenAI API key is required in settings.");
    url = API_ENDPOINTS.OPENAI;
    body = {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192,
      response_format: schema ? { type: "json_object" } : undefined
    };
  } else if (provider === 'OpenRouter') {
    if (!apiKey) throw new Error("OpenRouter API key is required in settings.");
    url = API_ENDPOINTS.OPENROUTER;
    headers = {
      ...headers,
      "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : "https://ai-agent-skills.com",
      "X-Title": APP_METADATA.NAME
    };
    body = {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192,
      response_format: schema ? { type: "json_object" } : undefined
    };
  } else if (provider === 'Anthropic') {
    if (!apiKey) throw new Error("Anthropic API key is required in settings.");
    url = API_ENDPOINTS.ANTHROPIC;
    headers = {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    };
    body = {
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 8192
    };
  } else if (provider === 'Ollama') {
    url = `${baseUrl || API_ENDPOINTS.OLLAMA_DEFAULT.replace('/api/chat', '')}/api/chat`;
    body = {
      model,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      format: schema ? "json" : undefined
    };
  } else if (provider === 'HuggingFace') {
    url = `${API_ENDPOINTS.HUGGINGFACE_BASE}${model}`;
    body = { 
      inputs: prompt,
      options: { wait_for_model: true }
    };
  } else {
    // Custom or fallback
    url = baseUrl || "";
    body = { model, prompt };
  }

  try {
    // Use proxy to avoid CORS issues for third-party APIs
    const proxyRes = await fetch('/api/proxy', {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url,
        method: "POST",
        headers,
        body
      })
    });

    const responseText = await proxyRes.text();

    if (!proxyRes.ok) {
      let errorMessage = responseText;
      if (!errorMessage) {
        errorMessage = `Empty response from ${provider} (Status: ${proxyRes.status})`;
      } else {
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.error?.message || errorJson.message || JSON.stringify(errorJson);
        } catch (e) {
          // Not JSON, use raw text
        }
      }
      throw new Error(`AI Provider Error (${provider}): ${errorMessage}`);
    }

    const data = extractJSON(responseText);
    if (!data) {
      throw new Error(`Invalid JSON response from ${provider}. The AI might be reporting a limitation or error instead of the requested format.`);
    }
    
    // Extract text based on provider response format
    if (provider === 'OpenAI' || provider === 'OpenRouter') return data.choices[0].message.content;
    if (provider === 'Anthropic') return data.content[0].text;
    if (provider === 'Ollama') return data.message.content;
    if (provider === 'HuggingFace') return Array.isArray(data) ? data[0].generated_text : data.generated_text;
    
    return typeof data === 'string' ? data : JSON.stringify(data);
  } catch (error: any) {
    console.error(`${provider} AI Error:`, error);
    throw new Error(error.message || `Failed to communicate with ${provider}`);
  }
}

export async function discoverSkills(
  topic: string, 
  extraDescription: string, 
  extraUrls: string[],
  settings: AppSettings
): Promise<Skill[]> {
  let webContext = "";
  
  // If not Google and Firecrawl token is available, do a search ONLY if no extra URLs are provided
  if (settings.provider !== 'Google' && settings.firecrawlToken && settings.useGoogleSearch && extraUrls.length === 0) {
    console.log("Using Firecrawl for web search (no extra URLs provided)...");
    const searchResults = await firecrawlSearch(topic, settings);
    if (searchResults.length > 0) {
      console.log(`Using ${searchResults.length} search results directly from Firecrawl...`);
      const scrapedContents = searchResults
        .map(res => res.markdown)
        .filter(Boolean) as string[];
      
      webContext = scrapedContents.join("\n\n---\n\n");
    }
  }

  // If extra URLs are provided, the model will use its internal knowledge or browsing if capable.
  if (extraUrls.length > 0 && settings.useUrlContext) {
    console.log("Extra URLs provided, model will use internal knowledge or browsing if capable.");
  }

  const prompt = `
    Search for AI agent skills, tools, and capabilities related to the topic: "${topic}".
    ${extraDescription ? `Additional context: ${extraDescription}` : ""}
    ${settings.useUrlContext && extraUrls.length > 0 ? (
      settings.provider === 'Google' 
        ? `Specifically analyze and extract skills from these URLs: ${extraUrls.join(", ")}`
        : `Note: These reference URLs were provided (${extraUrls.join(", ")}). If you have browsing capabilities, please analyze them. Otherwise, use the provided topic and your internal knowledge to find relevant skills.`
    ) : ""}
    
    ${webContext ? `Below is scraped content from the web to help you discover relevant skills:\n\n${webContext}` : ""}

    Look for skills from sources like:
    - ClawHub (clawhub.ai)
    - skills.sh
    - GitHub (repositories with SKILL.md or agent tools)
    - Official documentation for Claude, OpenClaw, and Antigravity.

    Limit the discovery to approximately ${settings.skillLimit} high-quality results.
    For each skill, you MUST extract and provide:
    - name: The official skill name.
    - description: A detailed summary of its purpose and capabilities.
    - source: The registry or platform it belongs to.
    - sourceUrl: The direct link to the documentation or repository.
    - tools: A list of specific tools, functions, or API endpoints it provides.
    - inputs: Detailed input parameters, types, and formats.
    - outputs: Detailed return values and data formats.
    - installationInstructions: Step-by-step setup guide.
    - tags: Relevant categories or keywords.
    - popularity: A numeric score (0-100) based on stars, downloads, or relevance.
    
    Return ONLY a JSON array of objects.
  `;

  const tools: any[] = [];
  if (settings.useGoogleSearch && settings.provider === 'Google') {
    tools.push({ googleSearch: {} });
  }
  
  if (settings.useUrlContext && extraUrls.length > 0 && settings.provider === 'Google') {
    tools.push({ urlContext: {} });
  }
  
  const schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        source: { type: Type.STRING },
        sourceUrl: { type: Type.STRING },
        platform: { type: Type.STRING },
        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
        popularity: { type: Type.NUMBER },
        tools: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of specific tools or functions this skill provides" },
        inputs: { type: Type.STRING, description: "Expected input parameters or data format" },
        outputs: { type: Type.STRING, description: "Expected output or return data format" },
        installationInstructions: { type: Type.STRING, description: "Brief steps to install or enable this skill" }
      },
      required: ["name", "description", "source", "sourceUrl"]
    }
  };

  let text = "";
  try {
    text = await callAI(prompt, settings, schema, tools);
  } catch (error) {
    console.error("AI Discovery failed, checking for manual URLs fallback:", error);
    if (extraUrls.length === 0) {
      throw error; // Re-throw if no manual URLs to fall back to
    }
    // If we have extra URLs, we'll proceed with empty text and just return manual skills
    text = "[]"; 
  }

  try {
    let rawSkills = extractJSON(text || "[]") || [];
    
    // If the AI returned an object with a property that is an array, use that
    // This is common when the AI doesn't strictly follow "Return ONLY a JSON array"
    if (!Array.isArray(rawSkills) && typeof rawSkills === 'object' && rawSkills !== null) {
      const arrayKey = Object.keys(rawSkills).find(key => Array.isArray((rawSkills as any)[key]));
      if (arrayKey) {
        rawSkills = (rawSkills as any)[arrayKey];
      } else {
        // If no array property found, wrap the object in an array if it looks like a skill
        if ((rawSkills as any).name && (rawSkills as any).description) {
          rawSkills = [rawSkills];
        } else {
          rawSkills = [];
        }
      }
    }

    if (!Array.isArray(rawSkills)) {
      console.warn("AI response is not an array and couldn't be recovered:", rawSkills);
      rawSkills = [];
    }

    const discovered = rawSkills.map((s: any, index: number) => {
      // Sanitize sourceUrl
      let sanitizedUrl = (s.sourceUrl || "").trim();
      
      // Remove trailing dots or commas often added by AI
      sanitizedUrl = sanitizedUrl.replace(/[.,]$/, "");

      if (sanitizedUrl && !sanitizedUrl.startsWith('http')) {
        // Check if it looks like a domain (has at least one dot and no spaces)
        if (sanitizedUrl.includes('.') && !sanitizedUrl.includes(' ')) {
          sanitizedUrl = `https://${sanitizedUrl}`;
        } else {
          sanitizedUrl = ""; // Invalid URL
        }
      }

      // Final validation check
      try {
        if (sanitizedUrl) new URL(sanitizedUrl);
      } catch (e) {
        sanitizedUrl = "";
      }

      return {
        ...s,
        sourceUrl: sanitizedUrl,
        id: `skill-${index}-${Date.now()}`,
        selected: true,
        relevanceScore: 1.0
      };
    });

    // Add extra URLs as manual skills if they aren't already in the list
    const manualSkills: Skill[] = extraUrls.map((url, index) => {
      const exists = discovered.some((s: any) => s.sourceUrl === url);
      if (exists) return null;

      return {
        id: `manual-${index}-${Date.now()}`,
        name: `Reference: ${new URL(url).hostname}`,
        description: `User-provided reference URL for ${topic} context.`,
        source: "user-url",
        sourceUrl: url,
        selected: true,
        relevanceScore: 1.0
      };
    }).filter(Boolean) as Skill[];

    return [...manualSkills, ...discovered];
  } catch (e) {
    console.error("Failed to parse skills", e);
    return [];
  }
}

export async function synthesizeSkill(
  topic: string,
  description: string,
  platform: Platform,
  selectedSkills: Skill[],
  settings: AppSettings,
  referenceText?: string,
  customReferenceUrl?: string
): Promise<GeneratedSkill> {
  const skillsContext = selectedSkills.map(s => `
    NAME: ${s.name}
    SOURCE: ${s.sourceUrl}
    DESCRIPTION: ${s.description}
    TAGS: ${s.tags?.join(", ") || "N/A"}
    TOOLS/FUNCTIONS: ${s.tools?.join(", ") || "N/A"}
    INPUTS: ${s.inputs || "N/A"}
    OUTPUTS: ${s.outputs || "N/A"}
    INSTALLATION: ${s.installationInstructions || "N/A"}
    CONTENT: ${s.rawContent || "N/A"}
  `).join("\n---\n");

  const basePrompt = `
    You are ${APP_METADATA.NAME}, an expert AI agent engineer.
    Your task is to synthesize a "best-of" combined skill for the topic: "${topic}".
    Target Platform: ${platform}
    User Requirements: ${description}
    
    ${referenceText ? `Reference Style/Template to follow:\n${referenceText}` : ""}

    Source Skills to combine:
    ${skillsContext}
  `;

  const tools: any[] = [];
  if (settings.useUrlContext && customReferenceUrl && settings.provider === 'Google') {
    tools.push({ urlContext: {} });
  }

  console.log("Synthesizing skill components in parallel for speed...");

  // Define the 4 parallel tasks
  const tasks = [
    // Task 1: Definition
    async () => {
      const prompt = `${basePrompt}\n\nTASK: Generate the platform-specific skill definition (e.g., SKILL.md for OpenClaw, JSON for Claude, etc.). This must be EXTENSIVE and include all tools. Return ONLY the definition text.`;
      return callAI(prompt, settings, undefined, tools);
    },
    // Task 2: Instructions
    async () => {
      const prompt = `${basePrompt}\n\nTASK: Generate comprehensive README content covering all features, parameters, and usage examples. Return ONLY the instructions text.`;
      return callAI(prompt, settings, undefined, tools);
    },
    // Task 3: Setup Instructions
    async () => {
      const prompt = `${basePrompt}\n\nTASK: Generate a detailed, bulleted "Quick Start" guide showing the exact steps to get the skill published or deployed on ${platform}. Return ONLY the setup instructions text.`;
      return callAI(prompt, settings, undefined, tools);
    },
    // Task 4: Summary
    async () => {
      const prompt = `${basePrompt}\n\nTASK: Generate a detailed summary of the combined capabilities. Return ONLY the summary text.`;
      return callAI(prompt, settings, undefined, tools);
    }
  ];

  try {
    const [definition, instructions, setupInstructions, summary] = await Promise.all(tasks.map(t => t()));
    
    return {
      definition: definition || "Failed to generate definition.",
      instructions: instructions || "Failed to generate instructions.",
      setupInstructions: setupInstructions || "Failed to generate setup instructions.",
      summary: summary || "Failed to generate summary.",
      sources: selectedSkills
    };
  } catch (e) {
    console.error("Parallel synthesis failed", e);
    return {
      definition: "Error: Synthesis failed.",
      instructions: "One or more components failed to generate. Please try again.",
      setupInstructions: "Check your API keys and model availability.",
      summary: "Synthesis error occurred.",
      sources: selectedSkills
    };
  }
}

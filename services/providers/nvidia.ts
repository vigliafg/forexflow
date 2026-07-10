import { AnalysisReport, LLMProviderConfig } from "../../types";
import { buildAnalysisPrompt } from "../promptBuilder";

/**
 * NVIDIA NIM Provider - uses OpenAI-compatible chat completions API.
 * Base URL: https://integrate.api.nvidia.com/v1
 *
 * NOTE: NVIDIA's API does NOT set CORS headers, so direct browser calls fail.
 * We try a CORS proxy as fallback. The proxy forwards the request including auth headers.
 * This is a known limitation of NVIDIA's cloud API for browser apps.
 */
export class NvidiaNimProvider {
  constructor(public config: LLMProviderConfig) {}

  private async tryFetch(url: string, apiKey: string, body: string): Promise<Response> {
    return fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
    });
  }

  async analyze(report: AnalysisReport): Promise<string> {
    const baseUrl = this.config.baseUrl || "https://integrate.api.nvidia.com/v1";
    const directUrl = `${baseUrl}/chat/completions`;
    const requestBody = JSON.stringify({
      model: this.config.model,
      messages: [
        { role: "user" as const, content: buildAnalysisPrompt(report) },
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    // Strategy: try direct, then CORS proxy
    const urlsToTry = [
      directUrl,
      `https://corsproxy.io/?url=${encodeURIComponent(directUrl)}`,
    ];

    let lastError: Error | null = null;

    for (const url of urlsToTry) {
      try {
        const response = await this.tryFetch(url, this.config.apiKey, requestBody);

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          throw new Error(`NVIDIA NIM: HTTP ${response.status} - ${errorText.slice(0, 200)}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (!text) {
          throw new Error("NVIDIA NIM: risposta vuota");
        }

        // Log if we used the proxy
        if (url !== directUrl) {
          console.warn("[NVIDIA NIM] Usato CORS proxy per la richiesta. Considera usare OpenRouter per i modelli NVIDIA (già disponibili lì).");
        }

        return text;
      } catch (err: any) {
        lastError = err;
        // Only try proxy if the error looks like CORS/network
        if (url === directUrl && (
          err.message?.includes("Failed to fetch") ||
          err.message?.includes("NetworkError") ||
          err.name === "TypeError"
        )) {
          console.warn("[NVIDIA NIM] Richiesta diretta bloccata (CORS?), provo con proxy...");
          continue;
        }
        // If it's a real API error (4xx, 5xx), don't retry with proxy
        throw err;
      }
    }

    throw lastError || new Error("NVIDIA NIM: tutte le strategie di connessione fallite");
  }
}

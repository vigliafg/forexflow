import { AnalysisReport, LLMProviderConfig } from "../../types";
import { buildAnalysisPrompt } from "../promptBuilder";

/**
 * OpenRouter Provider - uses OpenAI-compatible chat completions API.
 * Base URL: https://openrouter.ai/api/v1
 */
export class OpenRouterProvider {
  constructor(public config: LLMProviderConfig) {}

  async analyze(report: AnalysisReport): Promise<string> {
    const baseUrl = this.config.baseUrl || "https://openrouter.ai/api/v1";
    const url = `${baseUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.origin,
        "X-Title": "ForexFlow AI",
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: "user" as const, content: buildAnalysisPrompt(report) },
        ],
        max_tokens: 600,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`OpenRouter: HTTP ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error("OpenRouter: risposta vuota");
    }

    return text;
  }
}

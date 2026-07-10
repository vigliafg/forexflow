import { AnalysisReport } from "../types";
import { loadConfig } from "./configService";
import { OpenRouterProvider } from "./providers/openrouter";
import { NvidiaNimProvider } from "./providers/nvidia";

export interface AnalysisResult {
  text: string;
  usedProvider: string;
}

export class LLMServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMServiceError";
  }
}

/**
 * Analyzes market data using the currently active provider/model from config.
 * Single provider only — no cascade. User switches providers manually in the UI.
 */
export const getMarketAnalysis = async (report: AnalysisReport): Promise<AnalysisResult> => {
  const config = loadConfig();

  if (!config || !config.setup_completed) {
    throw new LLMServiceError("Configurazione non trovata. Completa l'onboarding.");
  }

  const { provider, model } = config.active_provider;
  const apiKey = config.api_keys[provider];

  if (!apiKey) {
    throw new LLMServiceError(`API key mancante per il provider "${provider}".`);
  }

  if (provider === "openrouter") {
    const p = new OpenRouterProvider({
      name: `OpenRouter: ${model}`,
      apiKey,
      model,
      timeoutMs: 25000,
      provider: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
    });
    const text = await Promise.race([
      p.analyze(report),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout dopo 25s")), 25000)
      ),
    ]);
    return { text, usedProvider: p.config.name };
  }

  if (provider === "nvidia") {
    const p = new NvidiaNimProvider({
      name: `NVIDIA: ${model}`,
      apiKey,
      model,
      timeoutMs: 25000,
      provider: "nvidia",
      baseUrl: "https://integrate.api.nvidia.com/v1",
    });
    const text = await Promise.race([
      p.analyze(report),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout dopo 25s")), 25000)
      ),
    ]);
    return { text, usedProvider: p.config.name };
  }

  throw new LLMServiceError(`Provider "${provider}" non supportato.`);
};

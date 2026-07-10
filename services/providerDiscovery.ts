import { DiscoveredModel, ProviderType } from "../types";

// --- OpenRouter ---

interface OpenRouterModel {
  id: string;
  name: string;
  pricing: { prompt: string; completion: string };
  context_length?: number;
}

export const fetchOpenRouterFreeModels = async (): Promise<DiscoveredModel[]> => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error(`OpenRouter API error: ${response.status}`);

    const json = await response.json();
    const models: OpenRouterModel[] = json.data || [];

    const freeModels = models.filter(
      (m) => m.pricing.prompt === "0" && m.pricing.completion === "0"
    );

    return freeModels.map((m) => ({
      id: m.id,
      name: m.name || m.id,
      provider: "openrouter" as ProviderType,
      contextLength: m.context_length,
    }));
  } catch (error) {
    console.error("Failed to fetch OpenRouter models:", error);
    return getStaticOpenRouterModels();
  }
};

const getStaticOpenRouterModels = (): DiscoveredModel[] => [
  { id: "openrouter/free", name: "Free Models Router (auto)", provider: "openrouter", contextLength: 200000 },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B Instruct", provider: "openrouter", contextLength: 131072 },
  { id: "meta-llama/llama-3.2-3b-instruct:free", name: "Llama 3.2 3B Instruct", provider: "openrouter", contextLength: 131072 },
  { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B A4B", provider: "openrouter", contextLength: 262144 },
  { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B", provider: "openrouter", contextLength: 262144 },
  { id: "google/lyria-3-pro-preview", name: "Lyria 3 Pro Preview", provider: "openrouter", contextLength: 1048576 },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", name: "Qwen3 Next 80B", provider: "openrouter", contextLength: 262144 },
  { id: "qwen/qwen3-coder:free", name: "Qwen3 Coder 480B", provider: "openrouter", contextLength: 1048576 },
  { id: "openai/gpt-oss-120b:free", name: "GPT-OSS 120B", provider: "openrouter", contextLength: 131072 },
  { id: "openai/gpt-oss-20b:free", name: "GPT-OSS 20B", provider: "openrouter", contextLength: 131072 },
  { id: "nousresearch/hermes-3-llama-3.1-405b:free", name: "Hermes 3 405B", provider: "openrouter", contextLength: 131072 },
  { id: "nvidia/nemotron-3-ultra-550b-a55b:free", name: "Nemotron 3 Ultra 550B", provider: "openrouter", contextLength: 1000000 },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", name: "Nemotron 3 Super 120B", provider: "openrouter", contextLength: 1000000 },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", name: "Nemotron 3 Nano 30B", provider: "openrouter", contextLength: 256000 },
  { id: "tencent/hy3:free", name: "Tencent Hy3", provider: "openrouter", contextLength: 262144 },
  { id: "cohere/north-mini-code:free", name: "North Mini Code", provider: "openrouter", contextLength: 256000 },
];

// --- NVIDIA NIM ---

export const fetchNvidiaModels = async (apiKey: string): Promise<DiscoveredModel[]> => {
  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/models", {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error(`NVIDIA API error: ${response.status}`);

    const json = await response.json();
    const models: any[] = json.data || [];

    return models.map((m) => ({
      id: m.id,
      name: m.id,
      provider: "nvidia" as ProviderType,
    }));
  } catch (error) {
    console.error("Failed to fetch NVIDIA NIM models:", error);
    return getStaticNvidiaModels();
  }
};

const getStaticNvidiaModels = (): DiscoveredModel[] => [
  { id: "deepseek-ai/deepseek-v4-flash", name: "DeepSeek V4 Flash", provider: "nvidia", contextLength: 131072 },
  { id: "deepseek-ai/deepseek-v4-pro", name: "DeepSeek V4 Pro", provider: "nvidia", contextLength: 131072 },
  { id: "mistralai/mistral-medium-3.5-128b", name: "Mistral Medium 3.5 128B", provider: "nvidia", contextLength: 128000 },
  { id: "mistralai/mistral-small-4-119b-2603", name: "Mistral Small 4 119B", provider: "nvidia", contextLength: 119000 },
  { id: "nvidia/nemotron-3-ultra-550b-a55b", name: "Nemotron 3 Ultra 550B", provider: "nvidia", contextLength: 1000000 },
  { id: "nvidia/nemotron-3-super-120b-a12b", name: "Nemotron 3 Super 120B", provider: "nvidia", contextLength: 1000000 },
  { id: "google/gemma-4-31b-it", name: "Gemma 4 31B", provider: "nvidia", contextLength: 262144 },
  { id: "qwen/qwen3.5-122b-a10b", name: "Qwen 3.5 122B", provider: "nvidia", contextLength: 262144 },
  { id: "stepfun-ai/step-3.7-flash", name: "Step 3.7 Flash", provider: "nvidia", contextLength: 131072 },
  { id: "z-ai/glm-5.2", name: "GLM 5.2", provider: "nvidia", contextLength: 131072 },
  { id: "minimaxai/minimax-m3", name: "MiniMax M3", provider: "nvidia", contextLength: 131072 },
  { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B", provider: "nvidia", contextLength: 131072 },
  { id: "meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B", provider: "nvidia", contextLength: 131072 },
  { id: "mistralai/mistral-7b-instruct-v0.3", name: "Mistral 7B v0.3", provider: "nvidia", contextLength: 32768 },
  { id: "microsoft/phi-4-mini-instruct", name: "Phi-4 Mini", provider: "nvidia", contextLength: 128000 },
];

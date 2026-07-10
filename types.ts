export type Timeframe = '15m' | '1h' | '1d' | '1w' | '1mo';

// --- LLM Provider Types ---

export type ProviderType = 'openrouter' | 'nvidia';

export interface DiscoveredModel {
  id: string;
  name: string;
  provider: ProviderType;
  contextLength?: number;
  description?: string;
}

export interface LLMProviderConfig {
  name: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  provider: ProviderType;
  baseUrl?: string;
}

// --- Active Provider (single, user-selected) ---

export interface ActiveProvider {
  provider: ProviderType;
  model: string;
}

// --- TOML Config Types ---

export interface ForexFlowConfig {
  config_version: number;
  api_keys: {
    openrouter: string;
    nvidia: string;
  };
  active_provider: ActiveProvider;
  provider_models: {
    openrouter: string[];
    nvidia: string[];
  };
  setup_completed: boolean;
}

// --- Market Data ---

export interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export enum Trend {
  BULLISH = 'Bullish',
  BEARISH = 'Bearish',
  NEUTRAL = 'Neutral',
}

export interface TechnicalSignal {
  name: string;
  value: number | string;
  signal: Trend;
  description: string;
}

export interface ForecastPoint {
  period: number;
  price: number;
  rangeLow: number;
  rangeHigh: number;
  probability: number;
}

export interface ForecastModelResult {
  modelName: string;
  forecasts: ForecastPoint[];
  methodology: string;
  color: string;
  backtestAccuracy: number;
}

export interface AnalysisReport {
  currentPrice: number;
  timestamp: string;
  timeframe: string;
  signals: TechnicalSignal[];
  forecasts: ForecastModelResult[];
  backtestAccuracy: number;
}

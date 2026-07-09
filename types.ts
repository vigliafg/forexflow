export type Timeframe = '15m' | '1h' | '1d' | '1w' | '1mo';

export interface Candle {
  time: string; // ISO string
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
  period: number; // 1, 2, 3 periods ahead
  price: number;
  rangeLow: number;
  rangeHigh: number;
  probability: number; // 0-100%
}

export interface ForecastModelResult {
  modelName: string;
  forecasts: ForecastPoint[]; // Forecasts for t+1, t+2, t+3
  methodology: string;
  color: string;
  backtestAccuracy: number; // Simulated historical accuracy over 3 years
}

export interface AnalysisReport {
  currentPrice: number;
  timestamp: string;
  timeframe: string;
  signals: TechnicalSignal[];
  forecasts: ForecastModelResult[];
  backtestAccuracy: number; // Simulated historical accuracy
}
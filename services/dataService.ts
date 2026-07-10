import { Candle, Timeframe } from '../types';

// Generate realistic random walk data if all APIs fail
export const generateMarketData = (timeframe: Timeframe = '1h'): Candle[] => {
  const data: Candle[] = [];
  const now = new Date();
  
  let periods = 100;
  let intervalMs = 60 * 60 * 1000;
  
  switch(timeframe) {
      case '15m': intervalMs = 15 * 60 * 1000; break;
      case '1h':  intervalMs = 60 * 60 * 1000; break;
      case '1d':  intervalMs = 24 * 60 * 60 * 1000; break;
      case '1w':  intervalMs = 7 * 24 * 60 * 60 * 1000; break;
      case '1mo': intervalMs = 30 * 24 * 60 * 60 * 1000; break;
  }

  let price = 1.0850; 
  const startTime = new Date(now.getTime() - periods * intervalMs);

  for (let i = 0; i < periods; i++) {
    const time = new Date(startTime.getTime() + i * intervalMs);
    const change = (Math.random() - 0.5) * 0.0030;
    const volatility = (Math.random() * 0.0020);
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + volatility;
    const low = Math.min(open, close) - volatility;
    const volume = Math.floor(Math.random() * 10000) + 1000;

    data.push({ time: time.toISOString(), open, high, low, close, volume });
    price = close;
  }
  return data;
};

// Parse Yahoo Finance chart response into candles
const parseYahooResponse = (json: any): Candle[] => {
  if (json.chart?.error) throw new Error(JSON.stringify(json.chart.error));
  const result = json.chart?.result?.[0];
  if (!result?.timestamp || !result.indicators?.quote?.[0]) {
    throw new Error('Invalid data structure');
  }

  const timestamps = result.timestamp;
  const quotes = result.indicators.quote[0];
  const candles: Candle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (quotes.close[i] === null || quotes.open[i] === null) continue;
    candles.push({
      time: new Date(timestamps[i] * 1000).toISOString(),
      open: quotes.open[i],
      high: quotes.high[i],
      low: quotes.low[i],
      close: quotes.close[i],
      volume: quotes.volume[i] || 0
    });
  }

  if (candles.length < 20) throw new Error('Not enough data points');
  return candles;
};

// --- Main fetch function ---

export const fetchMarketData = async (timeframe: Timeframe): Promise<{ data: Candle[], source: 'LIVE' | 'SIMULATED' }> => {
  const symbol = 'EURUSD=X';
  
  let range = '1mo';
  let interval = '60m';
  switch (timeframe) {
    case '15m': interval = '15m'; range = '5d'; break;
    case '1h':  interval = '60m'; range = '1mo'; break;
    case '1d':  interval = '1d'; range = '1y'; break;
    case '1w':  interval = '1wk'; range = '2y'; break;
    case '1mo': interval = '1mo'; range = '5y'; break;
  }

  const ts = Date.now();

  // Strategy 1: Vite dev proxy (localhost:3000 → Yahoo Finance, zero CORS)
  const proxyUrl = `/api/yahoo/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&nocache=${ts}`;

  try {
    const response = await fetch(proxyUrl);
    if (response.ok) {
      const json = await response.json();
      const candles = parseYahooResponse(json);
      console.log(`[Data] LIVE via Vite proxy (${candles.length} candles)`);
      return { data: candles, source: 'LIVE' };
    }
    console.warn(`[Data] Vite proxy: HTTP ${response.status}`);
  } catch (err: any) {
    console.warn('[Data] Vite proxy failed:', err.message);
  }

  // Strategy 2: Try public CORS proxy as fallback (for production builds without Vite)
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&nocache=${ts}`;
  try {
    const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}&_=${ts}`);
    if (response.ok) {
      const json = await response.json();
      const candles = parseYahooResponse(json);
      console.log(`[Data] LIVE via allorigins proxy (${candles.length} candles)`);
      return { data: candles, source: 'LIVE' };
    }
  } catch (err: any) {
    console.warn('[Data] allorigins proxy failed:', err.message);
  }

  // All strategies failed, use simulation
  console.warn('[Data] All sources failed, using simulated data');
  return { data: generateMarketData(timeframe), source: 'SIMULATED' };
};

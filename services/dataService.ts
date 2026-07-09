import { Candle, Timeframe } from '../types';

// Fallback: Generate realistic random walk data if API fails
export const generateMarketData = (timeframe: Timeframe = '1h'): Candle[] => {
  const data: Candle[] = [];
  const now = new Date();
  
  let periods = 100;
  let intervalMs = 60 * 60 * 1000; // Default 1h
  
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

    data.push({
      time: time.toISOString(),
      open,
      high,
      low,
      close,
      volume,
    });

    price = close;
  }
  return data;
};

// Fetch Real Data from Yahoo Finance
export const fetchMarketData = async (timeframe: Timeframe): Promise<{ data: Candle[], source: 'LIVE' | 'SIMULATED' }> => {
  const symbol = 'EURUSD=X';
  
  // Map internal timeframe to Yahoo Finance API params
  let range = '1mo';
  let interval = '60m';

  switch (timeframe) {
    case '15m':
      interval = '15m';
      range = '5d'; // Yahoo often limits intraday data range
      break;
    case '1h':
      interval = '60m';
      range = '1mo';
      break;
    case '1d':
      interval = '1d';
      range = '1y';
      break;
    case '1w':
      interval = '1wk';
      range = '2y';
      break;
    case '1mo':
      interval = '1mo';
      range = '5y'; // Long history for monthly
      break;
  }
  
  // We use a CORS proxy to bypass browser restrictions when calling Yahoo Finance directly
  // Added timestamp to prevent caching
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval}&range=${range}&nocache=${new Date().getTime()}`;
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(yahooUrl)}`;

  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const json = await response.json();
    
    // Check if Yahoo returned an error object inside the JSON
    if (json.chart && json.chart.error) {
        throw new Error(JSON.stringify(json.chart.error));
    }

    const result = json.chart?.result?.[0];
    
    if (!result || !result.timestamp || !result.indicators.quote[0]) {
      throw new Error('Invalid data structure from API');
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const candles: Candle[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      // Filter out incomplete candles (null values)
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

    // Ensure we have enough data, otherwise fallback
    if (candles.length < 20) throw new Error('Not enough data points');

    return { data: candles, source: 'LIVE' };

  } catch (error) {
    console.warn("Failed to fetch live data (likely CORS or Rate Limit), using simulation fallback:", error);
    return { data: generateMarketData(timeframe), source: 'SIMULATED' };
  }
};
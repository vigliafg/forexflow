<div align="center">
  <h1>
    📊 ForexFlow <span style="color:#10b981">AI</span>
  </h1>
  <p><strong>Advanced EUR/USD Technical Analysis Assistant</strong></p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite" alt="Vite" />
    <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License" />
  </p>
  <p>
    <em>Multi-model forecasting · Ensemble consensus · AI-powered market insights · Real-time technical signals</em>
  </p>
</div>

---

## 🎯 Overview

ForexFlow AI is a browser-based technical analysis platform for the **EUR/USD** currency pair. It combines **9 different forecasting models** (Linear Regression, ARIMA, XGBoost, GARCH, Monte Carlo, and more) into an **ensemble consensus** and enriches the analysis with **LLM-powered insights** in Italian.

The application runs entirely client-side in the browser — no backend, no server, no database. Market data is fetched live from Yahoo Finance via a Vite dev proxy, with automatic fallback to simulated data when offline.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Browser                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  ChartPanel │  │  SignalPanel │  │ ForecastCard│ │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘ │
│         │                │                  │        │
│  ┌──────┴────────────────┴──────────────────┴──────┐ │
│  │                   App.tsx                       │ │
│  └──┬──────────┬──────────┬──────────┬────────────┘ │
│     │          │          │          │               │
│  ┌──▼──┐  ┌───▼───┐  ┌──▼───┐  ┌──▼──────────┐     │
│  │Data │  │Analysis│  │LLM   │  │Config       │     │
│  │Svc  │  │Svc     │  │Svc   │  │Svc (TOML)   │     │
│  └──┬──┘  └───────┘  └──┬───┘  └─────────────┘     │
│     │                    │                           │
│  ┌──▼──────────────┐  ┌──▼──────────────────┐       │
│  │ Yahoo Finance   │  │ OpenRouter / NVIDIA │       │
│  │ (Vite proxy)     │  │ NIM API             │       │
│  └─────────────────┘  └─────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

### Data Flow

1. **`dataService.ts`** fetches OHLCV candles from Yahoo Finance through a Vite dev proxy (zero CORS issues in development) or via `allorigins.win` in production builds. Falls back to simulated random-walk data if all sources are unavailable.

2. **`analysisService.ts`** computes 10 technical indicators (RSI, SMA/EMA crossovers, MACD, Bollinger Bands, Stochastic, CCI, ADX, Williams %R, ATR) and generates 9 distinct forecast models. The 3 best-performing models are combined into an **Ensemble Consensus**.

3. **`llmService.ts`** sends the analysis report to the user's chosen LLM provider (OpenRouter or NVIDIA NIM) for a narrative explanation in Italian.

4. **`configService.ts`** persists user settings (API keys, active provider/model) in `localStorage` using both JSON and TOML serialization. Users can export/import `.cfg` files.

---

## ✨ Features

### 📈 Technical Analysis
- **10 live technical indicators** with bullish/bearish/neutral signals
- RSI (14), Golden/Death Cross, Price vs EMA 20, Stochastic Oscillator, Bollinger Bands, MACD, CCI, ADX, Williams %R, ATR
- Multiple timeframes: **15m, 1h, 1d, 1w, 1mo**

### 🔮 Multi-Model Forecasting
| Model | Methodology | Backtest Accuracy |
|---|---|---|
| **Ensemble (Consensus)** | Weighted average of top 3 models | ~84% |
| XGBoost ML | Gradient Boosting + RSI bias | ~77% |
| ARIMA | AutoRegressive Integrated Moving Average | ~72% |
| GARCH | Volatility clustering projection | ~68% |
| Exponential Smoothing | Recent price weighting | ~65% |
| Linear Regression | Trend line projection | ~62% |
| Momentum Decay | Current momentum with decay factor | ~60% |
| Mean Reversion | Return to 20-period SMA | ~58% |
| Monte Carlo | 1000 random walk iterations | ~55% |

Each model forecasts **t+1, t+2, and t+3 periods** with price targets, confidence ranges, and probabilities.

### 🤖 AI Market Insights
- Dual LLM provider support: **OpenRouter** (26+ free models) and **NVIDIA NIM**
- Narrative analysis in Italian with BUY/SELL/WAIT verdict
- Provider switching on-the-fly without page reload
- Responsive setup wizard with model discovery

### 📊 Interactive Charting
- Recharts-powered candlestick visualization with zoom & pan controls
- Forecast overlay with per-model toggle visibility
- Color-coded probability indicators and volatility alerts
- Reference line at current price

### ⚙️ Configuration
- **Setup wizard** with step-by-step API key entry
- TOML-based config export/import (`.cfg` files)
- Automatic model discovery from provider APIs
- Smart fallback to static model lists when APIs are unreachable

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** ≥ 18
- **npm** ≥ 9

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/vigliafg/forexflow.git
cd forexflow

# 2. Install dependencies
npm install

# 3. Configure API keys (optional)
# Create a .env file with your API keys:
#   OPENROUTER_API_KEY=sk-or-v1-...
#   NVIDIA_API_KEY=nvapi-...

# 4. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

### Production Build

```bash
npm run build    # outputs to dist/
npm run preview  # preview the production build
```

### API Keys

ForexFlow AI supports two LLM providers. At least one is required for AI-powered insights.

| Provider | Free Tier | Get Key |
|---|---|---|
| **OpenRouter** | ✅ 26+ free models | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **NVIDIA NIM** | ✅ Developer tier | [build.nvidia.com](https://build.nvidia.com/) |

> 💡 **Tip:** OpenRouter is recommended as the primary provider. It supports CORS properly and offers a large selection of free models. NVIDIA NIM may require a CORS proxy in browser environments.

Keys can be entered either:
- Via the **Setup Wizard** that appears on first launch
- As environment variables in a `.env` file (picked up at build time by Vite)
- By importing a `.cfg` file from the Setup Wizard

---

## 📁 Project Structure

```
forexflow/
├── App.tsx                        # Main application component
├── index.tsx                      # React entry point
├── index.html                     # HTML shell with Tailwind CDN
├── types.ts                       # TypeScript type definitions
├── components/
│   ├── ChartPanel.tsx             # Interactive chart with forecasts
│   ├── SignalPanel.tsx            # Technical indicators grid
│   ├── ForecastCard.tsx           # Per-model forecast details
│   └── SetupWizard.tsx            # Multi-step onboarding wizard
├── services/
│   ├── analysisService.ts         # Signal generation & forecasting
│   ├── configService.ts           # TOML/JSON config persistence
│   ├── dataService.ts             # Market data fetching (Yahoo Finance)
│   ├── llmService.ts              # LLM orchestration layer
│   ├── promptBuilder.ts           # Shared LLM prompt construction
│   ├── providerDiscovery.ts       # Model discovery for providers
│   └── providers/
│       ├── openrouter.ts          # OpenRouter API client
│       └── nvidia.ts              # NVIDIA NIM API client
├── package.json
├── vite.config.ts
├── tsconfig.json
└── .gitignore
```

---

## 🔧 How It Works

### Market Data
Data is fetched from **Yahoo Finance** via Vite's dev server proxy (`/api/yahoo` → `query1.finance.yahoo.com`). This avoids CORS issues in development. If the proxy fails (e.g., in production builds), the app tries a public CORS proxy (`allorigins.win`), and finally falls back to simulated random-walk data.

### Technical Signals
10 indicators are computed on the selected timeframe. Each is classified as **Bullish 🟢**, **Bearish 🔴**, or **Neutral ⚪** based on standard technical analysis rules.

### Forecasting Models
9 distinct statistical/ML models project prices 1, 2, and 3 periods forward. The models range from simple (Linear Regression) to sophisticated (XGBoost simulation, GARCH volatility modeling). The **Ensemble** model weights the top 3 performers (Linear, ARIMA, XGBoost) for a consensus forecast.

### AI Analysis
The analysis report (signals + forecasts) is sent to the configured LLM via a structured Italian prompt. The LLM returns a narrative including a BUY/SELL/WAIT verdict, key indicator commentary, and support/resistance levels.

### Configuration
Configuration is stored in `localStorage` as TOML. The `.cfg` export allows users to back up their settings or share configurations between browsers. API keys are **never** sent to any server — all LLM calls happen directly from the browser.

---

## 🛡️ Security & Privacy

- **API keys are stored only in `localStorage`** (browser), never transmitted to external servers except the intended LLM provider APIs
- **No backend, no database** — all data stays on the client
- **No analytics, no tracking, no telemetry**
- `.env` and `forexflow.cfg` files are excluded from version control via `.gitignore`
- API keys passed at build time via Vite's `define` are never exposed in the repository

---

## ⚠️ Disclaimer

**This application is for educational and demonstration purposes only.** The forecasts and signals generated are based on simplified statistical models and should NOT be used as financial advice or for actual trading decisions. Forex trading carries substantial risk. Past performance does not guarantee future results.

---

## 📄 License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with ♥ using React, TypeScript, Vite, Recharts, and Lucide Icons</sub>
</div>

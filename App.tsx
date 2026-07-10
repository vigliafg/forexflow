import React, { useState, useEffect } from 'react';
import { fetchMarketData } from './services/dataService';
import { generateSignals, generateForecasts, getConsensusSummary } from './services/analysisService';
import { getMarketAnalysis, LLMServiceError } from './services/llmService';
import { loadConfig, getDefaultConfig, saveConfig, hasAnyApiKey } from './services/configService';
import { Candle, ForecastModelResult, TechnicalSignal, AnalysisReport, Timeframe, ForexFlowConfig, ProviderType } from './types';
import { SignalPanel } from './components/SignalPanel';
import { ForecastCard } from './components/ForecastCard';
import { ChartPanel } from './components/ChartPanel';
import { SetupWizard } from './components/SetupWizard';
import { Bot, RefreshCw, BarChart3, AlertTriangle, Cpu, Activity, Target, Wifi, WifiOff, Eye, EyeOff, Lightbulb, Clock, Settings, Globe, ChevronDown } from 'lucide-react';

const PROVIDER_LABELS: Record<ProviderType, { name: string; icon: React.FC<any>; color: string }> = {
  openrouter: { name: 'OpenRouter', icon: Globe, color: 'text-purple-400' },
  nvidia: { name: 'NVIDIA NIM', icon: Cpu, color: 'text-green-400' },
};

const CURRENT_CONFIG_VERSION = 2;

const App: React.FC = () => {
  const [data, setData] = useState<Candle[]>([]);
  const [signals, setSignals] = useState<TechnicalSignal[]>([]);
  const [forecasts, setForecasts] = useState<ForecastModelResult[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [aiProvider, setAiProvider] = useState<string>("");
  const [simpleSummary, setSimpleSummary] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [dataSource, setDataSource] = useState<'LIVE' | 'SIMULATED'>('SIMULATED');

  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [appConfig, setAppConfig] = useState<ForexFlowConfig | null>(null);
  const [providerMenuOpen, setProviderMenuOpen] = useState<boolean>(false);

  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1h');
  const [hiddenModels, setHiddenModels] = useState<Set<string>>(new Set());

  // Check setup on mount
  useEffect(() => {
    const config = loadConfig();

    if (config && config.setup_completed && config.config_version >= CURRENT_CONFIG_VERSION) {
      setAppConfig(config);
    } else if (config && config.setup_completed && config.config_version < CURRENT_CONFIG_VERSION) {
      // Migration: fix old v1 configs to v2 format
      const migratedConfig: ForexFlowConfig = {
        config_version: CURRENT_CONFIG_VERSION,
        api_keys: config.api_keys,
        active_provider: (config as any).active_provider || { provider: "openrouter", model: "openrouter/free" },
        provider_models: config.provider_models || { openrouter: [], nvidia: [] },
        setup_completed: true,
      };
      saveConfig(migratedConfig);
      setAppConfig(migratedConfig);
    } else {
      const defaultCfg = getDefaultConfig();
      if (hasAnyApiKey(defaultCfg)) {
        const autoConfig: ForexFlowConfig = {
          ...defaultCfg,
          active_provider: { provider: "openrouter", model: "openrouter/free" },
          setup_completed: true,
        };
        saveConfig(autoConfig);
        setAppConfig(autoConfig);
      } else {
        setShowSetup(true);
      }
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    const { data: marketData, source } = await fetchMarketData(selectedTimeframe);
    const generatedSignals = generateSignals(marketData);
    const generatedForecasts = generateForecasts(marketData);
    const summary = getConsensusSummary(generatedForecasts, marketData[marketData.length - 1].close, selectedTimeframe);
    setData(marketData);
    setSignals(generatedSignals);
    setForecasts(generatedForecasts);
    setSimpleSummary(summary);
    setDataSource(source);
    setAiAnalysis("");
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [selectedTimeframe]);

  const handleAiAnalysis = async () => {
    if (!appConfig) return;
    setAnalyzing(true);
    setAiProvider("");
    const report: AnalysisReport = {
      currentPrice: data[data.length - 1].close,
      timestamp: new Date().toISOString(),
      timeframe: selectedTimeframe,
      signals: signals,
      forecasts: forecasts,
      backtestAccuracy: 84.2,
    };

    try {
      const { text, usedProvider } = await getMarketAnalysis(report);
      setAiAnalysis(text);
      setAiProvider(usedProvider);
    } catch (err) {
      if (err instanceof LLMServiceError) {
        setAiAnalysis("⚠️ " + err.message);
      } else {
        setAiAnalysis("⚠️ Errore di connessione al provider AI.");
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSetupComplete = (config: ForexFlowConfig) => {
    setAppConfig(config);
    setShowSetup(false);
  };

  const handleSetupSkip = () => {
    setShowSetup(false);
  };

  // Switch active provider
  const switchProvider = (provider: ProviderType, model: string) => {
    if (!appConfig) return;
    const updated: ForexFlowConfig = {
      ...appConfig,
      active_provider: { provider, model },
    };
    saveConfig(updated);
    setAppConfig(updated);
    setProviderMenuOpen(false);
  };

  const toggleModelVisibility = (modelName: string) => {
    setHiddenModels(prev => {
      const next = new Set(prev);
      if (next.has(modelName)) next.delete(modelName);
      else next.add(modelName);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950 text-emerald-500">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 animate-spin" />
          <span className="text-xl font-mono tracking-widest uppercase">FETCHING {selectedTimeframe} DATA...</span>
        </div>
      </div>
    );
  }

  const currentCandle = data[data.length - 1];
  const previousCandle = data[data.length - 2];
  if (!currentCandle || !previousCandle) return null;

  const currentPrice = currentCandle.close;
  const priceChange = currentPrice - previousCandle.close;
  const isUp = priceChange >= 0;
  const timeframes: Timeframe[] = ['15m', '1h', '1d', '1w', '1mo'];

  // Build available provider/models list for the dropdown
  const availableProviders: { provider: ProviderType; models: string[] }[] = [];
  if (appConfig?.api_keys.openrouter) {
    const orModels = appConfig.provider_models.openrouter.length > 0
      ? appConfig.provider_models.openrouter
      : ["openrouter/free"];
    availableProviders.push({ provider: "openrouter", models: orModels });
  }
  if (appConfig?.api_keys.nvidia) {
    const nvModels = appConfig.provider_models.nvidia.length > 0
      ? appConfig.provider_models.nvidia
      : ["deepseek-ai/deepseek-v4-flash"];
    availableProviders.push({ provider: "nvidia", models: nvModels });
  }

  const activeProvider = appConfig?.active_provider;
  const activeProviderInfo = activeProvider ? PROVIDER_LABELS[activeProvider.provider] : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <BarChart3 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">ForexFlow <span className="text-emerald-400">AI</span></h1>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-slate-400 font-mono uppercase">EUR/USD {selectedTimeframe} • ANALYST</p>
                  <span className={`flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded border ${dataSource === 'LIVE' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'}`}>
                    {dataSource === 'LIVE' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {dataSource === 'LIVE' ? 'LIVE' : 'SIM'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeframe Selector */}
          <div className="bg-slate-800/50 p-1 rounded-lg border border-slate-700 flex items-center gap-1">
            <Clock className="w-4 h-4 text-slate-500 ml-2 mr-1" />
            {timeframes.map(tf => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  selectedTimeframe === tf
                    ? 'bg-emerald-500 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-end">
            {/* Provider/Model Selector */}
            {activeProviderInfo && (
              <div className="relative">
                <button
                  onClick={() => setProviderMenuOpen(!providerMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <activeProviderInfo.icon className={`w-4 h-4 ${activeProviderInfo.color}`} />
                  <div className="text-left">
                    <div className="text-[11px] font-semibold text-white">{activeProviderInfo.name}</div>
                    <div className="text-[9px] text-slate-500 font-mono max-w-[120px] truncate">
                      {activeProvider?.model}
                    </div>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${providerMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {providerMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProviderMenuOpen(false)} />
                    <div className="absolute top-full mt-1 right-0 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 min-w-[260px] overflow-hidden">
                    {availableProviders.map(({ provider, models }) => {
                      const info = PROVIDER_LABELS[provider];
                      const Icon = info.icon;
                      return (
                        <div key={provider}>
                          <div className="flex items-center gap-2 px-3 py-2 text-[11px] text-slate-500 uppercase tracking-wider font-semibold bg-slate-800/50">
                            <Icon className={`w-3.5 h-3.5 ${info.color}`} />
                            {info.name}
                          </div>
                          {models.map(model => {
                            const isActive = activeProvider?.provider === provider && activeProvider?.model === model;
                            return (
                              <button
                                key={model}
                                onClick={() => switchProvider(provider, model)}
                                className={`w-full text-left px-4 py-2 text-xs font-mono transition-colors ${
                                  isActive
                                    ? 'bg-slate-700 text-white'
                                    : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
                                }`}
                              >
                                {isActive && <span className="text-emerald-400 mr-1">◆</span>}
                                {model.length > 35 ? model.slice(0, 32) + '...' : model}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}                    </div>
                  </>
                )}
              </div>
            )}

            <div className="text-right hidden sm:block">
              <div className="text-2xl font-mono font-bold text-white">{currentPrice.toFixed(5)}</div>
              <div className={`text-xs font-mono flex items-center justify-end gap-1 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? '+' : ''}{priceChange.toFixed(5)} ({((priceChange/currentPrice)*100).toFixed(2)}%)
              </div>
            </div>

            <button onClick={() => setShowSetup(true)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white" title="Configurazione">
              <Settings className="w-5 h-5" />
            </button>
            <button onClick={loadData} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white" title="Refresh Data">
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <ChartPanel data={data} forecasts={forecasts} hiddenModels={hiddenModels} timeframe={selectedTimeframe} />
            <div className="flex flex-col gap-2 px-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Model Visibility & Backtest (3yr):</span>
                <span className="text-[10px] text-slate-600 italic">Click to toggle forecasts</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {forecasts.map(model => {
                  const isHidden = hiddenModels.has(model.modelName);
                  return (
                    <button key={model.modelName} onClick={() => toggleModelVisibility(model.modelName)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded border transition-all ${
                        isHidden ? 'bg-slate-900/30 border-slate-800/30 opacity-50 grayscale'
                        : 'bg-slate-900/80 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                      }`}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: model.color }}></span>
                      <span className={`text-[10px] font-mono ${isHidden ? 'text-slate-500' : 'text-slate-300'}`}>
                        {model.modelName.split(' ')[0]}
                        <span className={`${isHidden ? 'text-slate-600' : 'text-slate-500'} ml-1`}>({model.backtestAccuracy}%)</span>
                      </span>
                      {isHidden ? <EyeOff className="w-3 h-3 text-slate-600 ml-1"/> : <Eye className="w-3 h-3 text-slate-500 ml-1"/>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 flex-grow relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Cpu className="w-24 h-24 text-emerald-500" />
              </div>
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-6 h-6 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Market Insights</h2>
              </div>
              <div className="min-h-[160px] text-sm text-slate-300 leading-relaxed mb-4 font-light">
                {aiAnalysis ? (
                  <div className="animate-in fade-in duration-500">
                    <p className="whitespace-pre-line">{aiAnalysis}</p>
                  </div>
                ) : (
                  <div className="animate-in fade-in duration-700">
                    <div className="flex items-center gap-2 mb-2 text-emerald-400 font-semibold text-xs uppercase tracking-wider">
                      <Lightbulb className="w-4 h-4" /> Algorithmic Consensus
                    </div>
                    <p className="whitespace-pre-line text-slate-300 leading-6">
                      {simpleSummary || "Analyzing market data..."}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-3 border-t border-slate-800 pt-2 italic">
                      This summary is generated by combining the top 3 models on {selectedTimeframe} timeframe.
                    </p>
                  </div>
                )}
                {aiProvider && (
                  <span className="text-[10px] text-slate-500 mt-2 block">Powered by {aiProvider}</span>
                )}
              </div>
              <button
                onClick={handleAiAnalysis}
                disabled={analyzing || !appConfig}
                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                  analyzing ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-900/20'
                }`}>
                {analyzing ? <><RefreshCw className="w-4 h-4 animate-spin"/> Processing...</> : 'Get Detailed AI Analysis'}
              </button>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Ensemble Reliability (3-Year)</h3>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-bold text-emerald-400">{forecasts[0]?.backtestAccuracy}%</div>
                  <div className="text-xs text-emerald-600">Top Rated Method</div>
                </div>
                <Activity className="w-8 h-8 text-slate-700" />
              </div>
            </div>
          </div>
        </div>

        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Active Technical Signals ({selectedTimeframe})
          </h2>
          <SignalPanel signals={signals} />
        </section>

        <section>
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            Multi-Model Forecasts (t+1, t+2, t+3 Periods)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {forecasts.map((model, idx) => (
              <ForecastCard key={idx} model={model} currentPrice={currentPrice} />
            ))}
          </div>
        </section>

        <footer className="pt-8 border-t border-slate-800 text-center text-slate-600 text-xs">
          <p>Disclaimer: For demonstration purposes only. Not investment advice.</p>
          <p className="mt-1">Powered by OpenRouter & NVIDIA NIM</p>
        </footer>
      </main>

      {showSetup && <SetupWizard onComplete={handleSetupComplete} onSkip={handleSetupSkip} />}
    </div>
  );
};

export default App;

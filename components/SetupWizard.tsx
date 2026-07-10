import React, { useState } from "react";
import { ForexFlowConfig, DiscoveredModel, ProviderType } from "../types";
import { getDefaultConfig, loadConfig, saveConfig, exportConfigFile, importConfigFile, hasAnyApiKey } from "../services/configService";
import { fetchOpenRouterFreeModels, fetchNvidiaModels } from "../services/providerDiscovery";
import {
  Key, Globe, Cpu, Save, Download, Upload, Trash2,
  ChevronRight, ChevronLeft, Check, X, RefreshCw, AlertTriangle,
  Zap, Server, Bot, Eye, EyeOff
} from "lucide-react";

interface SetupWizardProps {
  onComplete: (config: ForexFlowConfig) => void;
  onSkip: () => void;
}

type Step = "welcome" | "openrouter_key" | "openrouter_select" | "nvidia_key" | "nvidia_select" | "confirm";

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState<Step>("welcome");
  const [config, setConfig] = useState<ForexFlowConfig>(() => loadConfig() || getDefaultConfig());
  const [openRouterModels, setOpenRouterModels] = useState<DiscoveredModel[]>([]);
  const [nvidiaModels, setNvidiaModels] = useState<DiscoveredModel[]>([]);
  const [discoveringOpenRouter, setDiscoveringOpenRouter] = useState(false);
  const [discoveringNvidia, setDiscoveringNvidia] = useState(false);
  const [discoveryError, setDiscoveryError] = useState("");
  const [importError, setImportError] = useState("");
  const [showKey, setShowKey] = useState(false);

  const nextStep = () => {
    setStep(prev => {
      if (prev === "welcome") return "openrouter_key";
      if (prev === "openrouter_key") return "openrouter_select";
      if (prev === "openrouter_select") return "nvidia_key";
      if (prev === "nvidia_key") return config.api_keys.nvidia ? "nvidia_select" : "confirm";
      if (prev === "nvidia_select") return "confirm";
      return prev;
    });
  };

  const prevStep = () => {
    setStep(prev => {
      if (prev === "openrouter_key") return "welcome";
      if (prev === "openrouter_select") return "openrouter_key";
      if (prev === "nvidia_key") return "openrouter_select";
      if (prev === "nvidia_select") return "nvidia_key";
      if (prev === "confirm") return config.api_keys.nvidia ? "nvidia_select" : "nvidia_key";
      return prev;
    });
  };

  const updateApiKey = (provider: ProviderType, value: string) => {
    setConfig(prev => ({ ...prev, api_keys: { ...prev.api_keys, [provider]: value } }));
  };

  const handleDiscoverOpenRouter = async () => {
    setDiscoveringOpenRouter(true);
    setDiscoveryError("");
    try {
      const models = await fetchOpenRouterFreeModels();
      setOpenRouterModels(models);
      if (models.length === 0) setDiscoveryError("Nessun modello free trovato. Controlla la connessione.");
    } catch (e: any) {
      setDiscoveryError(e.message);
    } finally {
      setDiscoveringOpenRouter(false);
    }
  };

  const handleDiscoverNvidia = async () => {
    if (!config.api_keys.nvidia) return;
    setDiscoveringNvidia(true);
    setDiscoveryError("");
    try {
      const models = await fetchNvidiaModels(config.api_keys.nvidia);
      setNvidiaModels(models);
      if (models.length === 0) setDiscoveryError("Nessun modello trovato. Verifica la API key.");
    } catch (e: any) {
      setDiscoveryError(e.message);
    } finally {
      setDiscoveringNvidia(false);
    }
  };

  const selectOpenRouterModel = (modelId: string) => {
    setConfig(prev => ({
      ...prev,
      active_provider: { provider: "openrouter", model: modelId },
      provider_models: {
        ...prev.provider_models,
        openrouter: prev.provider_models.openrouter.includes(modelId)
          ? prev.provider_models.openrouter
          : [...prev.provider_models.openrouter, modelId],
      },
    }));
  };

  const selectNvidiaModel = (modelId: string) => {
    setConfig(prev => ({
      ...prev,
      active_provider: { provider: "nvidia", model: modelId },
      provider_models: {
        ...prev.provider_models,
        nvidia: prev.provider_models.nvidia.includes(modelId)
          ? prev.provider_models.nvidia
          : [...prev.provider_models.nvidia, modelId],
      },
    }));
  };

  const handleComplete = () => {
    const finalConfig: ForexFlowConfig = { ...config, setup_completed: true };
    saveConfig(finalConfig);
    onComplete(finalConfig);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const imported = await importConfigFile(file);
      if (imported) { saveConfig(imported); setConfig(imported); setStep("confirm"); }
    } catch (err: any) {
      setImportError(err.message || "File non valido");
    }
  };

  const handleReset = () => {
    if (confirm("Resettare tutta la configurazione?")) {
      const fresh = getDefaultConfig();
      setConfig(fresh);
      saveConfig(fresh);
      setOpenRouterModels([]);
      setNvidiaModels([]);
      setStep("welcome");
    }
  };

  const skipNvidia = () => {
    setStep("confirm");
  };

  const steps: Step[] = ["welcome", "openrouter_key", "openrouter_select", "nvidia_key", "nvidia_select", "confirm"];
  const stepIdx = steps.indexOf(step);

  // --- Render: Welcome ---
  const renderWelcome = () => (
    <div className="flex flex-col items-center text-center gap-4">
      <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
        <Zap className="w-12 h-12 text-emerald-400" />
      </div>
      <h1 className="text-2xl font-bold text-white">Benvenuto in ForexFlow AI</h1>
      <p className="text-slate-400 max-w-md">
        Configuriamo i provider AI. Ti servono le API key di OpenRouter e NVIDIA NIM.
      </p>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 max-w-md text-left space-y-2">
        <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
          <li><strong className="text-purple-400">OpenRouter</strong> — 26+ modelli free (Llama, Gemma, Nemotron...)</li>
          <li><strong className="text-green-400">NVIDIA NIM</strong> — tier gratuito di sviluppo</li>
        </ul>
        <p className="text-xs text-slate-500 italic">Funziona anche con un solo provider.</p>
      </div>
      <label className="cursor-pointer px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2">
        <Upload className="w-4 h-4" /> Importa .cfg
        <input type="file" accept=".cfg,.toml" onChange={handleImportFile} className="hidden" />
      </label>
      {importError && <p className="text-rose-400 text-xs">{importError}</p>}
    </div>
  );

  // --- Render: OpenRouter API Key ---
  const renderOpenRouterKey = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
          <Globe className="w-5 h-5 text-purple-400" />
          OpenRouter API Key
        </h2>
        <p className="text-slate-400 text-sm mt-1">Inserisci la tua API key OpenRouter.</p>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-semibold text-sm">OpenRouter</span>
          <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300">
            Ottieni API Key ↗
          </a>
        </div>
        <p className="text-xs text-slate-500 mb-3">Accesso unificato a centinaia di modelli. Molti sono gratuiti!</p>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={config.api_keys.openrouter}
            onChange={(e) => updateApiKey("openrouter", e.target.value)}
            placeholder="sk-or-v1-..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-purple-500 outline-none pr-10 font-mono"
          />
          <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  // --- Render: OpenRouter Model Select ---
  const renderOpenRouterSelect = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
          <Server className="w-5 h-5 text-purple-400" />
          Scegli il modello OpenRouter
        </h2>
        <p className="text-slate-400 text-sm mt-1">Questo sarà il tuo provider AI predefinito.</p>
      </div>

      {discoveringOpenRouter ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
          <p className="text-slate-400 text-sm">Recupero modelli free in corso...</p>
        </div>
      ) : openRouterModels.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {openRouterModels.slice(0, 24).map(m => {
            const isSelected = config.active_provider.provider === "openrouter" && config.active_provider.model === m.id;
            return (
              <button
                key={m.id}
                onClick={() => selectOpenRouterModel(m.id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                  isSelected
                    ? "bg-purple-500/10 border-purple-500/30 text-purple-300"
                    : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                {isSelected ? <Check className="w-4 h-4 text-purple-400 shrink-0" /> : <div className="w-4 h-4 shrink-0" />}
                <div className="min-w-0">
                  <div className="text-sm truncate">{m.name}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{m.id}</div>
                </div>
                {m.contextLength && (
                  <span className="text-[10px] text-slate-600 ml-auto shrink-0">
                    {m.contextLength >= 1000 ? `${(m.contextLength / 1000).toFixed(0)}K` : m.contextLength}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-slate-400 text-sm mb-3">Clicca il pulsante per cercare i modelli free disponibili.</p>
        </div>
      )}

      <button
        onClick={handleDiscoverOpenRouter}
        disabled={discoveringOpenRouter}
        className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg disabled:opacity-40"
      >
        {discoveringOpenRouter ? <><RefreshCw className="w-4 h-4 animate-spin" /> Ricerca...</> : <><Server className="w-4 h-4" /> Scopri Modelli Free</>}
      </button>
      {discoveryError && <p className="text-rose-400 text-xs">{discoveryError}</p>}
    </div>
  );

  // --- Render: NVIDIA API Key ---
  const renderNvidiaKey = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
          <Cpu className="w-5 h-5 text-green-400" />
          NVIDIA NIM API Key
        </h2>
        <p className="text-slate-400 text-sm mt-1">Opzionale. Lascia vuoto per saltare.</p>
      </div>
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white font-semibold text-sm">NVIDIA NIM</span>
          <a href="https://build.nvidia.com/" target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-400 hover:text-blue-300">
            Ottieni API Key ↗
          </a>
        </div>
        <p className="text-xs text-slate-500 mb-3">Tier gratuito di sviluppo. Richiede CORS proxy nel browser.</p>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={config.api_keys.nvidia}
            onChange={(e) => updateApiKey("nvidia", e.target.value)}
            placeholder="nvapi-..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-green-500 outline-none pr-10 font-mono"
          />
          <button onClick={() => setShowKey(!showKey)} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
            {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {!config.api_keys.nvidia && (
        <button onClick={skipNvidia} className="w-full py-2 text-sm text-slate-500 hover:text-slate-300">
          Salta NVIDIA NIM →
        </button>
      )}
    </div>
  );

  // --- Render: NVIDIA Model Select ---
  const renderNvidiaSelect = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
          <Cpu className="w-5 h-5 text-green-400" />
          Scegli il modello NVIDIA
        </h2>
        <p className="text-slate-400 text-sm mt-1">Modello di fallback o alternativo.</p>
      </div>

      {discoveringNvidia ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <RefreshCw className="w-10 h-10 text-green-400 animate-spin" />
          <p className="text-slate-400 text-sm">Recupero modelli in corso...</p>
        </div>
      ) : nvidiaModels.length > 0 ? (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {nvidiaModels.slice(0, 24).map(m => {
            const isSelected = config.active_provider.provider === "nvidia" && config.active_provider.model === m.id;
            return (
              <button
                key={m.id}
                onClick={() => selectNvidiaModel(m.id)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${
                  isSelected
                    ? "bg-green-500/10 border-green-500/30 text-green-300"
                    : "bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                {isSelected ? <Check className="w-4 h-4 text-green-400 shrink-0" /> : <div className="w-4 h-4 shrink-0" />}
                <div className="min-w-0">
                  <div className="text-sm font-mono truncate">{m.id.split("/").pop()}</div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{m.id}</div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-slate-400 text-sm mb-3">Clicca per cercare i modelli disponibili.</p>
        </div>
      )}

      <button
        onClick={handleDiscoverNvidia}
        disabled={discoveringNvidia}
        className="w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg disabled:opacity-40"
      >
        {discoveringNvidia ? <><RefreshCw className="w-4 h-4 animate-spin" /> Ricerca...</> : <><Server className="w-4 h-4" /> Scopri Modelli NVIDIA</>}
      </button>
      {discoveryError && <p className="text-rose-400 text-xs">{discoveryError}</p>}
    </div>
  );

  // --- Render: Confirm ---
  const renderConfirm = () => (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
          <Check className="w-5 h-5 text-emerald-400" />
          Riepilogo
        </h2>
      </div>

      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-slate-300">OpenRouter</span>
          {config.api_keys.openrouter
            ? <span className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3 h-3" /> Configurato</span>
            : <span className="text-rose-400 text-xs">Mancante</span>}
        </div>
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-green-400" />
          <span className="text-sm text-slate-300">NVIDIA NIM</span>
          {config.api_keys.nvidia
            ? <span className="text-emerald-400 text-xs flex items-center gap-1"><Check className="w-3 h-3" /> Configurato</span>
            : <span className="text-slate-600 text-xs">Non configurato</span>}
        </div>
        <div className="border-t border-slate-700 pt-2">
          <span className="text-xs text-slate-500">Provider attivo: </span>
          <span className={`text-xs font-bold ${config.active_provider.provider === "openrouter" ? "text-purple-400" : "text-green-400"}`}>
            {config.active_provider.provider.toUpperCase()}
          </span>
          <span className="text-xs text-slate-500"> — </span>
          <span className="text-xs text-slate-300 font-mono">{config.active_provider.model}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => exportConfigFile(config)} className="flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700">
          <Download className="w-4 h-4" /> Esporta .cfg
        </button>
        <button onClick={handleReset} className="py-3 px-4 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  // --- Footer ---
  const renderFooter = () => (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800">
      <div>
        {step !== "welcome" && (
          <button onClick={prevStep} className="flex items-center gap-1 text-sm text-slate-400 hover:text-white">
            <ChevronLeft className="w-4 h-4" /> Indietro
          </button>
        )}
      </div>
      <div className="flex items-center gap-3">
        {step === "welcome" && (
          <button onClick={() => {
            const dc = getDefaultConfig();
            if (hasAnyApiKey(dc)) { saveConfig({ ...dc, setup_completed: true }); onComplete({ ...dc, setup_completed: true }); }
            else onSkip();
          }} className="text-sm text-slate-500 hover:text-slate-300">
            Salta
          </button>
        )}
        {step === "confirm" ? (
          <button onClick={handleComplete} disabled={!config.api_keys.openrouter && !config.api_keys.nvidia}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg disabled:opacity-40">
            <Save className="w-4 h-4" /> Salva e Inizia
          </button>
        ) : (
          <button onClick={nextStep} disabled={step === "openrouter_key" && !config.api_keys.openrouter}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg disabled:opacity-40">
            Avanti <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6 md:p-8">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 mb-8">
            {["welcome", "openrouter_key", "openrouter_select", "nvidia_key", "nvidia_select", "confirm"].map((s, i) => {
              const isActive = step === s;
              const isDone = stepIdx > i;
              const hidden = s === "nvidia_select" && !config.api_keys.nvidia;
              if (hidden) return null;
              return (
                <React.Fragment key={s}>
                  {i > 0 && <div className={`w-6 h-0.5 ${isDone ? "bg-emerald-500" : "bg-slate-700"}`} />}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    isActive ? "bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-500/30" :
                    isDone ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-800 text-slate-500"
                  }`}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {step === "welcome" && renderWelcome()}
          {step === "openrouter_key" && renderOpenRouterKey()}
          {step === "openrouter_select" && renderOpenRouterSelect()}
          {step === "nvidia_key" && renderNvidiaKey()}
          {step === "nvidia_select" && renderNvidiaSelect()}
          {step === "confirm" && renderConfirm()}

          {renderFooter()}
        </div>
      </div>
    </div>
  );
};

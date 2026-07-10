# 🏗️ Blueprint: Sistema LLM a Cascata — ForexFlow AI

> Documento di implementazione pronto per domani.

---

## Obiettivo

Sostituire l'attuale integrazione singola con Gemini (`geminiService.ts`) con un sistema a cascata: se un provider fallisce (timeout, rate limit, errore di rete), il sistema passa automaticamente al provider successivo.

---

## Architettura finale

```
App.tsx
  │
  ▼
cascadeAnalysis(report, providers)    ← NUOVO orchestratore
  │
  ├─► Gemini Flash (15s timeout)    ──❌ timeout
  ├─► GPT-4o-mini (20s timeout)     ──❌ rate limit
  └─► Claude Haiku (20s timeout)    ──✅ risposta
```

---

## Struttura file (nuova)

```
services/
  geminiService.ts          → RINOMINARE in providers/gemini.ts
  promptBuilder.ts          → NUOVO: costruzione prompt condiviso
  llmProvider.ts            → NUOVO: interfaccia comune LLMProvider
  llmCascade.ts             → NUOVO: orchestratore a cascata
  providers/
    gemini.ts               → (da geminiService.ts rifattorizzato)
    openai.ts               → NUOVO: provider OpenAI
    claude.ts               → NUOVO: provider Claude (opzionale)
```

---

## 1. `services/llmProvider.ts` — Interfaccia comune

```ts
// services/llmProvider.ts
import { AnalysisReport } from "../types";

export interface LLMProviderConfig {
  name: string;           // es. "Gemini Flash", "GPT-4o-mini"
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export interface LLMProvider {
  config: LLMProviderConfig;
  analyze(report: AnalysisReport): Promise<string>;
}
```

---

## 2. `services/promptBuilder.ts` — Prompt condiviso

Estratto da `geminiService.ts`, uguale per tutti i provider.

```ts
// services/promptBuilder.ts
import { AnalysisReport } from "../types";

export const buildAnalysisPrompt = (report: AnalysisReport): string => {
  const timeframeMap: Record<string, string> = {
    '15m': '15 Minuti (Intraday Scalping)',
    '1h':  '1 Ora (Intraday)',
    '1d':  'Giornaliero (Swing Trading)',
    '1w':  'Settimanale (Trend Lungo)',
    '1mo': 'Mensile (Macro Trend)'
  };

  const tfLabel = timeframeMap[report.timeframe] || report.timeframe;

  return `
    Agisci come un analista tecnico Forex senior spiegando la situazione a un trader. 
    Analizza la coppia EUR/USD sul time frame: ${tfLabel}.
    
    Dati:
    - Prezzo Attuale: ${report.currentPrice.toFixed(5)}
    - Segnali Tecnici:
    ${report.signals.map(s => `- ${s.name}: ${s.value} (${s.signal})`).join('\n')}
    
    Previsioni Algoritmiche (3 periodi avanti):
    ${report.forecasts.slice(0, 5).map(f => `- ${f.modelName} (Acc: ${f.backtestAccuracy}%): Target Finale ${f.forecasts[2].price.toFixed(5)} (Prob: ${f.forecasts[2].probability}%)`).join('\n')}
    
    Nota: Il modello "Ensemble" è la media ponderata e il più affidabile.
    
    Compito:
    1. **Verdetto Semplice**: "COMPRA", "VENDI" o "ATTENDI" per il time frame ${tfLabel}.
    2. **Riepilogo Chiaro**: Cosa prevede il modello Ensemble per i prossimi 3 periodi.
    3. **Analisi Tecnica**: Commenta 1-2 indicatori chiave rilevanti per questo timeframe.
    4. **Livelli**: Identifica probabili supporti/resistenze basati sul prezzo.
    
    Rispondi esclusivamente in ITALIANO. Tono professionale ma chiaro. Massimo 180 parole.
  `;
};
```

---

## 3. `services/providers/gemini.ts` — Provider Gemini

Rifattorizzato da `geminiService.ts` attuale.

```ts
// services/providers/gemini.ts
import { GoogleGenAI } from "@google/genai";
import { AnalysisReport } from "../../types";
import { LLMProvider, LLMProviderConfig } from "../llmProvider";
import { buildAnalysisPrompt } from "../promptBuilder";

export class GeminiProvider implements LLMProvider {
  constructor(public config: LLMProviderConfig) {}

  async analyze(report: AnalysisReport): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: this.config.apiKey });

    const response = await ai.models.generateContent({
      model: this.config.model,
      contents: buildAnalysisPrompt(report),
    });

    if (!response.text) {
      throw new Error("Gemini: risposta vuota");
    }

    return response.text;
  }
}
```

---

## 4. `services/providers/openai.ts` — Provider OpenAI

```ts
// services/providers/openai.ts
import OpenAI from "openai";
import { AnalysisReport } from "../../types";
import { LLMProvider, LLMProviderConfig } from "../llmProvider";
import { buildAnalysisPrompt } from "../promptBuilder";

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(public config: LLMProviderConfig) {
    this.client = new OpenAI({
      apiKey: this.config.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async analyze(report: AnalysisReport): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [{ role: "user", content: buildAnalysisPrompt(report) }],
    });

    const text = response.choices[0]?.message?.content;

    if (!text) {
      throw new Error("OpenAI: risposta vuota");
    }

    return text;
  }
}
```

---

## 5. `services/providers/claude.ts` — Provider Claude (opzionale)

```ts
// services/providers/claude.ts
import Anthropic from "@anthropic-ai/sdk";
import { AnalysisReport } from "../../types";
import { LLMProvider, LLMProviderConfig } from "../llmProvider";
import { buildAnalysisPrompt } from "../promptBuilder";

export class ClaudeProvider implements LLMProvider {
  private client: Anthropic;

  constructor(public config: LLMProviderConfig) {
    this.client = new Anthropic({ apiKey: this.config.apiKey });
  }

  async analyze(report: AnalysisReport): Promise<string> {
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: 500,
      messages: [{ role: "user", content: buildAnalysisPrompt(report) }],
    });

    const text = response.content
      .filter(block => block.type === "text")
      .map(block => (block as any).text)
      .join("\n");

    if (!text) {
      throw new Error("Claude: risposta vuota");
    }

    return text;
  }
}
```

---

## 6. `services/llmCascade.ts` — Orchestratore a cascata

Questo è il cuore del sistema.

```ts
// services/llmCascade.ts
import { AnalysisReport } from "../types";
import { LLMProvider } from "./llmProvider";

// Tipi di errore che NON devono triggerare il fallback
const FATAL_ERROR_PATTERNS = [
  "401",
  "403",
  "INVALID_API_KEY",
  "invalid api key",
  "authentication",
  "billing",
  "quota exceeded",
];

function isFatalError(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return FATAL_ERROR_PATTERNS.some(pattern => lower.includes(pattern.toLowerCase()));
}

export interface CascadeResult {
  text: string;
  usedProvider: string;
}

export interface CascadeError {
  provider: string;
  error: string;
  fatal: boolean;
}

export class LLMCascadeError extends Error {
  constructor(
    message: string,
    public errors: CascadeError[]
  ) {
    super(message);
    this.name = "LLMCascadeError";
  }
}

/**
 * Prova i provider in sequenza. Se uno fallisce con errore recuperabile,
 * passa al successivo. Se fallisce con errore fatale (es. API key invalida),
 * interrompe immediatamente.
 */
export const cascadeAnalysis = async (
  report: AnalysisReport,
  providers: LLMProvider[]
): Promise<CascadeResult> => {
  const errors: CascadeError[] = [];

  for (const provider of providers) {
    try {
      const result = await Promise.race([
        provider.analyze(report),
        new Promise<string>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Timeout dopo ${provider.config.timeoutMs}ms`)),
            provider.config.timeoutMs
          )
        ),
      ]);

      return {
        text: result,
        usedProvider: provider.config.name,
      };
    } catch (err: any) {
      const errorMessage = err?.message || String(err);
      const fatal = isFatalError(errorMessage);

      errors.push({
        provider: provider.config.name,
        error: errorMessage,
        fatal,
      });

      // Errore fatale → non ha senso provare altri provider
      if (fatal) {
        throw new LLMCascadeError(
          `Provider ${provider.config.name}: errore fatale — ${errorMessage}`,
          errors
        );
      }

      // Errore recuperabile (timeout, rete, rate limit) → prossimo provider
      console.warn(`[LLM Cascade] ${provider.config.name} fallito: ${errorMessage}. Prossimo...`);
      continue;
    }
  }

  // Tutti i provider hanno fallito
  throw new LLMCascadeError(
    "Tutti i provider LLM hanno fallito",
    errors
  );
};
```

---

## 7. `services/llmCascade.ts` (continuazione) — Configurazione catena

Nello stesso file, definisci la catena di provider:

```ts
// services/llmCascade.ts (in fondo)
import { GeminiProvider } from "./providers/gemini";
import { OpenAIProvider } from "./providers/openai";
// import { ClaudeProvider } from "./providers/claude";

/**
 * Catena di provider in ordine di priorità.
 * Un provider viene incluso solo se la sua API key è configurata.
 */
function buildProviderChain(): LLMProvider[] {
  const chain: LLMProvider[] = [];

  // 1. Gemini (primario)
  if (process.env.GEMINI_API_KEY) {
    chain.push(new GeminiProvider({
      name: "Gemini Flash",
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-3-flash-preview",
      timeoutMs: 15000,
    }));
  }

  // 2. OpenAI (fallback 1)
  if (process.env.OPENAI_API_KEY) {
    chain.push(new OpenAIProvider({
      name: "GPT-4o-mini",
      apiKey: process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
      timeoutMs: 20000,
    }));
  }

  // 3. Claude (fallback 2 — decommentare dopo installazione SDK)
  // if (process.env.CLAUDE_API_KEY) {
  //   chain.push(new ClaudeProvider({
  //     name: "Claude Haiku",
  //     apiKey: process.env.CLAUDE_API_KEY,
  //     model: "claude-3-haiku-20240307",
  //     timeoutMs: 20000,
  //   }));
  // }

  return chain;
}

// Catena pre-costruita (immutabile)
export const PROVIDER_CHAIN = buildProviderChain();

/**
 * Funzione di convenienza: usa la catena predefinita.
 * Questa è la funzione da chiamare da App.tsx.
 */
export const getMarketAnalysis = async (report: AnalysisReport): Promise<CascadeResult> => {
  return cascadeAnalysis(report, PROVIDER_CHAIN);
};
```

---

## 8. Modifiche a `App.tsx`

### Prima (attuale):

```ts
import { getMarketAnalysis } from './services/geminiService';

// ...

const text = await getMarketAnalysis(report);
setAiAnalysis(text);
```

### Dopo:

```ts
import { getMarketAnalysis } from './services/llmCascade';

// ...

try {
  const { text, usedProvider } = await getMarketAnalysis(report);
  setAiAnalysis(text);
  console.log(`[LLM] Analisi generata da: ${usedProvider}`);
} catch (err) {
  if (err instanceof LLMCascadeError) {
    console.error("Tutti i provider falliti:", err.errors);
    setAiAnalysis("⚠️ Analisi AI non disponibile. Errore: " + err.message);
  }
}
```

### Opzionale: mostrare il provider nella UI

```tsx
// Aggiungere uno stato
const [aiProvider, setAiProvider] = useState<string>("");

// Nella handleAiAnalysis:
const { text, usedProvider } = await getMarketAnalysis(report);
setAiAnalysis(text);
setAiProvider(usedProvider);

// Nella card Market Insights, sotto il testo:
{aiProvider && (
  <span className="text-[10px] text-slate-500 mt-2">
    Powered by {aiProvider}
  </span>
)}
```

---

## 9. Modifiche a `vite.config.ts`

Aggiungere le nuove variabili d'ambiente:

```ts
// vite.config.ts
define: {
  'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
  'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),   // NUOVO
  'process.env.CLAUDE_API_KEY': JSON.stringify(env.CLAUDE_API_KEY),   // NUOVO (opzionale)
}
```

---

## 10. Nuove dipendenze (`package.json`)

```bash
npm install openai
# opzionale:
# npm install @anthropic-ai/sdk
```

`@google/genai` rimane (per il provider Gemini).

---

## 11. File `.env`

```
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
# CLAUDE_API_KEY=your_key_here   (opzionale)
```

---

## Checklist implementazione

- [ ] 1. Creare cartella `services/providers/`
- [ ] 2. Creare `services/llmProvider.ts` (interfaccia)
- [ ] 3. Creare `services/promptBuilder.ts` (prompt condiviso)
- [ ] 4. Rinominare `services/geminiService.ts` → `services/providers/gemini.ts` e rifattorizzare
- [ ] 5. Creare `services/providers/openai.ts`
- [ ] 6. (Opzionale) Creare `services/providers/claude.ts`
- [ ] 7. Creare `services/llmCascade.ts` (orchestratore + config + export getMarketAnalysis)
- [ ] 8. Aggiornare `App.tsx` (import + chiamata + gestione errori)
- [ ] 9. Aggiornare `vite.config.ts` (nuove env vars)
- [ ] 10. `npm install openai`
- [ ] 11. `npx tsc --noEmit` — verificare zero errori TypeScript
- [ ] 12. `npm run dev` — testare l'app nel browser

---

## Comportamento a runtime

| Scenario | Risultato |
|---|---|
| Gemini risponde OK | ✅ Risultato, `usedProvider = "Gemini Flash"` |
| Gemini timeout 15s | ⏭️ Passa a OpenAI automaticamente |
| OpenAI timeout 20s | ⏭️ Passa a Claude (se configurato) |
| API key invalida (401) | 🛑 **Stop immediato**, non casca |
| Tutti falliscono | ❌ `LLMCascadeError` → UI mostra errore |
| Nessuna API key configurata | ❌ `getMarketAnalysis` non chiamabile, il pulsante AI dà errore |

---

## Vantaggi del design

- **1 solo file da importare** in `App.tsx`: `llmCascade.ts`
- **Aggiungere un provider** = 1 file in `providers/` + 1 riga in `buildProviderChain()`
- **Cambiare priorità** = riordinare `buildProviderChain()`
- **Prompt condiviso** in `promptBuilder.ts` → una modifica vale per tutti
- **Timeout per provider** evita blocchi infiniti
- **API key opzionali** → provider incluso solo se chiave presente
- **Errori fatali vs recuperabili** → non si casca su errori di autenticazione

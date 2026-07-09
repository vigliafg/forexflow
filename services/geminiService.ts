import { GoogleGenAI } from "@google/genai";
import { AnalysisReport } from "../types";

export const getMarketAnalysis = async (report: AnalysisReport): Promise<string> => {
  if (!process.env.API_KEY) {
    console.error("API Key not found");
    return "Errore: API Key mancante. Assicurati che process.env.API_KEY sia impostato.";
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Map timeframe to readable string
  const timeframeMap: Record<string, string> = {
      '15m': '15 Minuti (Intraday Scalping)',
      '1h': '1 Ora (Intraday)',
      '1d': 'Giornaliero (Swing Trading)',
      '1w': 'Settimanale (Trend Lungo)',
      '1mo': 'Mensile (Macro Trend)'
  };
  
  const tfLabel = timeframeMap[report.timeframe] || report.timeframe;

  // Construct a prompt in Italian based on the technical data and timeframe
  const prompt = `
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    return response.text || "Impossibile generare l'analisi al momento.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Errore di connessione al servizio di analisi AI.";
  }
};
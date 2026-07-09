import React from 'react';
import { ForecastModelResult } from '../types';
import { Activity, Zap, ArrowRight } from 'lucide-react';

interface ForecastCardProps {
  model: ForecastModelResult;
  currentPrice: number;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ model, currentPrice }) => {
  // Determine styling based on accuracy
  const isHighAccuracy = model.backtestAccuracy >= 75;
  const isMediumAccuracy = model.backtestAccuracy >= 60 && model.backtestAccuracy < 75;

  let accuracyColor = 'text-slate-400';
  let borderColor = 'border-slate-700';
  let bgColor = 'bg-slate-800/50';

  if (isHighAccuracy) {
    accuracyColor = 'text-emerald-400';
    borderColor = 'border-emerald-500/30';
    bgColor = 'bg-emerald-500/10';
  } else if (isMediumAccuracy) {
    accuracyColor = 'text-amber-400';
    borderColor = 'border-amber-500/30';
    bgColor = 'bg-amber-500/10';
  }

  // Threshold for significant movement (3 pips = 0.0003 for EURUSD)
  const PIP_THRESHOLD = 0.0003;
  
  // Check if any period has high volatility for the card header badge
  const hasHighVolatility = model.forecasts.some((pt, idx) => {
      const prevPrice = idx === 0 ? currentPrice : model.forecasts[idx - 1].price;
      return Math.abs(pt.price - prevPrice) >= PIP_THRESHOLD;
  });

  return (
    <div className={`bg-slate-900 border rounded-xl p-4 flex flex-col h-full hover:border-slate-500 transition-all relative overflow-hidden group ${hasHighVolatility ? 'shadow-[0_0_15px_rgba(245,158,11,0.1)]' : ''} ${borderColor}`}>
      
      {/* Header & Prominent Accuracy Badge */}
      <div className="flex flex-col gap-3 mb-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ 
                    backgroundColor: model.color, 
                    boxShadow: `0 0 8px ${model.color}` 
                  }}
                ></div>
                <h3 className="font-bold text-slate-100 text-sm leading-tight">{model.modelName}</h3>
            </div>
            {hasHighVolatility && (
                <div className="flex items-center gap-1 bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase animate-pulse border border-amber-500/30">
                    <Zap className="w-3 h-3" />
                    Volatile
                </div>
            )}
        </div>

        {/* Full-width accuracy badge */}
        <div className={`flex items-center justify-between px-3 py-2 rounded-lg border ${borderColor} ${bgColor}`}>
            <div className="flex items-center gap-2">
                <Activity className={`w-3.5 h-3.5 ${accuracyColor}`} />
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">3yr Backtest</span>
            </div>
            <span className={`font-mono font-bold text-sm ${accuracyColor}`}>
                {model.backtestAccuracy}%
            </span>
        </div>
      </div>
      
      {/* Methodology Description */}
      <p className="text-[10px] text-slate-400 mb-4 h-8 overflow-hidden leading-tight opacity-80 border-b border-slate-800 pb-2">
        {model.methodology}
      </p>
      
      {/* Forecast Points */}
      <div className="space-y-3 flex-grow">
        {model.forecasts.map((pt, idx) => {
          // Calculate deviation from previous step (or current price for first step)
          const prevPrice = idx === 0 ? currentPrice : model.forecasts[idx - 1].price;
          const diff = pt.price - prevPrice;
          const absDiff = Math.abs(diff);
          const isSignificant = absDiff >= PIP_THRESHOLD;
          const pips = (diff * 10000).toFixed(1);

          return (
            <div key={pt.period} className={`grid grid-cols-1 gap-1 pt-2 pb-2 px-2 -mx-2 rounded transition-colors ${isSignificant ? 'bg-amber-900/20 border border-amber-500/30' : 'first:pt-0'}`}>
                {/* Time & Price Label */}
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-300 bg-slate-800/50 px-1.5 rounded">T+{pt.period}</span>
                        {isSignificant && (
                             <span className={`text-[9px] font-mono flex items-center ${diff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {diff > 0 ? '+' : ''}{pips} pips
                                <Zap className="w-3 h-3 ml-1 fill-current" />
                             </span>
                        )}
                    </div>
                    <span className={`font-mono font-bold text-base ${isSignificant ? 'text-white' : ''}`} style={{ color: isSignificant ? undefined : model.color }}>
                        {pt.price.toFixed(5)}
                    </span>
                </div>

                {/* Range and Probability Details */}
                <div className={`grid grid-cols-2 gap-2 p-2 rounded border ${isSignificant ? 'bg-slate-900/80 border-amber-500/20' : 'bg-slate-950/30 border-slate-800/50'}`}>
                    {/* Range Column */}
                    <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Range</span>
                        <div className="flex flex-col leading-none gap-0.5">
                            <span className="text-[10px] text-slate-400 font-mono tracking-tight whitespace-nowrap">
                                L: {pt.rangeLow.toFixed(5)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-tight whitespace-nowrap">
                                H: {pt.rangeHigh.toFixed(5)}
                            </span>
                        </div>
                    </div>

                    {/* Probability Column */}
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Prob.</span>
                        <div className="flex items-center gap-1.5 w-full justify-end">
                            <span className={`text-[10px] font-bold ${pt.probability > 75 ? 'text-emerald-400' : pt.probability > 50 ? 'text-amber-400' : 'text-slate-500'}`}>
                                {Math.round(pt.probability)}%
                            </span>
                            <div className="h-1.5 w-10 bg-slate-800 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${pt.probability > 75 ? 'bg-emerald-500' : pt.probability > 50 ? 'bg-amber-500' : 'bg-slate-600'}`} 
                                    style={{ width: `${pt.probability}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
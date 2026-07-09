import React from 'react';
import { TechnicalSignal, Trend } from '../types';
import { ArrowUpCircle, ArrowDownCircle, MinusCircle } from 'lucide-react';

interface SignalPanelProps {
  signals: TechnicalSignal[];
}

export const SignalPanel: React.FC<SignalPanelProps> = ({ signals }) => {
  const getIcon = (trend: Trend) => {
    switch (trend) {
      case Trend.BULLISH: return <ArrowUpCircle className="w-5 h-5 text-emerald-400" />;
      case Trend.BEARISH: return <ArrowDownCircle className="w-5 h-5 text-rose-400" />;
      default: return <MinusCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getColor = (trend: Trend) => {
    switch (trend) {
      case Trend.BULLISH: return "border-emerald-500/30 bg-emerald-500/10";
      case Trend.BEARISH: return "border-rose-500/30 bg-rose-500/10";
      default: return "border-slate-700 bg-slate-800/50";
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {signals.map((sig, idx) => (
        <div key={idx} className={`p-3 rounded-lg border ${getColor(sig.signal)} backdrop-blur-sm transition-all hover:scale-105`}>
          <div className="flex justify-between items-start mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{sig.name}</span>
            {getIcon(sig.signal)}
          </div>
          <div className="text-lg font-bold text-white font-mono">{sig.value}</div>
          <div className="text-[10px] text-slate-400 mt-1">{sig.description}</div>
        </div>
      ))}
    </div>
  );
};

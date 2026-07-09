import React, { useState, useMemo, useEffect } from 'react';
import { 
  ComposedChart, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine 
} from 'recharts';
import { ZoomIn, ZoomOut, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import { Candle, ForecastModelResult, Timeframe } from '../types';

interface ChartPanelProps {
  data: Candle[];
  forecasts: ForecastModelResult[];
  hiddenModels: Set<string>;
  timeframe: Timeframe;
}

export const ChartPanel: React.FC<ChartPanelProps> = ({ data, forecasts, hiddenModels, timeframe }) => {
  // 1. Prepare combined dataset (History + Forecasts)
  const fullChartData = useMemo(() => {
    if (data.length === 0) return [];
    
    const visibleData = data; 
    const lastCandle = visibleData[visibleData.length - 1];
    const lastTime = new Date(lastCandle.time).getTime();
    
    // Determine time increment based on timeframe
    let incrementMs = 60 * 60 * 1000; // Default 1h
    if (timeframe === '15m') incrementMs = 15 * 60 * 1000;
    if (timeframe === '1d') incrementMs = 24 * 60 * 60 * 1000;
    if (timeframe === '1w') incrementMs = 7 * 24 * 60 * 60 * 1000;
    if (timeframe === '1mo') incrementMs = 30 * 24 * 60 * 60 * 1000;

    // Create future points for periods 1, 2, 3
    const futurePoints = [1, 2, 3].map((period) => {
      const time = new Date(lastTime + period * incrementMs).toISOString();
      const point: any = { time, isForecast: true };
      
      // Add each model's prediction
      forecasts.forEach(model => {
        const pred = model.forecasts.find(f => f.period === period);
        if (pred) {
          point[`${model.modelName}_price`] = pred.price;
          point[`${model.modelName}_range`] = [pred.rangeLow, pred.rangeHigh];
        }
      });
      return point;
    });

    // Combine
    return [
      ...visibleData.map(c => ({
          time: c.time,
          price: c.close,
          isForecast: false
      })),
      ...futurePoints
    ];
  }, [data, forecasts, timeframe]);

  // 2. State for Zoom/Pan (Window of visible data)
  const [viewWindow, setViewWindow] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  // Initialize view to last 40 points + forecasts when data loads
  useEffect(() => {
    if (fullChartData.length > 0) {
      const defaultViewSize = 45; // Approx 40 candles + 3 forecast points
      setViewWindow({
        start: Math.max(0, fullChartData.length - defaultViewSize),
        end: fullChartData.length
      });
    }
  }, [fullChartData.length]);

  // 3. Zoom & Pan Handlers
  const handleZoom = (direction: 'in' | 'out') => {
    setViewWindow(prev => {
      const currentRange = prev.end - prev.start;
      const step = Math.max(2, Math.floor(currentRange * 0.2)); // Zoom step size
      
      if (direction === 'in') {
        if (currentRange <= 10) return prev; // Min zoom level
        return { 
          start: prev.start + step, 
          end: prev.end 
        };
      } else {
        return { 
          start: Math.max(0, prev.start - step), 
          end: prev.end 
        };
      }
    });
  };

  const handlePan = (direction: 'left' | 'right') => {
    setViewWindow(prev => {
      const currentRange = prev.end - prev.start;
      const step = Math.max(1, Math.floor(currentRange * 0.1)); // Pan step size
      
      if (direction === 'left') {
        const newStart = Math.max(0, prev.start - step);
        return { start: newStart, end: newStart + currentRange };
      } else {
        const newEnd = Math.min(fullChartData.length, prev.end + step);
        return { start: newEnd - currentRange, end: newEnd };
      }
    });
  };

  const handleReset = () => {
      const defaultViewSize = 45;
      setViewWindow({
        start: Math.max(0, fullChartData.length - defaultViewSize),
        end: fullChartData.length
      });
  };

  // Slice data for rendering
  const visibleData = fullChartData.slice(viewWindow.start, viewWindow.end);
  // Calculate reference line for current price (last known real close)
  const lastRealPrice = data[data.length - 1]?.close;

  // Format tick based on timeframe
  const formatXAxis = (str: string) => {
      const d = new Date(str);
      if (timeframe === '15m' || timeframe === '1h') {
          return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
      }
      return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  return (
    <div className="h-[340px] w-full bg-slate-900/50 rounded-xl border border-slate-700 p-4 relative group">
      
      <div className="flex justify-between items-start mb-2">
          <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">EUR/USD - {timeframe.toUpperCase()} Price Action & Forecast</h3>
          
          {/* Zoom Controls Overlay */}
          <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 backdrop-blur-sm z-10">
            <button onClick={() => handlePan('left')} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Pan Left">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => handleZoom('out')} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={() => handleReset()} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Reset View">
              <RotateCcw className="w-3 h-3" />
            </button>
            <button onClick={() => handleZoom('in')} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
             <button onClick={() => handlePan('right')} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors" title="Pan Right">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
      </div>

      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={visibleData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis 
            dataKey="time" 
            tick={{ fill: '#64748b', fontSize: 10 }} 
            tickFormatter={formatXAxis}
            minTickGap={30}
          />
          <YAxis 
            domain={['auto', 'auto']} 
            tick={{ fill: '#64748b', fontSize: 10 }} 
            tickFormatter={(val) => val.toFixed(4)}
            width={60}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', fontSize: '12px' }}
            itemStyle={{ padding: 0 }}
            labelFormatter={(label) => new Date(label).toLocaleString()}
            formatter={(value: any, name: string) => {
               if (Array.isArray(value)) {
                 return [`${value[0].toFixed(5)} - ${value[1].toFixed(5)}`, name.replace('_range', ' Range')];
               }
               return [
                  typeof value === 'number' ? value.toFixed(5) : value, 
                  name.replace('_price', '')
               ];
            }}
          />
          
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#ffffff" 
            strokeWidth={2} 
            dot={false}
            activeDot={{ r: 6 }}
            isAnimationActive={false} // Disable animation for smoother zooming
          />

          {/* Render Forecast Models (Areas + Lines) */}
          {forecasts.map((model) => (
             <React.Fragment key={model.modelName}>
                <Area
                    type="monotone"
                    dataKey={`${model.modelName}_range`}
                    stroke="none"
                    fill={model.color}
                    fillOpacity={0.15}
                    connectNulls
                    hide={hiddenModels.has(model.modelName)}
                    isAnimationActive={false}
                />
                <Line
                    type="monotone"
                    dataKey={`${model.modelName}_price`}
                    stroke={model.color}
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={{r: 4, strokeWidth: 0, fill: model.color}}
                    connectNulls
                    hide={hiddenModels.has(model.modelName)}
                    isAnimationActive={false}
                />
             </React.Fragment>
          ))}

          {lastRealPrice && (
            <ReferenceLine y={lastRealPrice} stroke="#94a3b8" strokeDasharray="3 3" label={{ value: 'Current', fill: '#94a3b8', fontSize: 10, position: 'right'}} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
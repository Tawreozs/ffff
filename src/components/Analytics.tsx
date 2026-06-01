import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  Percent, 
  TrendingDown, 
  Wrench, 
  PiggyBank,
  Calendar,
  Layers,
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { RepairItem } from '../types';

interface AnalyticsProps {
  items: RepairItem[];
}

// Utility to parse month and year from a dates representation e.g. "28.05.2026, 12:30:15"
const parseMonthYear = (dateStr: string | undefined): { monthNo: number; year: number; label: string } | null => {
  if (!dateStr) return null;
  const match = dateStr.match(/(\d{2})[./](\d{2})[./](\d{4})/);
  if (!match) return null;
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);
  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return null;

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];
  const label = `${monthNames[month - 1]} ${year}`;
  return { monthNo: month, year, label };
};

export default function Analytics({ items }: AnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Dynamically group completed items to extract all unique months of operation
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, { label: string; year: number; monthNo: number }>();
    
    items.forEach(item => {
      if (item.status === 'archived') {
        const dateToParse = item.archivedDate || item.date;
        const parsed = parseMonthYear(dateToParse);
        if (parsed) {
          const key = `${parsed.year}-${String(parsed.monthNo).padStart(2, '0')}`;
          monthsMap.set(key, { label: parsed.label, year: parsed.year, monthNo: parsed.monthNo });
        }
      }
    });

    // Sort months descending (newest months first)
    return Array.from(monthsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, data]) => ({ key, ...data }));
  }, [items]);

  // Filter archived items by selected period (month & year)
  const archivedItemsOnly = useMemo(() => {
    const list = items.filter(i => i.status === 'archived');
    if (selectedMonth === 'all') return list;
    
    return list.filter(item => {
      const dateToParse = item.archivedDate || item.date;
      const parsed = parseMonthYear(dateToParse);
      if (!parsed) return false;
      const key = `${parsed.year}-${String(parsed.monthNo).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [items, selectedMonth]);

  // General statistics counters
  const totalRepairsCount = items.length;
  const activeRepairsCount = items.filter(i => i.status === 'active').length;
  const currentPeriodArchivedCount = archivedItemsOnly.length;

  // Global financial calculations for chosen period
  const totalRevenue = useMemo(() => {
    return archivedItemsOnly.reduce((acc, item) => acc + (item.price || 0), 0);
  }, [archivedItemsOnly]);

  const totalPartsCost = useMemo(() => {
    return archivedItemsOnly.reduce((acc, item) => acc + (item.partsCost || 0), 0);
  }, [archivedItemsOnly]);

  const totalProfit = useMemo(() => {
    return totalRevenue - totalPartsCost;
  }, [totalRevenue, totalPartsCost]);

  const avgProfitMargin = useMemo(() => {
    if (totalRevenue === 0) return 0;
    return (totalProfit / totalRevenue) * 100;
  }, [totalRevenue, totalProfit]);

  // Group stats by Device Brand/Model keywords
  const brandStats = useMemo(() => {
    const brands: Record<string, { count: number; revenue: number; cost: number; profit: number }> = {};
    
    archivedItemsOnly.forEach(item => {
      const modelClean = item.model.trim();
      let brand = modelClean.split(' ')[0] || 'Другое';
      // Normalize common names
      brand = brand.charAt(0).toUpperCase() + brand.slice(1).toLowerCase();
      if (brand === 'Iphone' || brand === 'Копия') brand = 'Apple';
      if (brand === 'A50' || brand === 'A40' || brand === 'A32') brand = 'Samsung';
      if (brand === 'A207' || brand === 'A20s' || brand === 'A31') brand = 'Samsung';
      if (brand === 'Y8p') brand = 'Huawei';
      if (brand === 'Spark') brand = 'Tecno';
      
      const price = item.price || 0;
      const cost = item.partsCost || 0;
      const profit = price - cost;

      if (!brands[brand]) {
        brands[brand] = { count: 0, revenue: 0, cost: 0, profit: 0 };
      }

      brands[brand].count += 1;
      brands[brand].revenue += price;
      brands[brand].cost += cost;
      brands[brand].profit += profit;
    });

    return Object.entries(brands)
      .map(([name, data]) => ({
        name,
        ...data,
        margin: data.revenue > 0 ? (data.profit / data.revenue) * 100 : 0
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [archivedItemsOnly]);

  // Find highest profit item
  const topProfitItem = useMemo(() => {
    let bestItem: RepairItem | null = null;
    let maxProfit = -999999;
    archivedItemsOnly.forEach(i => {
      const p = (i.price || 0) - (i.partsCost || 0);
      if (p > maxProfit) {
        maxProfit = p;
        bestItem = i;
      }
    });
    return bestItem ? { ...bestItem, profit: maxProfit } : null;
  }, [archivedItemsOnly]);

  return (
    <div className="flex-1 flex flex-col bg-[#121212] text-[#f5f5f5] p-4 sm:p-6 min-h-screen">
      
      {/* Header bar with custom Month Filter */}
      <div className="mb-6 max-w-5xl w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222222] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <TrendingUp size={24} className="text-blue-400" />
            <span>Финансовая аналитика</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            Контроль за оборотом, затратами и рентабельностью ремонтной мастерской с фильтром по месяцам
          </p>
        </div>

        {/* Dynamic Month Selector Filter */}
        <div className="flex items-center gap-2">
          <label htmlFor="month-select" className="text-xs font-semibold text-neutral-400 flex items-center gap-1">
            <Calendar size={14} className="text-blue-400" />
            <span>Период:</span>
          </label>
          <div className="relative">
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-[#1c1c1c] border border-[#2d2d2d] text-neutral-100 rounded-lg py-2 pl-3 pr-8 text-xs sm:text-sm font-medium focus:outline-none focus:border-blue-500 transition-all cursor-pointer appearance-none min-w-[150px]"
            >
              <option value="all">За всё время</option>
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid of Key stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 max-w-5xl w-full font-sans">
        
        {/* Total Revenue card */}
        <div className="bg-[#161616] border border-[#222222] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-neutral-500 font-mono tracking-wider uppercase">ОБЩАЯ ВЫРУЧКА</span>
            <p className="text-lg sm:text-2xl font-bold text-[#f5f5f5] tracking-tight mt-1">
              {totalRevenue.toLocaleString('ru-RU')} ₽
            </p>
            <span className="text-[10px] text-neutral-400 flex items-center gap-1 mt-1 font-mono">
              Общий оборот
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Total Parts Cost card */}
        <div className="bg-[#161616] border border-[#222222] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-neutral-500 font-mono tracking-wider uppercase">ЗАТРАТЫ (ДЕТАЛИ)</span>
            <p className="text-lg sm:text-2xl font-bold text-neutral-300 tracking-tight mt-1">
              {totalPartsCost.toLocaleString('ru-RU')} ₽
            </p>
            <span className="text-[10px] text-neutral-500 flex items-center gap-1 mt-1 font-mono">
              Себестоимость
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
            <TrendingDown size={20} />
          </div>
        </div>

        {/* Net Profit card */}
        <div className="bg-[#161616] border border-blue-900/30 rounded-xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase">ЧИСТАЯ ПРИБЫЛЬ</span>
            <p className="text-lg sm:text-2xl font-bold text-emerald-400 tracking-tight mt-1">
              {totalProfit.toLocaleString('ru-RU')} ₽
            </p>
            <span className="text-[10px] text-emerald-500/80 flex items-center gap-1 mt-1 font-mono">
              Чистыми на руки
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <PiggyBank size={20} />
          </div>
        </div>

        {/* Profit Margin card */}
        <div className="bg-[#161616] border border-[#222222] rounded-xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] text-neutral-500 font-mono tracking-wider uppercase">РЕНТАБЕЛЬНОСТЬ</span>
            <p className="text-lg sm:text-2xl font-bold text-white mt-1">
              {avgProfitMargin.toFixed(1)}%
            </p>
            <span className="text-[10px] text-neutral-400 flex items-center gap-1 mt-1 font-mono">
              Средняя маржа
            </span>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
            <Percent size={18} />
          </div>
        </div>
      </div>

      {/* Main Grid: charts and statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-5xl w-full mb-6">
        
        {/* LEFT COLUMN: BRAND BREAKDOWN ANALYSIS (5 COLS) */}
        <div className="lg:col-span-5 bg-[#161616] border border-[#222222] rounded-xl p-5 shadow-md flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white tracking-tight mb-4 flex items-center gap-1.5 font-sans">
              <Layers size={16} className="text-blue-400" />
              <span>Распределение прибыли по брендам</span>
            </h3>

            {brandStats.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-neutral-500 text-xs text-center p-4">
                Нет данных для этого периода.<br/>Переместите отремонтированные аппараты в архив.
              </div>
            ) : (
              <div className="space-y-4">
                {brandStats.slice(0, 5).map((brand, index) => {
                  const maxProfit = Math.max(...brandStats.map(b => b.profit), 1);
                  const widthPercent = (brand.profit / maxProfit) * 100;
                  
                  return (
                    <div key={brand.name} className="space-y-2">
                      <div className="flex justify-between text-xs font-sans">
                        <span className="text-[#e2e8f0] font-medium flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          {brand.name}
                          <span className="text-[#a3e635] text-[10px] font-semibold bg-emerald-950/40 px-1.5 py-0.5 rounded ml-1 font-mono">
                            {brand.margin.toFixed(0)}% маржа
                          </span>
                        </span>
                        <span className="text-neutral-400 font-mono">
                          {brand.profit.toLocaleString('ru-RU')} ₽{' '}
                          <span className="text-neutral-600 text-[10px]">({brand.count} шт.)</span>
                        </span>
                      </div>
                      
                      <div className="h-2.1 w-full bg-[#242424] rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.max(widthPercent, 4)}%` }}
                          className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                            index === 0 ? 'from-blue-600 to-cyan-500' :
                            index === 1 ? 'from-cyan-500 to-emerald-500' :
                            index === 2 ? 'from-emerald-500 to-amber-500' :
                            'from-neutral-500 to-neutral-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-[#242424] text-[11px] text-neutral-400 flex justify-between">
            <span>Аппаратов готово в этом периоде:</span>
            <span className="font-bold text-white">{currentPeriodArchivedCount} шт.</span>
          </div>
        </div>

        {/* RIGHT COLUMN: BRANDS TABLE RENTABILITY (7 COLS) */}
        <div className="lg:col-span-7 bg-[#161616] border border-[#222222] rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
          <div>
            <div className="p-4 bg-[#1a1a1a] border-b border-[#242424] flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 font-mono flex items-center gap-1.5">
                <Smartphone size={14} className="text-neutral-400" />
                <span>Производители и доходность за период</span>
              </h3>
              <span className="text-[10px] text-neutral-500 font-mono uppercase">
                Брендов: {brandStats.length}
              </span>
            </div>

            {brandStats.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-neutral-500 text-xs">
                Нет записей в архиве за выбранный период
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#262626] text-neutral-500 font-semibold uppercase font-mono">
                      <th className="p-3">Производитель</th>
                      <th className="p-3 text-center">Кол-во</th>
                      <th className="p-3 text-right">Выручка</th>
                      <th className="p-3 text-right text-emerald-400">Чистая прибыль</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#242424] text-neutral-300 font-sans">
                    {brandStats.map((brand) => (
                      <tr key={brand.name} className="hover:bg-[#1e1e1e]/60 transition-colors">
                        <td className="p-3 font-medium text-white">{brand.name}</td>
                        <td className="p-3 text-center font-mono">{brand.count}</td>
                        <td className="p-3 text-right font-mono">{brand.revenue.toLocaleString('ru-RU')} ₽</td>
                        <td className="p-3 text-right font-mono text-emerald-400 font-semibold">
                          +{brand.profit.toLocaleString('ru-RU')} ₽
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top profitability banner (Full-width for selected period) */}
      {topProfitItem && (
        <div className="max-w-5xl w-full bg-gradient-to-r from-blue-950/20 via-indigo-950/10 to-transparent border border-blue-900/30 rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-blue-400 font-mono tracking-wider uppercase block">САМЫЙ ПРИБЫЛЬНЫЙ РЕМОНТ ПЕРИОДА</span>
            <p className="text-sm font-semibold text-white mt-1 leading-snug">
              {topProfitItem.model} — {topProfitItem.reason}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              Выручка: {topProfitItem.price?.toLocaleString('ru-RU')} ₽ · 
              Запчасть: {topProfitItem.partsCost?.toLocaleString('ru-RU')} ₽
            </p>
          </div>
          <div className="text-left sm:text-right font-mono">
            <span className="text-xs text-neutral-500 uppercase block">ЧИСТАЯ ПРИБЫЛЬ</span>
            <span className="text-emerald-400 font-bold text-xl block sm:inline">
              +{topProfitItem.profit.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      )}

      {/* Financial info helper note footer */}
      <div className="max-w-5xl w-full p-4 bg-[#161616]/40 rounded-xl border border-[#222222] text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left font-serif lg:font-sans">
        <p className="flex items-center gap-1.5 select-text">
          <Wrench size={12} />
          <span>Все данные сохраняются автоматически в ваше браузерное хранилище LocalStorage.</span>
        </p>
        <span className="font-mono text-[10px]">VER: 1.3 · MONTHLY_FILTERS_ENABLED</span>
      </div>
    </div>
  );
}

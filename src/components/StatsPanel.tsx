import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { X, BarChart3, Clock, TrendingUp, Tv, Search, Activity } from 'lucide-react';
import { Channel } from '../types';
import { cn } from '../lib/utils';

interface StatsPanelProps {
  channels: Channel[];
  onClose: () => void;
}

export default function StatsPanel({ channels, onClose }: StatsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate global totals from all channels
  const { totalGlobalViews, totalGlobalSeconds } = useMemo(() => {
    return channels.reduce((acc, c) => ({
      totalGlobalViews: acc.totalGlobalViews + (c.views || 0),
      totalGlobalSeconds: acc.totalGlobalSeconds + (c.watchTime || 0)
    }), { totalGlobalViews: 0, totalGlobalSeconds: 0 });
  }, [channels]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}sa ${mins}dk`;
    if (mins > 0) return `${mins}dk ${secs}sn`;
    return `${secs}sn`;
  };

  const channelStats = useMemo(() => {
    return channels
      .map(c => {
        const views = c.views || 0;
        const time = c.watchTime || 0;
        // Pay artık izleme süresine göre hesaplanıyor
        const rate = totalGlobalSeconds > 0 ? ((time / totalGlobalSeconds) * 100).toFixed(1) : '0';
        return { ...c, views, time, rate: parseFloat(rate) };
      })
      // Sıralama izleme süresine göre (en çoktan en aza)
      .sort((a, b) => b.time - a.time);
  }, [channels, totalGlobalSeconds]);

  const filteredStats = channelStats.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-[9999] bg-[#0a0502]/95 backdrop-blur-3xl flex items-center justify-center p-2 md:p-8"
    >
      <div className="max-w-5xl w-full h-[95vh] md:h-[90vh] bg-[#120805] border border-white/10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Kapatma Butonu */}
        <div className="absolute top-6 right-6 md:top-10 md:right-10 z-50">
           <button onClick={onClose} className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:border-red-500 transition-all text-white shadow-xl">
             <X size={24} />
           </button>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {/* Üst Sabit Bilgi Alanı */}
          <div className="p-8 md:p-12 pb-6 shrink-0 bg-linear-to-b from-black/40 to-transparent">
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-2">
                <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                  <BarChart3 size={28} />
                </div>
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic text-white leading-none">Global Analiz</h2>
              </div>
              <p className="text-white/40 text-[10px] md:text-xs font-black uppercase tracking-[0.4em] italic ml-1">İzleme Süresi Odaklı Veriler</p>
            </div>

            <div className="grid grid-cols-3 gap-4 md:gap-8 mb-10">
              <div className="bg-white/5 border border-white/5 rounded-3xl p-5 md:p-8 flex flex-col items-center justify-center text-center group hover:bg-white/[0.08] transition-colors border-b-indigo-500/50">
                <Clock className="text-indigo-400 mb-3" size={24} />
                <div className="text-xl md:text-3xl font-black text-white">{formatTime(totalGlobalSeconds)}</div>
                <div className="text-[8px] md:text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-2">Toplam Süre</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-3xl p-5 md:p-8 flex flex-col items-center justify-center text-center group hover:bg-white/[0.08] transition-colors border-b-primary/50">
                <TrendingUp className="text-primary mb-3" size={24} />
                <div className="text-xl md:text-3xl font-black text-white">{totalGlobalViews}</div>
                <div className="text-[8px] md:text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-2">Toplam Giriş</div>
              </div>
              <div className="bg-white/5 border border-white/5 rounded-3xl p-5 md:p-8 flex flex-col items-center justify-center text-center group hover:bg-white/[0.08] transition-colors border-b-green-500/50">
                <Activity className="text-green-400 mb-3" size={24} />
                <div className="text-xl md:text-3xl font-black text-white">{channels.length}</div>
                <div className="text-[8px] md:text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-2">Kanal Sayısı</div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={20} />
              <input 
                type="text"
                placeholder="Kanal adına göre ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-3xl py-5 pl-16 pr-8 text-sm text-white focus:border-primary/50 outline-none transition-all placeholder:text-white/10"
              />
            </div>
          </div>

          {/* Kaydırılabilir Kanal Listesi */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-8 md:px-12 pb-12 space-y-4">
            {filteredStats.length > 0 ? (
              filteredStats.map((stat, index) => (
                <div key={stat.id} className={cn(
                  "group bg-white/[0.02] hover:bg-white/5 border border-white/5 rounded-[2rem] p-5 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all",
                  stat.time === 0 && "opacity-30 grayscale"
                )}>
                  <div className="flex items-center gap-6 w-full sm:w-auto">
                    <div className="w-16 h-16 bg-black rounded-2xl p-2 border border-white/10 shrink-0 relative shadow-2xl">
                      <img src={stat.logo} className="w-full h-full object-contain" alt="" />
                      {stat.time > 0 && (
                        <div className="absolute -top-2 -left-2 w-7 h-7 bg-primary rounded-full flex items-center justify-center text-[11px] font-black text-white shadow-xl ring-4 ring-[#120805]">
                          {index + 1}
                        </div>
                      )}
                    </div>
                    <div className="text-left overflow-hidden">
                      <h4 className="font-bold text-lg md:text-xl uppercase tracking-tight text-white truncate">{stat.name}</h4>
                      <div className="text-[10px] text-white/30 font-black uppercase tracking-widest mt-1">{stat.category}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-8 md:gap-16 sm:pr-4 border-t border-white/5 sm:border-none pt-6 sm:pt-0">
                    <div className="text-center min-w-[100px]">
                      <div className="text-base md:text-lg font-black text-primary italic">{formatTime(stat.time)}</div>
                      <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">İzleme Süresi</div>
                    </div>
                    <div className="text-center min-w-[60px]">
                      <div className="text-base md:text-lg font-black text-white/40">{stat.views}</div>
                      <div className="text-[8px] font-black text-white/20 uppercase tracking-widest mt-1">Giriş</div>
                    </div>
                    <div className="text-right min-w-[70px]">
                      <div className="text-xl md:text-2xl font-black text-indigo-400 italic">%{stat.rate}</div>
                      <div className="text-[8px] font-black text-white/20 uppercase tracking-widest text-right mt-1">Süre Payı</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-20 text-center bg-white/[0.01] rounded-[3rem] border-2 border-dashed border-white/5">
                <BarChart3 size={64} className="mx-auto mb-6 text-white/5" />
                <p className="text-white/20 text-sm font-black uppercase tracking-[0.3em]">Arama sonucu bulunamadı</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.4);
          background-clip: content-box;
        }
      `}</style>
    </motion.div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '../lib/firebase';
import { setDoc, deleteDoc, doc, serverTimestamp, collection, query, onSnapshot, limit, updateDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { Save, Trash2, Edit2, X, AlertCircle, Search, Loader2, Upload, Camera, RefreshCw, User as UserIcon, Bell, CheckCircle, Clock, Send, BarChart3, TrendingUp, Activity, Play, FilePlus, Zap, MonitorPlay } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Channel } from '../types';
import { CHANNELS as INITIAL_CHANNELS } from '../constants';
import { cn } from '../lib/utils';
import VideoPlayer from './VideoPlayer';

interface AdminPanelProps {
  channels: Channel[];
  onClose: () => void;
  onChannelsUpdated: () => void;
  initialTab?: 'channels' | 'notifications' | 'stats';
}

interface Report {
  id: string;
  channelName: string;
  url: string;
  type: string;
  timestamp: any;
  status: 'pending' | 'resolved';
  count?: number;
}

export default function AdminPanel({ channels, onClose, onChannelsUpdated, initialTab = 'channels' }: AdminPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'channels' | 'notifications' | 'stats'>(initialTab as any);
  const [reports, setReports] = useState<Report[]>([]);
  
  const [formData, setFormData] = useState<Partial<Channel>>({
    name: '', logo: '', streamUrl: '', description: '', category: 'Genel', type: 'tv'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showTestPlayer, setShowTestPlayer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}sa ${mins}dk`;
    if (mins > 0) return `${mins}dk ${secs}sn`;
    return `${secs}sn`;
  };

  const { totalGlobalViews, totalGlobalSeconds, channelStats } = useMemo(() => {
    const totalViews = channels.reduce((acc, c) => acc + (c.views || 0), 0);
    const totalSeconds = channels.reduce((acc, c) => acc + (c.watchTime || 0), 0);
    const stats = channels
      .map(c => {
        const views = c.views || 0;
        const time = c.watchTime || 0;
        const rate = totalSeconds > 0 ? ((time / totalSeconds) * 100).toFixed(1) : '0';
        return { ...c, views, time, rate: parseFloat(rate) };
      })
      .sort((a, b) => b.time - a.time);
    return { totalGlobalViews: totalViews, totalGlobalSeconds: totalSeconds, channelStats: stats };
  }, [channels]);

  useEffect(() => {
    const q = query(collection(db, 'reports'), where('status', '==', 'pending'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Report[];
      setReports(allReports);
    });
    return () => unsubscribe();
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => { setFormData({ ...formData, logo: reader.result as string }); };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.streamUrl) {
      setError('Lütfen kanal adı ve yayın linkini doldurun.');
      return;
    }
    setLoading(true);
    try {
      const finalId = formData.id || `channel-${Date.now()}`;
      await setDoc(doc(db, 'channels', finalId), {
        ...formData,
        id: finalId,
        isDeleted: false,
        updatedAt: serverTimestamp(),
        author: auth.currentUser?.email || 'admin'
      }, { merge: true });

      setFormData({ name: '', logo: '', streamUrl: '', description: '', category: 'Genel', type: 'tv' });
      setIsEditing(false);
      onChannelsUpdated();
      window.alert('Kanal başarıyla buluta kaydedildi.');
    } catch (err: any) {
      setError(`Kayıt hatası: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveReport = async (channelName: string) => {
    try {
      const q = query(collection(db, 'reports'), where('channelName', '==', channelName), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach((doc) => batch.update(doc.ref, { status: 'resolved' }));
      await batch.commit();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (channel: Channel) => {
    if (!window.confirm(`${channel.name} kanalını silmek istediğinize emin misiniz?`)) return;
    setLoading(true);
    try {
      const isInitial = INITIAL_CHANNELS.some(c => c.id === channel.id);
      if (isInitial) { await setDoc(doc(db, 'channels', channel.id.toString()), { isDeleted: true }, { merge: true }); }
      else { await deleteDoc(doc(db, 'channels', channel.id.toString())); }
      onChannelsUpdated();
    } catch (err: any) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-[#0a0502]/98 backdrop-blur-3xl flex flex-col p-4 md:p-8 overflow-hidden text-white font-sans">
      <div className="max-w-6xl mx-auto w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 shrink-0 flex-wrap gap-4">
          <div className="flex items-center gap-6">
            <h2 className="text-2xl font-black uppercase italic text-yellow-500 tracking-tighter leading-none">Yönetici Paneli</h2>
            <nav className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/10">
               <button onClick={() => { setActiveTab('channels'); setIsEditing(false); setFormData({name: '', logo: '', streamUrl: '', category: 'Genel', type: 'tv'}); }} className={cn("px-4 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", activeTab === 'channels' ? "bg-yellow-500 text-black shadow-lg" : "text-white/40 hover:text-white")}>KANALLAR</button>
               <button onClick={() => setActiveTab('stats')} className={cn("px-4 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2", activeTab === 'stats' ? "bg-indigo-600 text-white shadow-lg" : "text-white/40 hover:text-white")}><BarChart3 size={12}/> İSTATİSTİKLER</button>
               <button onClick={() => setActiveTab('notifications')} className={cn("px-4 md:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 relative", activeTab === 'notifications' ? "bg-blue-600 text-white shadow-lg" : "text-white/40 hover:text-white")}>BİLDİRİMLER {reports.length > 0 && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}</button>
            </nav>
          </div>
          <button onClick={onClose} className="p-4 bg-white/5 rounded-2xl hover:bg-red-500 transition-all group shadow-lg border border-white/5"><X size={24}/></button>
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'channels' ? (
            <motion.div key="channels" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">
              
              {/* Yayın Oluştur Formu (Görseldeki Tasarım) */}
              <div className="w-full lg:w-[450px] space-y-6 overflow-y-auto no-scrollbar pb-10">
                <div className="bg-[#120a07] border border-white/5 rounded-[2.5rem] p-8 space-y-8 shadow-2xl relative">
                  
                  {/* Başlık */}
                  <div className="flex items-center gap-3">
                    <Zap className="text-yellow-500 fill-yellow-500 animate-pulse" size={24} />
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">{isEditing ? 'YAYINI GÜNCELLE' : 'YAYIN OLUŞTUR'}</h3>
                  </div>

                  <hr className="border-white/5" />

                  {/* Logo Yükleme */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">LOGO YÜKLE (BİLGİSAYARDAN)</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-video bg-black/40 rounded-[2rem] border-2 border-dashed border-white/10 hover:border-yellow-500/40 transition-all cursor-pointer group flex flex-col items-center justify-center relative overflow-hidden"
                    >
                      {formData.logo ? (
                        <img src={formData.logo} className="w-full h-full object-contain p-6" alt="" />
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Upload className="text-white/20" size={24} />
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/60">GÖRSEL SEÇ</span>
                          <span className="text-[8px] font-bold text-white/20 uppercase mt-1">VEYA SÜRÜKLE BIRAK</span>
                        </>
                      )}
                      <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
                    </div>
                  </div>

                  {/* Giriş Alanları */}
                  <div className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">KANAL ADI</label>
                       <input 
                        type="text" 
                        placeholder="Kanal ismi..." 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                        className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 text-xs font-bold outline-none focus:border-yellow-500/50 transition-all placeholder:text-white/10" 
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-1">YAYIN KAYNAĞI VE CANLI TEST</label>
                       <div className="flex gap-3">
                          <input 
                            type="text" 
                            placeholder="m3u8 veya youtube linki" 
                            value={formData.streamUrl} 
                            onChange={e => setFormData({...formData, streamUrl: e.target.value})} 
                            className="flex-1 bg-white/5 p-5 rounded-2xl border border-white/10 text-xs font-bold outline-none focus:border-yellow-500/50 transition-all placeholder:text-white/10" 
                          />
                          <button 
                            onClick={() => setShowTestPlayer(true)}
                            className="px-8 bg-yellow-500 text-black font-black text-[10px] uppercase rounded-2xl shadow-xl hover:bg-yellow-400 active:scale-95 transition-all"
                          >
                            TEST
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-white/20 uppercase ml-1">KATEGORİ</label>
                        <select 
                          value={formData.category} 
                          onChange={e => setFormData({...formData, category: e.target.value})} 
                          className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 text-[10px] font-black uppercase outline-none cursor-pointer focus:border-yellow-500/50"
                        >
                          {["Genel", "Haber", "Spor", "Çocuk", "Belgesel", "Müzik", "Yarışma"].map(cat => <option key={cat} value={cat} className="bg-zinc-900">{cat}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black text-white/20 uppercase ml-1">TÜR</label>
                        <select 
                          value={formData.type} 
                          onChange={e => setFormData({...formData, type: e.target.value as any})} 
                          className="w-full bg-white/5 p-5 rounded-2xl border border-white/10 text-[10px] font-black uppercase outline-none cursor-pointer focus:border-yellow-500/50"
                        >
                          <option value="tv" className="bg-zinc-900">TELEVİZYON</option>
                          <option value="radio" className="bg-zinc-900">RADYO</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleSave} 
                    disabled={loading} 
                    className="w-full bg-white text-black py-6 rounded-full font-black text-xs uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 active:scale-95 transition-all"
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18}/> KANALI BULUTA EKLE</>}
                  </button>
                </div>
              </div>

              {/* Sağ Taraf - Kanal Listesi */}
              <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-[3rem] flex flex-col overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-white/10 bg-black/20">
                  <div className="relative"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20" size={20} /><input type="text" placeholder="Kanallarda ara..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm outline-none focus:border-yellow-500/50 transition-all text-white" /></div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
                  {channels.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(channel => (
                    <div key={channel.id} className="bg-white/5 p-4 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:bg-white/[0.08] transition-all">
                      <div className="flex items-center gap-5 min-w-0">
                        <div className="w-14 h-14 bg-black rounded-2xl p-2.5 border border-white/5 shrink-0"><img src={channel.logo} className="w-full h-full object-contain" alt=""/></div>
                        <div className="min-w-0"><h4 className="font-black text-lg truncate uppercase italic text-white tracking-tighter">{channel.name}</h4><span className="text-[8px] font-black text-yellow-500 uppercase tracking-widest bg-yellow-500/5 px-2 py-0.5 rounded-full border border-yellow-500/10">{channel.category}</span></div>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all pr-2">
                        <button onClick={() => { setFormData(channel); setIsEditing(true); }} className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all"><Edit2 size={18}/></button>
                        <button onClick={() => handleDelete(channel)} className="w-10 h-10 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : activeTab === 'stats' ? (
            <motion.div key="stats" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex-1 flex flex-col gap-6 overflow-hidden">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400"><Clock size={24}/></div>
                  <div><div className="text-2xl font-black">{formatTime(totalGlobalSeconds)}</div><div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">TOPLAM SÜRE</div></div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4 border-b-primary/50">
                  <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center text-primary"><TrendingUp size={24}/></div>
                  <div><div className="text-2xl font-black">{totalGlobalViews}</div><div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">TOPLAM GİRİŞ</div></div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-2xl flex items-center justify-center text-green-400"><Activity size={24}/></div>
                  <div><div className="text-2xl font-black">{channels.length}</div><div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">KANAL SAYISI</div></div>
                </div>
              </div>
              <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-[2.5rem] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-white/10 bg-black/20 flex items-center justify-between"><h3 className="font-black uppercase tracking-tighter">İzleme Süresi İstatistikleri</h3></div>
                <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
                  {channelStats.map((stat, index) => (
                    <div key={stat.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 flex items-center justify-between group transition-all hover:border-indigo-500/30">
                       <div className="flex items-center gap-4">
                         <div className="w-8 h-8 flex items-center justify-center font-black text-xs text-white/20 italic">{index + 1}</div>
                         <div className="w-12 h-12 bg-black rounded-xl p-2 border border-white/5"><img src={stat.logo} className="w-full h-full object-contain" alt=""/></div>
                         <div><h4 className="font-black text-sm uppercase text-white">{stat.name}</h4><div className="text-[8px] font-black text-white/20 uppercase tracking-widest">{stat.category}</div></div>
                       </div>
                       <div className="flex items-center gap-8 md:gap-16">
                         <div className="text-center"><div className="text-sm font-black text-indigo-400">{formatTime(stat.time)}</div><div className="text-[8px] font-bold text-white/20 uppercase">SÜRE</div></div>
                         <div className="text-right min-w-[60px]"><div className="text-lg font-black text-primary italic">%{stat.rate}</div><div className="text-[8px] font-bold text-white/20 uppercase">PAY</div></div>
                       </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div key="notifications" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col bg-white/[0.02] border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-black/20"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500"><Bell size={24} /></div><div><h3 className="text-xl font-black uppercase italic tracking-tighter">Bildirimler</h3><p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Kullanıcı Sorun Raporları</p></div></div></div>
              <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
                 {reports.length > 0 ? reports.map(report => (
                     <div key={report.id} className="bg-red-500/[0.02] p-6 rounded-[2.5rem] border border-red-500/20 flex items-center justify-between">
                        <div className="flex items-center gap-6"><div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-black border border-red-500/30"><AlertCircle size={28} className="text-red-500" /></div><div><h4 className="font-black text-lg uppercase italic">{report.channelName}</h4><p className="text-xs text-white/40 italic">Bu yayın çalışmıyor.</p></div></div>
                        <button onClick={() => handleResolveReport(report.channelName)} className="px-6 py-3 bg-white/5 hover:bg-green-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all">Çözüldü</button>
                     </div>
                 )) : <div className="flex flex-col items-center justify-center py-32 text-white/10"><CheckCircle size={64} /><p className="mt-4 font-black uppercase text-sm tracking-widest italic">Bekleyen bildirim bulunmuyor</p></div>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Yayın Test Modalı */}
      <AnimatePresence>
        {showTestPlayer && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
            onClick={() => setShowTestPlayer(false)}
          >
             <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-[#120a07] border border-white/10 w-full max-w-4xl rounded-[3rem] overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
             >
                <div className="p-6 md:p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                   <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-yellow-500/20 rounded-xl flex items-center justify-center text-yellow-500"><MonitorPlay size={20}/></div>
                     <h4 className="font-black uppercase italic tracking-widest">YAYIN TEST PANELİ</h4>
                   </div>
                   <button onClick={() => setShowTestPlayer(false)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"><X size={24}/></button>
                </div>
                <div className="p-4 md:p-8">
                   {formData.streamUrl ? (
                     <VideoPlayer url={formData.streamUrl} playing={true} onTogglePlay={() => {}} title={formData.name || 'Test Yayını'} logo={formData.logo} />
                   ) : (
                     <div className="aspect-video bg-black/40 rounded-[2rem] border-2 border-dashed border-white/5 flex flex-col items-center justify-center text-white/20">
                        <Play size={48} className="mb-4" />
                        <span className="text-xs font-black uppercase tracking-widest">Önce bir yayın linki girin</span>
                     </div>
                   )}
                </div>
                <div className="px-8 pb-8 flex justify-center">
                   <button onClick={() => setShowTestPlayer(false)} className="px-12 py-4 bg-white/5 hover:bg-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-white/10 transition-all">PENCEREYİ KAPAT</button>
                </div>
             </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </motion.div>
  );
}

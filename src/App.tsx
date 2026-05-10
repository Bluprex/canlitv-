import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CHANNELS as INITIAL_CHANNELS, CATEGORIES } from './constants';
import { Channel } from './types';
import VideoPlayer from './components/VideoPlayer';
import ChannelCard from './components/ChannelCard';
import Auth from './components/Auth';
import AdminPanel from './components/AdminPanel';
import StatsPanel from './components/StatsPanel';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query, updateDoc, increment, where } from 'firebase/firestore';
import { Search, Heart, User, Tv, Menu, X, List, Wifi, Play, LogIn, History, Star, Compass, LogOut, Shield, Instagram, Mail, Globe, TrendingUp, BarChart3, Scale, Bell, ChevronRight } from 'lucide-react';
import { cn } from './lib/utils';
import Hls from 'hls.js';

// Helper function to shuffle array
const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// Internal component for background Hero Video
function HeroBackgroundVideo({ channel, isReady, onReady }: { channel: Channel, isReady: boolean, onReady: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isDASH = channel.streamUrl?.toLowerCase().includes('.mpd');
  const isM3U8 = channel.streamUrl?.toLowerCase().includes('m3u8') || channel.streamUrl?.toLowerCase().includes('.m3u');

  useEffect(() => {
    if (!videoRef.current || !channel.streamUrl) return;
    const video = videoRef.current;
    let hls: Hls;
    let dashPlayer: any;

    const init = async () => {
      if (isM3U8 && Hls.isSupported()) {
        hls = new Hls({ abrEwmaDefaultEstimate: 20000000, startLevel: -1 });
        hls.loadSource(channel.streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          onReady();
          video.play().catch(() => {});
        });
      } else if (isDASH) {
        try {
          if (!(window as any).dashjs) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.id = 'dashjs-lib';
              script.src = "https://cdn.dashjs.org/latest/dash.all.min.js";
              script.onload = resolve;
              script.onerror = reject;
              if (!document.getElementById('dashjs-lib')) {
                document.head.appendChild(script);
              } else {
                resolve(true);
              }
            });
          }
          const dashjs = (window as any).dashjs;
          if (dashPlayer) dashPlayer.reset();
          dashPlayer = dashjs.MediaPlayer().create();
          dashPlayer.initialize(video, channel.streamUrl, true);
          dashPlayer.setMute(true);
          dashPlayer.on(dashjs.MediaPlayer.events.CAN_PLAY, () => {
            onReady();
            video.play().catch(() => {});
          });
        } catch (e) {
          console.error("DASH Load Error in Hero:", e);
        }
      } else {
        video.src = channel.streamUrl;
        video.onloadedmetadata = () => {
           onReady();
           video.play().catch(() => {});
        };
      }
    };
    init();
    return () => {
      if (hls) hls.destroy();
      if (dashPlayer) dashPlayer.reset();
    };
  }, [channel.streamUrl]);

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      crossOrigin="anonymous"
      className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[40px] md:blur-[60px] scale-110"
    />
  );
}

export default function App() {
  const [firestoreChannels, setFirestoreChannels] = useState<Channel[]>([]);
  const [localChannels, setLocalChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'channels' | 'profile'>('discover');
  const [playing, setPlaying] = useState(true);
  const [activeCategory, setActiveCategory] = useState("Tümü");
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showCopyright, setShowCopyright] = useState(false);
  const [isHeroReady, setIsHeroReady] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<string | null>(null);
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [watchHistory, setWatchHistory] = useState<{
    categories: Record<string, number>;
    channels: Record<string, number>;
    timeSpent: Record<string, number>;
  }>({ categories: {}, channels: {}, timeSpent: {} });
  
  const [discoverySeed, setDiscoverySeed] = useState(0);
  const [pendingReportsCount, setPendingReportsCount] = useState(0);
  const [adminInitialTab, setAdminInitialTab] = useState<'channels' | 'notifications'>('channels');

  useEffect(() => {
    if (!isAdmin) {
      setPendingReportsCount(0);
      return;
    }
    const q = query(collection(db, 'reports'), where('status', '==', 'pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingReportsCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [isAdmin]);

  const mergeChannels = (fetchedChannels: any[]) => {
    let mergedList = [...INITIAL_CHANNELS];
    fetchedChannels.forEach(fc => {
      const idx = mergedList.findIndex(c => c.id === fc.id);
      if (idx !== -1) {
        if (fc.isDeleted) {
           mergedList.splice(idx, 1);
        } else {
           mergedList[idx] = { ...mergedList[idx], ...fc } as Channel;
        }
      } else {
        if (!fc.isDeleted) {
          mergedList.push(fc as Channel);
        }
      }
    });
    // Alphabetical Sorting A-Z and filter out anything that might still be marked as radio (safety)
    return mergedList
      .filter(c => c.type !== 'radio')
      .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  };

  const channels = useMemo(() => {
    const combined = [...firestoreChannels, ...localChannels];
    const custom = combined.filter(c => c.id.toString().startsWith('custom-'));
    const others = combined.filter(c => !c.id.toString().startsWith('custom-'));
    return mergeChannels([...custom, ...others]);
  }, [firestoreChannels, localChannels]);

  const refreshLocalChannels = () => {
    const localChannelsStr = localStorage.getItem('visiontv-custom-channels');
    if (localChannelsStr) {
      try {
        setLocalChannels(JSON.parse(localChannelsStr));
      } catch (e) {
        console.error("Local channels load error:", e);
      }
    }
  };

  useEffect(() => {
    refreshLocalChannels();
    const handleUpdate = () => refreshLocalChannels();
    window.addEventListener('visiontv-channels-updated', handleUpdate);
    return () => window.removeEventListener('visiontv-channels-updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (activeTab === 'discover' && !activeChannelId) {
      setDiscoverySeed(prev => prev + 1);
    }
  }, [activeTab, activeChannelId]);

  // Track watch time globally (Firestore) and locally
  useEffect(() => {
    if (!activeChannelId || !playing) return;
    
    // Accumulate locally first for UI
    const interval = setInterval(async () => {
      setWatchHistory(prev => {
        const newTime = (prev.timeSpent[activeChannelId] || 0) + 1;
        const newHistory = {
          ...prev,
          timeSpent: { ...prev.timeSpent, [activeChannelId]: newTime }
        };
        localStorage.setItem('visiontv-watch-history', JSON.stringify(newHistory));
        return newHistory;
      });

      // Update Firestore watchTime every 10 seconds to avoid high frequency writes
      if (Math.random() < 0.1) { // 10% chance per second approx 10s avg
         try {
           const channelRef = doc(db, 'channels', activeChannelId);
           await updateDoc(channelRef, { watchTime: increment(10) });
         } catch (e) { /* silent fail for stats */ }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeChannelId, playing]);

  const handleVideoError = (e: any) => {
    if (activeChannel) {
      const broken = JSON.parse(localStorage.getItem('visiontv-broken-channels') || '[]');
      if (!broken.includes(activeChannel.id)) {
         broken.push(activeChannel.id);
         localStorage.setItem('visiontv-broken-channels', JSON.stringify(broken));
         window.dispatchEvent(new Event('visiontv-broken-channels-updated'));
      }
    }
  };

  useEffect(() => {
    const isLocal = localStorage.getItem('visiontv-local-admin') === 'true';
    if (isLocal) {
        setUser({ displayName: "Site Yöneticisi", email: "admin@gostasoftware.com", photoURL: "" } as any);
        setIsAdmin(true);
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (localStorage.getItem('visiontv-local-admin') === 'true') return;

      setUser(currentUser);
      if (currentUser) {
        const adminDoc = await getDoc(doc(db, 'admins', currentUser.uid));
        const isUserAdmin = adminDoc.exists() || currentUser.email === 'admin@gostasoftware.com';
        let hasRole = false;
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists() && userDoc.data()?.role === 'admin') {
          hasRole = true;
        }
        setIsAdmin(isUserAdmin || hasRole);
      } else {
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLocalLogin = () => {
    localStorage.setItem('visiontv-local-admin', 'true');
    setUser({ displayName: "Site Yöneticisi", email: "admin@gostasoftware.com", photoURL: "" } as any);
    setIsAdmin(true);
    setShowAuth(false);
  };

  useEffect(() => {
    const q = query(collection(db, 'channels'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let fetched: any[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      setFirestoreChannels(fetched);
    }, (error) => {
      console.error("Firestore sync error:", error);
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    if (localStorage.getItem('visiontv-local-admin') === 'true') {
        localStorage.removeItem('visiontv-local-admin');
        setUser(null);
        setIsAdmin(false);
        return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab, viewingCategory]);

  useEffect(() => {
    const savedFavs = localStorage.getItem('visiontv-favorites');
    if (savedFavs) setFavorites(JSON.parse(savedFavs));

    const savedHistory = localStorage.getItem('visiontv-watch-history');
    if (savedHistory) {
      const parsed = JSON.parse(savedHistory);
      setWatchHistory({
        categories: parsed.categories || {},
        channels: parsed.channels || {},
        timeSpent: parsed.timeSpent || {}
      });
    }
  }, []);

  const featuredChannel = useMemo(() => {
    if (channels.length === 0) return null;
    const historyEntries = Object.entries(watchHistory.channels);
    if (historyEntries.length === 0) return channels[0];
    const mostVisitedId = historyEntries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
    return channels.find(c => c.id === mostVisitedId) || channels[0];
  }, [watchHistory.channels, channels]);

  const topWatchedChannels = useMemo(() => {
    const sortedByUsage = [...channels]
      .sort((a, b) => (watchHistory.channels[b.id] || 0) - (watchHistory.channels[a.id] || 0))
      .slice(0, 15);
    return shuffle(sortedByUsage).slice(0, 10);
  }, [channels, watchHistory.channels, discoverySeed]);

  const discoverSections = useMemo(() => {
    const getShuffledByCategory = (cat: string) => shuffle(channels.filter(c => c.category === cat));

    return {
      cocuk: getShuffledByCategory("Çocuk"),
      yarisma: getShuffledByCategory("Yarışma"),
      haber: getShuffledByCategory("Haber"),
      muzik: getShuffledByCategory("Müzik"),
      spor: getShuffledByCategory("Spor"),
      belgesel: getShuffledByCategory("Belgesel")
    };
  }, [channels, discoverySeed]);

  useEffect(() => {
    setIsHeroReady(false);
  }, [featuredChannel?.id]);

  const activeChannel = useMemo(() => 
    channels.find(c => c.id === activeChannelId) || null
  , [activeChannelId, channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      const matchesCategory = activeCategory === "Tümü" || c.category === activeCategory;
      const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery, channels]);

  const toggleFavorite = (e: React.MouseEvent, channelId: string) => {
    e.stopPropagation();
    const newFavs = favorites.includes(channelId)
      ? favorites.filter(id => id !== channelId)
      : [...favorites, channelId];
    setFavorites(newFavs);
    localStorage.setItem('visiontv-favorites', JSON.stringify(newFavs));
  };

  const handleChannelSelect = async (id: string) => {
    const channel = channels.find(c => c.id === id);
    if (channel) {
      setWatchHistory(prev => {
        const newHistory = {
          ...prev,
          categories: { ...prev.categories, [channel.category]: (prev.categories[channel.category] || 0) + 1 },
          channels: { ...prev.channels, [channel.id]: (prev.channels[channel.id] || 0) + 1 }
        };
        localStorage.setItem('visiontv-watch-history', JSON.stringify(newHistory));
        return newHistory;
      });

      // Global View Increment
      try {
        const channelRef = doc(db, 'channels', id);
        await updateDoc(channelRef, { views: increment(1) });
      } catch (e) { /* silent fail */ }
    }
    setActiveChannelId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-white font-sans selection:bg-red-500/30 overflow-x-hidden flex flex-col">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-0 w-full h-full bg-linear-to-b from-red-900/10 to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-red-600/5 blur-[80px] md:blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-white/5 blur-[100px] md:blur-[150px] rounded-full" />
      </div>

      <header className={cn(
        "relative z-40 px-4 md:px-8 h-16 flex items-center justify-between border-b border-white/5 backdrop-blur-xl bg-black/80 sticky top-0 transition-transform duration-300",
        isVideoFullscreen && "-translate-y-full"
      )}>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-lg font-bold tracking-tight uppercase">Canlı Tv <span className="text-primary italic">+</span></h1>
          </div>

          <nav className="hidden lg:flex gap-8 text-xs font-bold tracking-widest uppercase items-center">
            <button 
              onClick={() => { setActiveTab('discover'); setActiveChannelId(null); }}
              className={cn(
                "transition-colors pb-1 border-b-2",
                activeTab === 'discover' && !activeChannelId ? "text-white border-primary" : "text-white/40 hover:text-white border-transparent"
              )}
            >
              KEŞFET
            </button>
            <button 
              onClick={() => { setActiveTab('channels'); setActiveChannelId(null); }}
              className={cn(
                "transition-colors pb-1 border-b-2",
                activeTab === 'channels' && !activeChannelId ? "text-white border-primary" : "text-white/40 hover:text-white border-transparent"
              )}
            >
              KANALLAR
            </button>
            <button 
              onClick={() => { setActiveTab('profile'); setActiveChannelId(null); }}
              className={cn(
                "transition-colors pb-1 border-b-2",
                activeTab === 'profile' && !activeChannelId ? "text-white border-primary" : "text-white/40 hover:text-white border-transparent"
              )}
            >
              PROFİL
            </button>
          </nav>
        </div>

        <div className="hidden md:flex flex-1 max-w-sm mx-10">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
            <input 
              type="text"
              placeholder="Ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-12 pr-4 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setActiveTab('profile'); setActiveChannelId(null); }}
            className={cn(
              "flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-all p-1.5 pr-4 rounded-full border border-white/10 group relative",
              activeTab === 'profile' && "bg-white/10 border-primary/30"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 border border-white/20 group-hover:scale-105 transition-transform"></div>
            <div className="hidden sm:block text-left">
              <div className="text-[10px] font-bold group-hover:text-primary transition-colors">{user?.displayName || 'Misafir'}</div>
              <div className="text-[8px] text-white/40 uppercase font-bold">{isAdmin ? 'Yönetici' : 'Ücretsiz Plan'}</div>
            </div>
            {isAdmin && pendingReportsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full animate-bounce shadow-lg border border-black font-black">
                {pendingReportsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <main 
        className="flex-1 relative z-10 flex overflow-hidden lg:pl-0"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <div className="max-w-[1400px] mx-auto w-full p-4 md:p-8">
            
            {activeChannel ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <button 
                  onClick={() => setActiveChannelId(null)}
                  className="flex items-center gap-3 text-white/40 hover:text-white transition-colors group mb-2"
                >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                       <ChevronRight size={20} className="rotate-180" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Geri Dön</span>
                </button>

                <VideoPlayer 
                  url={activeChannel.streamUrl}
                  playing={playing}
                  onTogglePlay={() => setPlaying(!playing)}
                  title={activeChannel.name}
                  logo={activeChannel.logo}
                  onFullscreenChange={setIsVideoFullscreen}
                />
                
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-12 xl:col-span-8 flex flex-col gap-8">
                    <div className="bg-white/[0.02] border border-white/5 shadow-2xl rounded-[2.5rem] p-6 md:p-10">
                      <div className="flex flex-col md:flex-row items-center justify-center gap-6 relative">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 md:w-24 md:h-24 bg-black p-4 rounded-3xl ring-1 ring-white/10 text-primary flex items-center justify-center shrink-0">
                            <img src={activeChannel.logo} alt="" className="w-full h-full object-contain" />
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase">{activeChannel.name}</h2>
                            <span className="px-3 py-1 rounded-full text-xs font-black uppercase ring-1 bg-primary/20 text-primary ring-primary/30">
                              CANLI
                            </span>
                          </div>
                        </div>
                        
                        <div className="md:absolute md:right-0">
                          <button 
                            onClick={(e) => toggleFavorite(e, activeChannel.id)}
                            className={cn(
                              "w-14 h-14 rounded-full flex items-center justify-center transition-all border",
                              favorites.includes(activeChannel.id)
                                ? "bg-primary border-primary text-white shadow-xl shadow-primary/30"
                                : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                            )}
                          >
                            <Heart size={24} fill={favorites.includes(activeChannel.id) ? "currentColor" : "none"} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                       <div className="flex items-center gap-3 mb-8">
                          <TrendingUp className="text-primary" size={24} />
                          <h3 className="text-xl font-black tracking-tight uppercase">En Çok İzlenen Kanallar</h3>
                       </div>
                       
                       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {topWatchedChannels.map((c, index) => (
                            <div 
                              key={c.id} 
                              onClick={() => handleChannelSelect(c.id)}
                              className="group flex items-center gap-3 p-3 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/20 transition-all cursor-pointer relative overflow-hidden"
                            >
                               <div className="absolute top-0 left-0 w-6 h-6 bg-primary text-white flex items-center justify-center text-[10px] font-black rounded-br-xl shadow-lg z-10">
                                  {index + 1}
                               </div>
                               <div className="w-10 h-10 bg-black rounded-xl p-2 border border-white/10 shrink-0">
                                  <img src={c.logo} className="w-full h-full object-contain" />
                               </div>
                               <div className="min-w-0">
                                  <div className="text-xs font-bold truncate group-hover:text-primary transition-colors">{c.name}</div>
                                  <div className="text-[8px] text-white/30 font-black uppercase tracking-widest">{c.category}</div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>

                  <div className="hidden xl:block col-span-4 h-fit sticky top-8">
                    <div className="bg-white/[0.03] border border-white/5 backdrop-blur-2xl p-6 rounded-[2rem] space-y-6">
                       <h3 className="text-xs font-black uppercase tracking-widest text-primary">Sizin İçin Önerilenler</h3>
                       <div className="space-y-3">
                          {channels.filter(c => c.id !== activeChannelId).slice(0, 5).map(c => (
                            <div 
                              key={c.id} 
                              onClick={() => handleChannelSelect(c.id)}
                              className="group flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/5"
                            >
                               <div className="w-12 h-12 bg-black rounded-xl p-2 border border-white/5 group-hover:border-primary/30 transition-colors flex items-center justify-center">
                                  <img src={c.logo} className="w-full h-full object-contain" />
                               </div>
                               <div className="flex-1">
                                  <div className="text-sm font-bold opacity-80 group-hover:opacity-100">{c.name}</div>
                                  <div className="text-[10px] text-white/40 font-black uppercase tracking-widest">{c.category}</div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : viewingCategory ? (
              <div className="animate-in fade-in slide-in-from-right-10 duration-700 pb-20">
                 <button 
                  onClick={() => setViewingCategory(null)}
                  className="flex items-center gap-3 text-white/40 hover:text-white transition-colors mb-10 group"
                 >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                       <ChevronRight size={20} className="rotate-180" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-widest">Geri Dön</span>
                 </button>

                 <header className="mb-16 relative">
                    <div className="absolute -left-10 top-0 w-1 h-32 bg-primary blur-sm" />
                    <h2 className="text-5xl md:text-8xl font-black tracking-tighter mb-4 leading-none">{viewingCategory}</h2>
                    <p className="text-white/40 text-xs md:text-sm font-black uppercase tracking-[0.5em] italic">Bu Kategorideki Tüm Yayınlar</p>
                 </header>

                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 md:gap-8 transition-all">
                    {(viewingCategory === "Tümü" 
                      ? channels 
                      : channels.filter(c => c.category === viewingCategory)
                    ).map(channel => (
                      <div key={channel.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <ChannelCard 
                          channel={channel}
                          isActive={activeChannelId === channel.id}
                          isFavorite={favorites.includes(channel.id)}
                          onSelect={handleChannelSelect}
                          onToggleFavorite={toggleFavorite}
                        />
                      </div>
                    ))}
                 </div>
              </div>
            ) : activeTab === 'profile' ? (
              <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 pb-20">
                {showAuth && !user ? (
                   <div className="pt-12 md:pt-20 relative">
                      <button 
                        onClick={() => setShowAuth(false)}
                        className="absolute top-0 left-4 md:left-0 flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
                      >
                        <ChevronRight size={18} className="rotate-180" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Geri Dön</span>
                      </button>
                      <Auth onLocalLogin={handleLocalLogin} />
                   </div>
                ) : (
                  <>
                    <section className="relative px-4 py-12 md:py-20 mb-12">
                       <div className="absolute inset-0 bg-linear-to-b from-primary/5 to-transparent rounded-[3rem] -z-10" />
                       <div className="flex flex-col items-center text-center">
                          <div className="relative group mb-6">
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-linear-to-br from-indigo-500 via-purple-600 to-pink-500 p-1.5 shadow-[0_0_50px_rgba(139,92,246,0.3)]">
                              <div className="w-full h-full rounded-full bg-black border-4 border-white/10 flex items-center justify-center overflow-hidden">
                                 {user?.photoURL ? (
                                   <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                                 ) : (
                                   <User className="w-16 h-16 text-white/20" />
                                 )}
                              </div>
                            </div>
                            {isAdmin && (
                              <div className="absolute top-0 right-0 bg-yellow-500 text-black p-2 rounded-full shadow-xl" title="Yönetici">
                                <Shield size={18} />
                              </div>
                            )}
                          </div>
                          
                          <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-2">
                            {user ? (user.displayName || 'Üye') : 'Misafir'}
                          </h2>
                          
                          <p className="text-white/40 text-xs font-black uppercase tracking-[0.4em] mb-8">
                            {isAdmin ? 'Sistem Yöneticisi' : user ? 'Premium Üye Değil • Standart Plan' : 'Giriş Yapılmadı'}
                          </p>
                          
                          <div className="flex flex-wrap items-center justify-center gap-4">
                            {isAdmin && (
                              <>
                                <button 
                                  onClick={() => { setAdminInitialTab('channels'); setShowAdminPanel(true); }}
                                  className="bg-yellow-500 text-black px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-yellow-500/20 hover:bg-yellow-400 transition-colors"
                                >
                                  <Shield size={16} />
                                  YÖNETİCİ PANELİ
                                </button>
                                <button 
                                  onClick={() => { setAdminInitialTab('notifications'); setShowAdminPanel(true); }}
                                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all relative group"
                                >
                                  <Bell size={16} className={cn(pendingReportsCount > 0 && "animate-tada")} />
                                  BİLDİRİMLER
                                  {pendingReportsCount > 0 && (
                                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-black shadow-lg">
                                      {pendingReportsCount}
                                    </span>
                                  )}
                                </button>
                                <button 
                                  onClick={() => setShowStats(true)}
                                  className="bg-zinc-800 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 border border-white/10 hover:bg-zinc-700 transition-colors"
                                >
                                  <BarChart3 size={16} />
                                  İSTATİSTİKLER
                                </button>
                              </>
                            )}
                            
                            {user ? (
                              <button 
                                onClick={handleSignOut}
                                className="bg-white/10 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 border border-white/10 hover:bg-white/20 transition-colors"
                              >
                                <LogOut size={16} />
                                ÇIKIŞ YAP
                              </button>
                            ) : (
                              <button 
                                onClick={() => setShowAuth(true)}
                                className="bg-white text-black px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-white/10 hover:bg-zinc-200 transition-colors"
                              >
                                <LogIn size={16} />
                                GİRİŞ YAP / KAYIT OL
                              </button>
                            )}
                          </div>
                       </div>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4">
                       <section className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                          <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                               <Heart className="text-red-500" fill="currentColor" size={20} />
                               <h3 className="text-xl font-black tracking-tight uppercase">Favori Listem</h3>
                            </div>
                            <span className="text-[10px] font-black text-white/20">{favorites.length} KANAL</span>
                          </div>
                          
                          <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                            {favorites.length > 0 ? (
                              channels.filter(c => favorites.includes(c.id)).map(c => (
                                <div 
                                  key={c.id}
                                  onClick={() => handleChannelSelect(c.id)}
                                  className="group flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-primary/20 transition-all duration-500 cursor-pointer"
                                >
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-black rounded-xl p-2 border border-white/10">
                                         <img src={c.logo} className="w-full h-full object-contain" />
                                      </div>
                                      <div>
                                         <div className="text-sm font-bold">{c.name}</div>
                                         <div className="text-[10px] text-white/30 font-black uppercase tracking-widest">{c.category}</div>
                                      </div>
                                   </div>
                                   <ChevronRight size={16} className="text-white/20 group-hover:text-primary transition-colors" />
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-20 bg-white/[0.01] rounded-2xl border border-dashed border-white/10">
                                 <Heart size={40} className="mx-auto mb-4 text-white/10" />
                                 <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Henüz favori eklenmemiş</p>
                              </div>
                            )}
                          </div>
                       </section>

                       <section className="space-y-8">
                          <div className="bg-white/[0.02] border border-white/5 rounded-[2.5rem] p-8">
                            <div className="flex items-center gap-3 mb-8">
                               <History className="text-primary" size={20} />
                               <h3 className="text-xl font-black tracking-tight uppercase">Son İzlediklerim</h3>
                            </div>
                            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                               {channels.slice(2, 5).map(c => (
                                  <div 
                                    key={c.id} 
                                    onClick={() => handleChannelSelect(c.id)}
                                    className="flex-none w-20 group cursor-pointer"
                                  >
                                     <div className="aspect-square bg-white/5 rounded-2xl flex items-center justify-center p-3 border border-white/5 group-hover:border-primary/50 transition-colors mb-3">
                                        <img src={c.logo} className="w-full h-full object-contain transition-all" />
                                     </div>
                                     <div className="text-[8px] font-black uppercase tracking-tighter truncate text-center text-white/40">{c.name}</div>
                                  </div>
                               ))}
                            </div>
                          </div>

                          <div className="bg-[#120805] border border-primary/10 rounded-[2.5rem] p-8 relative overflow-hidden group">
                             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -z-10 group-hover:bg-primary/20 transition-colors" />
                             <div className="flex items-center gap-3 mb-6">
                                <Star className="text-yellow-500" fill="currentColor" size={20} />
                                <h3 className="text-xl font-black tracking-tight uppercase">Sizin İçin Önerilenler</h3>
                             </div>
                             <div className="space-y-3">
                                {channels.slice(6, 9).map(c => (
                                   <div 
                                    key={c.id} 
                                    onClick={() => handleChannelSelect(c.id)}
                                    className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-all cursor-pointer group/item"
                                   >
                                      <div className="w-12 h-12 bg-black rounded-2xl p-2.5 border border-white/5">
                                         <img src={c.logo} className="w-full h-full object-contain" />
                                      </div>
                                      <div className="flex-1">
                                         <div className="text-sm font-bold mb-0.5">{c.name}</div>
                                         <div className="text-[8px] font-black uppercase text-primary tracking-widest">{c.category}</div>
                                      </div>
                                      <div className="bg-primary/10 px-3 py-1.5 rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity">
                                         <span className="text-[8px] font-black text-primary uppercase">İZLE</span>
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                       </section>
                    </div>
                  </>
                )}
              </div>
            ) : activeTab === 'channels' ? (
              <div className="animate-in fade-in slide-in-from-bottom-10 duration-700 pb-20 space-y-12">
                <section>
                   <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-12">
                      <div className="bg-white/5 p-1 rounded-2xl flex items-center gap-1 border border-white/10 w-full sm:w-auto invisible">
                         {/* Hidden TV/Radio toggle as requested */}
                      </div>
                      
                      <div className="relative w-full sm:w-80">
                         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                         <input 
                           type="text"
                           placeholder="Kanal ara..."
                           value={searchQuery}
                           onChange={(e) => setSearchQuery(e.target.value)}
                           className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-primary/50 focus:bg-white/10 transition-all text-xs"
                         />
                      </div>
                   </div>

                   <div className="flex gap-3 overflow-x-auto no-scrollbar pb-8">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={cn(
                              "px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-3",
                              activeCategory === cat 
                                ? "bg-primary border-primary text-white shadow-xl shadow-primary/30" 
                                : "bg-white/[0.03] border-white/10 text-white/40 hover:text-white hover:bg-white/5"
                            )}
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", activeCategory === cat ? "bg-white" : "bg-white/20")}></span>
                            {cat}
                          </button>
                        ))}
                   </div>

                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6 md:gap-8 transition-all">
                      {filteredChannels.length > 0 ? filteredChannels.map(channel => (
                        <div key={channel.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                          <ChannelCard 
                            channel={channel}
                            isActive={activeChannelId === channel.id}
                            isFavorite={favorites.includes(channel.id)}
                            onSelect={handleChannelSelect}
                            onToggleFavorite={toggleFavorite}
                          />
                        </div>
                      )) : (
                        <div className="col-span-full py-20 text-center bg-white/[0.01] rounded-[3rem] border border-dashed border-white/5">
                           <Tv size={40} className="mx-auto mb-4 text-white/10" />
                           <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em]">Sonuç Bulunamadı</p>
                        </div>
                      )}
                   </div>
                </section>
              </div>
            ) : (
              <div className="space-y-16 animate-in fade-in duration-700 pb-32">
                {featuredChannel ? (
                  <section className="relative -mx-4 md:mx-0 -mt-4 md:mt-0 rounded-b-[3rem] md:rounded-[3rem] overflow-hidden group">
                    <div 
                      onClick={() => handleChannelSelect(featuredChannel.id)}
                      className="relative aspect-[3/4] md:aspect-video w-full overflow-hidden cursor-pointer bg-zinc-900"
                    >
                      <HeroBackgroundVideo 
                        channel={featuredChannel} 
                        isReady={isHeroReady} 
                        onReady={() => setIsHeroReady(true)} 
                      />
                      
                      <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/60 to-[#0a0502] md:to-black/90" />
                      
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-8 md:p-16">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          key={featuredChannel.id}
                          className="w-40 h-40 md:w-72 md:h-72 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3.5rem] md:rounded-[5rem] p-10 md:p-14 mb-8 md:mb-10 shadow-[0_0_120px_rgba(220,38,38,0.3)] relative group/logo"
                        >
                           <img src={featuredChannel.logo} className="w-full h-full object-contain filter drop-shadow-2xl group-hover/logo:scale-110 transition-transform duration-700" alt={featuredChannel.name} />
                           <div className="absolute -top-3 -right-3 md:-top-4 md:-right-4 bg-primary text-white p-2.5 md:p-4 rounded-xl md:rounded-2xl shadow-2xl animate-bounce-slow">
                              <Tv className="w-5 h-5 md:w-8 md:h-8" />
                           </div>
                        </motion.div>
                        
                        <div className="text-center max-w-4xl">
                          <div className="flex items-center justify-center gap-2 md:gap-3 mb-4 md:mb-6">
                            <span className="flex h-2.5 w-2.5 md:h-3 md:w-3 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 md:h-3 md:w-3 bg-red-500"></span>
                            </span>
                            <span className="text-[10px] md:text-base font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-white/60">SİZİN İÇİN ÖNE ÇIKAN</span>
                          </div>
                          <h2 className="text-4xl md:text-9xl font-black tracking-tighter mb-8 md:mb-10 text-glow leading-none uppercase">{featuredChannel.name}</h2>
                          <div className="flex items-center justify-center">
                             <div className="bg-primary text-white px-10 md:px-16 py-4 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-xs md:text-lg uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 active:scale-95 transition-all hover:scale-105">
                                HEMEN İZLE
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                ) : (
                  <div className="h-64 flex items-center justify-center text-white/20">Kanal bulunamadı.</div>
                )}

                <section>
                   <div className="flex items-center justify-between mb-8 px-2">
                      <div>
                         <h3 className="text-2xl md:text-4xl font-black tracking-tighter">Popüler Kanallar</h3>
                         <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Trend Olan Yayınlar</p>
                      </div>
                      <button 
                        onClick={() => setViewingCategory("Tümü")}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                      >
                        Tümünü Gör
                      </button>
                   </div>
                   
                   <div className="flex gap-6 overflow-x-auto no-scrollbar px-2 -mx-4 md:mx-0 pb-4">
                      {topWatchedChannels.slice(0, 10).map((c) => (
                        <div 
                          key={c.id}
                          onClick={() => handleChannelSelect(c.id)}
                          className="flex-none w-[240px] md:w-[280px] group relative aspect-square bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden cursor-pointer hover:border-primary/20 transition-all duration-500"
                        >
                          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent z-10" />
                          <img src={c.logo} className="absolute inset-0 w-1/2 h-1/2 object-contain m-auto opacity-80 group-hover:scale-110 transition-all duration-700" alt="" />
                          
                          <div className="absolute bottom-6 left-6 right-6 z-20">
                             <h4 className="text-xl md:text-2xl font-black tracking-tight text-white mb-2 uppercase italic">{c.name}</h4>
                          </div>
                        </div>
                      ))}
                   </div>
                </section>

                <section>
                   <div className="flex items-center justify-between mb-8 px-2">
                      <div>
                         <h3 className="text-2xl md:text-3xl font-black tracking-tighter">Çocuklar İçin</h3>
                         <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">En Sevilen Çizgi Filmler</p>
                      </div>
                      <button 
                        onClick={() => setViewingCategory("Çocuk")}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                      >
                        Tümünü Gör
                      </button>
                   </div>
                   
                   <div className="flex gap-6 overflow-x-auto no-scrollbar px-2 -mx-4 md:mx-0 pb-4">
                      {discoverSections.cocuk.slice(0, 10).map((c) => (
                        <div 
                          key={c.id}
                          onClick={() => handleChannelSelect(c.id)}
                          className="flex-none w-[200px] md:w-[240px] group relative aspect-[4/5] bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden cursor-pointer hover:border-primary/20 transition-all duration-500"
                        >
                          <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent z-10" />
                          <img src={c.logo} className="absolute inset-0 w-2/3 h-2/3 object-contain m-auto opacity-40 group-hover:scale-110 transition-all duration-700" alt="" />
                          <div className="absolute bottom-6 left-6 right-6 z-20">
                             <h4 className="text-lg font-black tracking-tight text-white mb-1 uppercase">{c.name}</h4>
                             <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Çizgi Film</div>
                          </div>
                        </div>
                      ))}
                   </div>
                </section>

                <section>
                   <div className="flex items-center justify-between mb-8 px-2">
                      <div>
                         <h3 className="text-2xl md:text-3xl font-black tracking-tighter">Yarışma Heyecanı</h3>
                         <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">En Popüler Yarışmalar</p>
                      </div>
                      <button 
                        onClick={() => setViewingCategory("Yarışma")}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                      >
                        Tümünü Gör
                      </button>
                   </div>
                   
                   <div className="flex gap-6 overflow-x-auto no-scrollbar px-2 -mx-4 md:mx-0 pb-4">
                      {discoverSections.yarisma.slice(0, 10).map((c) => (
                        <div 
                          key={c.id}
                          onClick={() => handleChannelSelect(c.id)}
                          className="flex-none w-[200px] md:w-[240px] group relative aspect-[4/5] bg-white/[0.02] border border-white/5 rounded-[2.5rem] overflow-hidden cursor-pointer hover:border-primary/20 transition-all duration-500"
                        >
                          <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent z-10" />
                          <img src={c.logo} className="absolute inset-0 w-2/3 h-2/3 object-contain m-auto opacity-40 group-hover:scale-110 transition-all duration-700" alt="" />
                          <div className="absolute bottom-6 left-6 right-6 z-20">
                             <h4 className="text-lg font-black tracking-tight text-white mb-1 uppercase">{c.name}</h4>
                             <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Yarışma</div>
                          </div>
                        </div>
                      ))}
                   </div>
                </section>

                <section>
                   <div className="flex items-center justify-between mb-8 px-2">
                      <div>
                         <h3 className="text-2xl md:text-3xl font-black tracking-tighter">Haberin Merkezi</h3>
                         <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Dünyadan ve Türkiye'den Haberler</p>
                      </div>
                      <button 
                        onClick={() => setViewingCategory("Haber")}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                      >
                        Tümünü Gör
                      </button>
                   </div>
                   
                   <div className="flex gap-6 overflow-x-auto no-scrollbar px-2 -mx-4 md:mx-0 pb-4">
                      {discoverSections.haber.slice(0, 12).map((c) => (
                        <div 
                          key={c.id}
                          onClick={() => handleChannelSelect(c.id)}
                          className="flex-none w-[180px] md:w-[220px] group relative aspect-video bg-white/[0.02] border border-white/5 rounded-[1.5rem] overflow-hidden cursor-pointer hover:border-primary/20 transition-all duration-500"
                        >
                          <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent z-10" />
                          <img src={c.logo} className="absolute inset-0 w-1/2 h-1/2 object-contain m-auto opacity-60 group-hover:scale-110 transition-all duration-700" alt="" />
                          <div className="absolute bottom-4 left-5 right-5 z-20">
                             <h4 className="text-sm font-black tracking-tight text-white line-clamp-1 uppercase">{c.name}</h4>
                             <div className="text-[8px] font-bold text-white/30 uppercase tracking-widest">CANLI YAYIN</div>
                          </div>
                        </div>
                      ))}
                   </div>
                </section>

                <section>
                   <div className="flex items-center justify-between mb-8 px-2">
                      <div>
                         <h3 className="text-2xl md:text-3xl font-black tracking-tighter">Sahne Senin</h3>
                         <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">En Sevilen Müzik Kanalları</p>
                      </div>
                      <button 
                        onClick={() => setViewingCategory("Müzik")}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                      >
                        Tümünü Gör
                      </button>
                   </div>
                   
                   <div className="flex gap-6 overflow-x-auto no-scrollbar px-2 -mx-4 md:mx-0 pb-4">
                      {discoverSections.muzik.slice(0, 12).map((c) => (
                        <div 
                          key={c.id}
                          onClick={() => handleChannelSelect(c.id)}
                          className="flex-none w-[200px] md:w-[240px] group relative aspect-square bg-linear-to-br from-indigo-500/10 to-purple-500/10 border border-white/5 rounded-full overflow-hidden cursor-pointer hover:border-primary/20 transition-all duration-500"
                        >
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                          <img src={c.logo} className="absolute inset-0 w-1/2 h-1/2 object-contain m-auto opacity-70 group-hover:scale-125 transition-transform duration-1000" alt="" />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                             <div className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl scale-75 group-hover:scale-100 transition-transform">
                                <Play fill="currentColor" size={20} className="ml-1" />
                             </div>
                          </div>
                          <div className="absolute bottom-6 left-0 right-0 text-center z-20">
                             <h4 className="text-sm font-black tracking-tight text-white uppercase">{c.name}</h4>
                          </div>
                        </div>
                      ))}
                   </div>
                </section>

                <section>
                   <div className="flex items-center justify-between mb-8 px-2">
                      <div>
                         <h3 className="text-2xl md:text-3xl font-black tracking-tighter">Sporun Nabzı</h3>
                         <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Tribün Heyecanı Evinizde</p>
                      </div>
                      <button 
                        onClick={() => setViewingCategory("Spor")}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                      >
                        Tümünü Gör
                      </button>
                   </div>
                   
                   <div className="flex gap-6 overflow-x-auto no-scrollbar px-2 -mx-4 md:mx-0 pb-4">
                      {discoverSections.spor.slice(0, 12).map((c) => (
                        <div 
                          key={c.id}
                          onClick={() => handleChannelSelect(c.id)}
                          className="flex-none w-[260px] md:w-[320px] group relative aspect-video bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden cursor-pointer hover:border-primary/20 transition-all duration-500"
                        >
                          <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent z-10" />
                          <img src={c.logo} className="absolute inset-0 w-1/3 h-1/3 object-contain m-auto opacity-40 group-hover:scale-110 transition-all duration-700 filter drop-shadow-2xl" alt="" />
                          <div className="absolute top-4 left-6 bg-primary text-white text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">CANLI</div>
                          <div className="absolute bottom-6 left-8 right-8 z-20">
                             <h4 className="text-xl font-black tracking-tight text-white mb-1 uppercase">{c.name}</h4>
                             <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Maç Heyecanı</div>
                          </div>
                        </div>
                      ))}
                   </div>
                </section>

                <section>
                   <div className="flex items-center justify-between mb-8 px-2">
                      <div>
                         <h3 className="text-2xl md:text-3xl font-black tracking-tighter">Belgesel Dünyası</h3>
                         <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em] mt-1 italic">Keşfedilecek Çok Şey Var</p>
                      </div>
                      <button 
                        onClick={() => setViewingCategory("Belgesel")}
                        className="text-[10px] font-black uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                      >
                        Tümünü Gör
                      </button>
                   </div>
                   
                   <div className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar px-2 -mx-4 md:mx-0 pb-4">
                      {discoverSections.belgesel.slice(0, 12).map((c) => (
                        <div 
                          key={c.id}
                          onClick={() => handleChannelSelect(c.id)}
                          className="flex-none w-[160px] md:w-[200px] text-center group cursor-pointer"
                        >
                          <div className="aspect-[3/4] bg-zinc-900 rounded-[2rem] p-6 mb-4 border border-white/5 group-hover:border-primary/30 transition-all relative overflow-hidden">
                             <div className="absolute inset-0 bg-linear-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                             <img src={c.logo} className="w-full h-full object-contain transition-all duration-500 group-hover:scale-110" alt="" />
                          </div>
                          <h4 className="text-xs font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors uppercase">{c.name}</h4>
                        </div>
                      ))}
                   </div>
                </section>

                <footer className="mt-32 border-t border-white/5 pt-16 pb-8 px-4 md:px-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-2 md:col-span-1 space-y-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.5)]">
                          <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                        </div>
                        <h1 className="text-lg font-bold tracking-tight uppercase">Canlı Tv <span className="text-primary italic">+</span></h1>
                      </div>
                      <p className="text-white/40 text-xs leading-relaxed max-w-xs font-medium">
                        Televizyon keyfini her yerde, her cihazda doyasıya yaşayın. En sevdiğiniz kanallar artık cebinizde.
                      </p>
                    </div>
                    
                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Ürün</h4>
                      <ul className="space-y-4 text-white/40 text-xs font-black uppercase tracking-widest">
                        <li className="hover:text-primary transition-colors cursor-pointer">Özellikler</li>
                        <li className="hover:text-primary transition-colors cursor-pointer">Mobil Uygulama</li>
                      </ul>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Destek</h4>
                      <ul className="space-y-4 text-white/40 text-xs font-black uppercase tracking-widest">
                        <li className="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer">
                          <Mail size={14} /> İletişim
                        </li>
                        <li className="hover:text-primary transition-colors cursor-pointer">S.S.S.</li>
                      </ul>
                    </div>

                    <div className="space-y-6">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white">Yasal</h4>
                      <ul className="space-y-4 text-white/40 text-xs font-black uppercase tracking-widest">
                        <li>
                          <button 
                            type="button"
                            onClick={() => setShowCopyright(true)}
                            className="hover:text-primary transition-colors cursor-pointer text-left"
                          >
                            Hak Sahibi Politikası
                          </button>
                        </li>
                        <li>
                          <button 
                            type="button"
                            onClick={() => setShowPrivacy(true)}
                            className="hover:text-primary transition-colors cursor-pointer text-left"
                          >
                            Gizlilik Politikası
                          </button>
                        </li>
                        <li className="hover:text-primary transition-colors cursor-pointer">KVKK</li>
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 px-4">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">
                      © 2024 GostaSoftware. Tüm hakları saklıdır.
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:bg-primary/20 hover:text-primary transition-all cursor-pointer border border-white/5">
                        <Instagram size={18} />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:bg-primary/20 hover:text-primary transition-all cursor-pointer border border-white/5">
                        <Mail size={18} />
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/40 hover:bg-primary/20 hover:text-primary transition-all cursor-pointer border border-white/5">
                        <Globe size={18} />
                      </div>
                    </div>
                  </div>
                </footer>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className={cn(
        "lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-3xl border-t border-white/5 z-50 flex items-center justify-around px-8 transition-transform duration-300",
        isVideoFullscreen && "translate-y-full"
      )}>
        <button 
          onClick={() => { setActiveChannelId(null); setActiveTab('discover'); }}
          className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'discover' && !activeChannelId ? "text-primary" : "text-white/30")}
        >
          <Compass size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest tracking-[0.2em]">KEŞFET</span>
        </button>
        <button 
          onClick={() => { setActiveTab('channels'); setActiveChannelId(null); }}
          className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'channels' && !activeChannelId ? "text-primary" : "text-white/30")}
        >
          <Tv size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest tracking-[0.2em]">KANALLAR</span>
        </button>
        <button 
          onClick={() => { setActiveTab('profile'); setActiveChannelId(null); }}
          className={cn("flex flex-col items-center gap-1 transition-colors", activeTab === 'profile' && !activeChannelId ? "text-primary" : "text-white/30")}
        >
          <User size={20} />
          <span className="text-[8px] font-black uppercase tracking-widest tracking-[0.2em]">PROFİL</span>
        </button>
      </footer>

      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes tada {
          0% { transform: scale(1); }
          10%, 20% { transform: scale(0.9) rotate(-3deg); }
          30%, 50%, 70%, 90% { transform: scale(1.1) rotate(3deg); }
          40%, 60%, 80% { transform: scale(1.1) rotate(-3deg); }
          100% { transform: scale(1) rotate(0); }
        }
        .animate-tada {
          animation: tada 1s infinite;
        }
      `}</style>

      <AnimatePresence>
        {showAdminPanel && isAdmin && (
          <AdminPanel
            channels={channels}
            onClose={() => setShowAdminPanel(false)} 
            onChannelsUpdated={refreshLocalChannels}
            initialTab={adminInitialTab}
          />
        )}
        {showStats && isAdmin && (
          <StatsPanel
            channels={channels}
            onClose={() => setShowStats(false)}
          />
        )}
        {showPrivacy && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/95 backdrop-blur-xl"
            onClick={() => setShowPrivacy(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-[#0f0a07] border border-white/10 w-full max-w-4xl max-h-[85vh] rounded-[3rem] flex flex-col shadow-[0_0_80px_rgba(220,38,38,0.15)] relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-transparent via-primary to-transparent opacity-50" />
              
              <div className="p-8 md:p-12 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-5">
                   <div className="w-2.5 h-10 bg-primary rounded-full shadow-[0_0_20px_rgba(220,38,38,0.6)]" />
                   <div>
                      <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter italic leading-none">Gizlilik <span className="text-primary">Politikası</span></h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mt-2">Privacy & Security Center</p>
                   </div>
                </div>
                <button onClick={() => setShowPrivacy(false)} className="w-14 h-14 rounded-[1.5rem] bg-white/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all active:scale-90 group border border-white/5">
                  <X size={28} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 md:p-14 space-y-10 text-sm md:text-base leading-relaxed text-white/60 no-scrollbar">
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div className="flex items-center gap-2">
                     <Shield size={14} className="text-primary" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Son Güncelleme: 10 Mayıs 2026</span>
                  </div>
                </div>
                
                <p className="text-white/80 font-medium text-lg leading-relaxed">
                   Bu Gizlilik Politikası, <strong className="text-white italic">GostaSoftware</strong> tarafından geliştirilen <strong>Canlı Tv+</strong> mobil uygulamasını (“Uygulama”) kullanan kullanıcıların kişisel verilerinin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.
                </p>

                <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 italic text-white/90 shadow-inner">
                  Canlı Tv+ uygulamasını kullanarak bu Gizlilik Politikası’nı kabul etmiş sayılırsınız.
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-primary pl-6 bg-linear-to-r from-primary/10 to-transparent py-2">1. Toplanan Bilgiler</h3>
                  <div className="pl-6 space-y-6">
                    <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-2">
                       <p className="text-primary font-black uppercase text-xs tracking-widest">a) Cihaz Bilgileri</p>
                       <p className="text-sm opacity-70">Cihaz modeli, işletim sistemi sürümü, uygulama sürümü, dil ve bölge ayarları, benzersiz cihaz tanımlayıcıları (gerekliyse).</p>
                    </div>
                    <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-2">
                       <p className="text-primary font-black uppercase text-xs tracking-widest">b) Kullanım Verileri</p>
                       <p className="text-sm opacity-70">İzlenen yayınlara ilişkin anonim kullanım bilgileri, uygulama içi tıklamalar ve gezinme verileri, çökme raporları ve hata kayıtları.</p>
                    </div>
                    <div className="bg-white/[0.02] p-6 rounded-2xl border border-white/5 space-y-2">
                       <p className="text-primary font-black uppercase text-xs tracking-widest">c) Reklam ve Analitik Verileri</p>
                       <p className="text-sm opacity-70">Uygulama, performans analizi ve reklam gösterimi amacıyla üçüncü taraf hizmetler kullanabilir. Bu hizmetler anonim veriler toplayabilir.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-primary pl-6 bg-linear-to-r from-primary/10 to-transparent py-2">2. Bilgilerin Kullanımı</h3>
                  <ul className="pl-12 list-disc space-y-3 font-medium">
                    <li>Uygulamanın çalışmasını sağlamak</li>
                    <li>Hizmet kalitesini geliştirmek</li>
                    <li>Hata ve performans sorunlarını tespit etmek</li>
                    <li>Kullanıcı deneyimini iyileştirmek</li>
                    <li>Güvenlik ve kötüye kullanım önlemleri almak</li>
                    <li>Yasal yükümlülükleri yerine getirmek</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-primary pl-6 bg-linear-to-r from-primary/10 to-transparent py-2">3. Kişisel Verilerin Paylaşılması</h3>
                  <p className="pl-6">GostaSoftware, kullanıcıların kişisel verilerini satmaz. Ancak aşağıdaki durumlarda paylaşım yapılabilir:</p>
                  <ul className="pl-12 list-disc space-y-3 font-medium">
                    <li>Yasal zorunluluklar kapsamında resmi makamlarla</li>
                    <li>Teknik hizmet sağlayıcılarla (barındırma, analiz, reklam vb.)</li>
                    <li>Uygulamanın güvenliğini sağlamak amacıyla gerekli üçüncü taraflarla</li>
                  </ul>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-primary pl-6 bg-linear-to-r from-primary/10 to-transparent py-2">4. Çerezler ve Benzeri Teknolojiler</h3>
                  <p className="pl-6">Uygulama, kullanıcı deneyimini geliştirmek ve analiz yapmak amacıyla çerez benzeri teknolojiler veya mobil tanımlayıcılar kullanabilir.</p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-primary pl-6 bg-linear-to-r from-primary/10 to-transparent py-2">5. Veri Güvenliği</h3>
                  <p className="pl-6">Kullanıcı bilgilerinin korunması için makul teknik ve idari güvenlik önlemleri alınmaktadır. Ancak internet üzerinden yapılan veri iletimlerinin tamamen güvenli olduğu garanti edilemez.</p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-primary pl-6 bg-linear-to-r from-primary/10 to-transparent py-2">6. Üçüncü Taraf Hizmetler</h3>
                  <p className="pl-6">Canlı Tv+, üçüncü taraf yayın bağlantıları veya hizmetlere erişim sağlayabilir. Bu hizmetlerin kendi gizlilik politikaları geçerliyse GostaSoftware sorumluluk kabul etmez.</p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-primary pl-6 bg-linear-to-r from-primary/10 to-transparent py-2">7. Çocukların Gizliliği</h3>
                  <p className="pl-6">Canlı Tv+ bilerek 13 yaş altındaki çocuklardan kişisel veri toplamaz. Böyle bir durum tespit edilirse ilgili veriler derhal silinir.</p>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-primary pl-6 bg-linear-to-r from-primary/10 to-transparent py-2">8. Kullanıcı Hakları</h3>
                  <div className="pl-6 space-y-4">
                     <p>Yürürlükteki mevzuata bağlı olarak kullanıcılar:</p>
                     <div className="flex flex-wrap gap-2">
                        {["Veri Öğrenme", "Düzeltme Talebi", "Silme Talebi", "İşleme İtiraz"].map(h => (
                           <span key={h} className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-[10px] font-black uppercase">{h}</span>
                        ))}
                     </div>
                     <p>haklarına sahip olabilir. Bu talepler için bizimle iletişime geçebilirsiniz.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-primary pl-6 bg-linear-to-r from-primary/10 to-transparent py-2">9. Politika Değişiklikleri</h3>
                  <p className="pl-6">Bu Gizlilik Politikası gerektiğinde güncellenebilir. Güncel sürüm uygulama içerisinde yayımlandığı anda yürürlüğe girer.</p>
                </div>

                <div className="space-y-8 pt-10 border-t border-white/5">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-primary pl-6 bg-linear-to-r from-primary/10 to-transparent py-2">10. İletişim</h3>
                  <div className="bg-white/[0.03] p-10 rounded-[2.5rem] space-y-4 border border-white/5 relative overflow-hidden group/card">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -z-10 group-hover/card:bg-primary/20 transition-colors" />
                    <p className="text-white font-black tracking-tight text-2xl uppercase italic">GostaSoftware</p>
                    <div className="space-y-2">
                      <p className="text-sm text-white/40 uppercase font-bold tracking-widest">Proje: <span className="text-white">Canlı Tv+</span></p>
                      <p className="text-sm text-white/40 uppercase font-bold tracking-widest flex items-center gap-2">
                         E-posta: <span className="text-primary italic font-black select-all">Gostasoftware@gmail.com</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-center py-20 border-t border-white/5 space-y-4">
                   <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                      <Shield size={20} className="text-white/20" />
                   </div>
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 italic max-w-sm mx-auto">
                      Canlı Tv+ uygulamasını kullanarak bu Gizlilik Politikası’nı okuduğunuzu ve kabul ettiğinizi beyan etmiş olursunuz.
                   </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showCopyright && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-12 bg-black/95 backdrop-blur-xl"
            onClick={() => setShowCopyright(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="bg-[#0b0f12] border border-white/10 w-full max-w-4xl max-h-[85vh] rounded-[3rem] flex flex-col shadow-[0_0_80px_rgba(255,255,255,0.05)] relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-transparent via-indigo-500 to-transparent opacity-50" />
              
              <div className="p-8 md:p-12 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-5">
                   <div className="w-2.5 h-10 bg-indigo-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)]" />
                   <div>
                      <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter italic leading-none text-white">Hak Sahibi <span className="text-indigo-500">Politikası</span></h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mt-2">Copyright & Intellectual Property</p>
                   </div>
                </div>
                <button onClick={() => setShowCopyright(false)} className="w-14 h-14 rounded-[1.5rem] bg-white/5 flex items-center justify-center hover:bg-indigo-500/20 hover:text-indigo-500 transition-all active:scale-90 group border border-white/5">
                  <X size={28} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 md:p-14 space-y-10 text-sm md:text-base leading-relaxed text-white/60 no-scrollbar">
                <div className="flex items-center justify-between border-b border-white/5 pb-6">
                  <div className="flex items-center gap-2">
                     <Scale size={14} className="text-indigo-500" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-white/40 italic">Son Güncelleme: 09 Mayıs 2026</span>
                  </div>
                </div>
                
                <div className="space-y-4 text-white/80">
                  <p className="font-black text-xl uppercase tracking-tighter">HAK SAHİBİ BAŞVURU POLİTİKASI</p>
                  <p className="text-xs uppercase font-bold text-white/40">Canlı Tv+ – GostaSoftware</p>
                </div>

                <p className="text-white/70">
                   Canlı Tv+, GostaSoftware tarafından geliştirilen bir canlı televizyon yayın platformudur. Platformumuzda yer alan yayın bağlantıları, medya içerikleri, kanal logoları, görseller, marka isimleri ve diğer tüm materyaller ilgili yayıncı kuruluşların, içerik üreticilerinin veya hak sahiplerinin mülkiyetinde olabilir.
                </p>

                <p className="text-white/70">
                   Canlı Tv+ herhangi bir medya içerğinin doğrudan sahibi olduğunu iddia etmez. Uygulama içerisinde yer alan bazı içerikler üçüncü taraf kaynaklardan alınabilir, indekslenebilir veya teknik erişim amacıyla kullanıcıya sunulabilir.
                </p>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-indigo-500 pl-6 bg-linear-to-r from-indigo-500/10 to-transparent py-2">Telif Hakkı Sahipleri İçin Bildirim</h3>
                  <div className="pl-6 space-y-4">
                    <p>Eğer platformumuzda yer alan herhangi bir içerik üzerinde telif hakkına, marka hakkına veya başka bir fikri mülkiyet hakkına sahip olduğunuzu düşünüyorsanız ve:</p>
                    <ul className="pl-6 list-disc space-y-2 font-medium text-white/80 italic">
                      <li>İçeriğinizin kaldırılmasını talep etmek,</li>
                      <li>Lisanslama / teliflendirme görüşmesi yapmak,</li>
                      <li>İçeriğinizın resmi izin kapsamında yayınlanmasını sağlamak,</li>
                      <li>Hak sahipliğinizi bildirmek</li>
                    </ul>
                    <p>istiyorsanız, lutfen bizimle doğrudan iletişime geçiniz.</p>
                    <p className="bg-white/5 p-4 rounded-xl border border-white/5 italic">
                       GostaSoftware, hak sahipleriyle iş birliği yapmayı ve gerekli durumlarda resmi lisans/telif anlaşmaları gerçekleştirmeyi amaçlamaktadır.
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-indigo-500 pl-6 bg-linear-to-r from-indigo-500/10 to-transparent py-2">Hak Sahibi Başvurusu İçin Gerekli Bilgiler</h3>
                  <div className="pl-6 space-y-3 font-medium">
                    <p>Başvurunuzun hızlı değerlendirilmesi için aşağıdaki bilgileri iletmeniz gerekmektedir:</p>
                    <ul className="pl-6 list-disc space-y-2 text-white/80">
                      <li>Adınız / Şirket Ünvanınız</li>
                      <li>Hak sahibi olduğunuzu gösteren belge veya kanıt</li>
                      <li>İhlal edildiğini düşündüğünüz içerik bağlantısı veya açıklaması</li>
                      <li>Talebiniz (Kaldırma / Lisanslama / Düzeltme)</li>
                      <li>İletişim bilgileriniz</li>
                    </ul>
                  </div>
                </div>

                <div className="space-y-8 pt-10 border-t border-white/5">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-indigo-500 pl-6 bg-linear-to-r from-indigo-500/10 to-transparent py-2">İletişim</h3>
                  <div className="bg-white/[0.03] p-10 rounded-[2.5rem] space-y-4 border border-white/5 relative overflow-hidden group/card">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -z-10 group-hover/card:bg-indigo-500/20 transition-colors" />
                    <p className="text-white font-black tracking-tight text-2xl uppercase italic">GostaSoftware</p>
                    <div className="space-y-2">
                      <p className="text-sm text-white/40 uppercase font-bold tracking-widest">Proje: <span className="text-white">Canlı Tv+</span></p>
                      <p className="text-sm text-white/40 uppercase font-bold tracking-widest flex items-center gap-2">
                         E-posta: <span className="text-indigo-500 italic font-black select-all">Gostasoftware@gmail.com</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-white font-black uppercase tracking-widest text-xl italic border-l-4 border-indigo-500 pl-6 bg-linear-to-r from-indigo-500/10 to-transparent py-2">Değerlendirme Süreci</h3>
                  <div className="pl-6 space-y-4">
                    <p>Hak sahiplerinden gelen talepler dikkatle incelenir. Geçerli bir başvuru alınması halinde ilgili içerik:</p>
                    <ul className="pl-6 list-disc space-y-2 text-white/80 font-medium italic">
                      <li>geçici olarak kaldırılabilir,</li>
                      <li>erişimi sınırlandırılabilir,</li>
                      <li>veya taraflar arasında telif/lisans görüşmesi başlatılabilir.</li>
                    </ul>
                    <p>GostaSoftware, iyi niyet çerçevesinde tüm hak sahipleriyle iletişim kurmaya ve gerekli telif süreçlerini yürütmeye hazırdır. </p>
                  </div>
                </div>

                <div className="space-y-4 bg-white/5 p-8 rounded-[2.5rem] border border-white/5">
                  <h3 className="text-white font-black uppercase tracking-widest text-sm italic">Yasal Uyarı</h3>
                  <p className="text-xs leading-relaxed opacity-70">
                     Canlı Tv+, yalnızca teknik erişim sağlayan bir platformdur. Üçüncü taraf yayınlerin içeriklerinden ilgili yayıncı kuruluşlar sorumludur. Hak sahiplerinin talepleri doğrultusunda gerekli aksiyonlar en kısa sürede alınacaktır.
                  </p>
                </div>

                <div className="text-center py-20 border-t border-white/5 space-y-4 opacity-30">
                   <Scale size={24} className="mx-auto" />
                   <p className="text-[11px] font-black uppercase tracking-[0.3em] italic max-w-md mx-auto">
                      Hukuki bildirimler ve hak sahibi talepleri için resmi e-posta adresimiz üzerinden iletişime geçiniz.
                   </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

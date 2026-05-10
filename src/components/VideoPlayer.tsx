import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import ReactPlayer from 'react-player';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize, Minimize, Volume2, VolumeX, Play, Pause, RefreshCw, Activity, Sun, ShieldAlert, Send, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';

interface VideoPlayerProps {
  url: string;
  playing: boolean;
  onTogglePlay: () => void;
  title: string;
  logo?: string;
  onError?: (e: any) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
}

export default function VideoPlayer({ url, playing, onTogglePlay, title, logo, onError, onFullscreenChange }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);
  const indicatorTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentQuality, setCurrentQuality] = useState<string>('Auto');
  const [showErrorUI, setShowErrorUI] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  
  const [brightness, setBrightness] = useState(100);
  const [volume, setVolume] = useState(100);
  const [activeIndicator, setActiveIndicator] = useState<'brightness' | 'volume' | null>(null);
  
  const dragStartRef = useRef<{ y: number; value: number; type: 'brightness' | 'volume' } | null>(null);

  const isYouTube = url?.includes('youtube.com/') || url?.includes('youtu.be/');
  
  const lastTimeRef = useRef(0);
  const lastCheckTimeRef = useRef(Date.now());
  const reportSentRef = useRef(false);

  // Oynat/Durdur Durumunu Video Elementine Senkronize Et
  useEffect(() => {
    if (isYouTube) return;
    const video = videoRef.current;
    if (!video || !isReady) return;

    if (playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing, isReady, isYouTube]);

  // Fullscreen API ve StatusBar Kontrolü
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement || !!(document as any).webkitFullscreenElement;
      setIsFullscreen(isCurrentlyFullscreen);
      onFullscreenChange?.(isCurrentlyFullscreen);
      
      if (Capacitor.isNativePlatform()) {
        if (isCurrentlyFullscreen) {
          StatusBar.hide().catch(() => {});
        } else {
          StatusBar.show().catch(() => {});
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [onFullscreenChange]);

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          await (containerRef.current as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.error("Tam ekran hatası:", err);
      // Fallback for devices where requestFullscreen might fail or behave differently
      const nextState = !isFullscreen;
      setIsFullscreen(nextState);
      onFullscreenChange?.(nextState);
    }
  };

  const handleManualReport = async () => {
    if (reportSentRef.current || isReporting) return;
    
    setIsReporting(true);
    try {
      await addDoc(collection(db, 'reports'), {
        channelName: title,
        url: url,
        type: 'user_manual_report',
        timestamp: serverTimestamp(),
        status: 'pending'
      });
      reportSentRef.current = true;
      setReportSuccess(true);
    } catch (e) {
      console.error("Rapor hatası:", e);
    } finally {
      setIsReporting(false);
    }
  };

  useEffect(() => {
    if (isYouTube || !playing) return;

    const checkInterval = setInterval(() => {
      const video = videoRef.current;
      if (!video) return;

      if (video.currentTime > lastTimeRef.current) {
        lastTimeRef.current = video.currentTime;
        lastCheckTimeRef.current = Date.now();
        if (showErrorUI) setShowErrorUI(false);
      } else {
        const diff = (Date.now() - lastCheckTimeRef.current) / 1000;
        if (diff >= 10 && !isReady) {
          setShowErrorUI(true);
        }
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [playing, isYouTube, url, isReady]);

  useEffect(() => {
    if (isYouTube) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls;
    setIsReady(false);
    setShowErrorUI(false);
    setReportSuccess(false);
    reportSentRef.current = false;
    lastTimeRef.current = 0;
    lastCheckTimeRef.current = Date.now();

    if (Hls.isSupported() && (url.includes('m3u8') || url.includes('m3u'))) {
      if (hls) hls.destroy();
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsReady(true);
        if (playing) video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setShowErrorUI(true);
      });
    } else {
      video.src = url;
      video.onloadedmetadata = () => setIsReady(true);
      video.onerror = () => setShowErrorUI(true);
    }

    return () => { if (hls) hls.destroy(); };
  }, [url]);

  const startControlsTimer = () => {
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (playing && isReady) setShowControls(false);
    }, 4000);
  };

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = isMuted ? 0 : volume / 100;
  }, [volume, isMuted]);

  useEffect(() => {
    if (isReady && playing) startControlsTimer();
    else setShowControls(true);
    return () => { if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current); };
  }, [isReady, playing]);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!dragStartRef.current) return;
    const touch = e.touches[0];
    const deltaY = dragStartRef.current.y - touch.clientY;
    const newValue = Math.min(Math.max(dragStartRef.current.value + deltaY * 0.5, 0), dragStartRef.current.type === 'brightness' ? 200 : 100);
    if (dragStartRef.current.type === 'brightness') {
      setBrightness(newValue);
      setActiveIndicator('brightness');
    } else {
      setVolume(newValue);
      setIsMuted(false);
      setActiveIndicator('volume');
    }
    if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
    indicatorTimerRef.current = setTimeout(() => setActiveIndicator(null), 1500);
  };

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full aspect-video bg-black overflow-hidden transition-all touch-none",
        isFullscreen 
          ? "fixed inset-0 h-[100dvh] w-screen z-[9999] rounded-none" 
          : "rounded-2xl md:rounded-[2.5rem] border border-white/10 z-50",
        !showControls && "cursor-none"
      )}
      onClick={() => {
        if (!showControls) { setShowControls(true); startControlsTimer(); }
        else startControlsTimer();
      }}
      onTouchStart={(e) => {
        const touch = e.touches[0];
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const type = (touch.clientX - rect.left) < rect.width / 2 ? 'brightness' : 'volume';
        dragStartRef.current = { y: touch.clientY, value: type === 'brightness' ? brightness : volume, type };
      }}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => { dragStartRef.current = null; startControlsTimer(); }}
    >
      <div className="absolute inset-0 pointer-events-none transition-all duration-300" style={{ filter: `brightness(${brightness}%)` }}>
        {isYouTube ? (
          <ReactPlayer url={url} playing={playing} muted={isMuted} width="100%" height="100%" playsinline onReady={() => { setIsReady(true); setShowErrorUI(false); }} />
        ) : (
          <video ref={videoRef} playsInline muted={isMuted} className="w-full h-full object-contain" poster={logo} />
        )}
      </div>

      <AnimatePresence>
        {showErrorUI && !isReady && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-8 text-center"
          >
            <div className="relative mb-3 md:mb-8">
               <div className="absolute inset-0 bg-red-500/20 blur-2xl md:blur-3xl rounded-full" />
               <div className="relative w-14 h-14 md:w-24 md:h-24 bg-linear-to-b from-red-500/10 to-red-500/5 rounded-2xl md:rounded-[2rem] border border-red-500/20 flex items-center justify-center">
                  <ShieldAlert className="w-7 h-7 md:w-12 md:h-12 text-red-500 animate-pulse" />
               </div>
            </div>
            
            <h3 className="text-xl md:text-4xl font-black uppercase tracking-tighter mb-2 md:mb-4 text-white">Yayın <span className="text-red-500">Devre Dışı</span></h3>
            
            <div className="bg-white/5 border border-white/10 px-4 py-2 md:px-6 md:py-3 rounded-full mb-4 md:mb-10">
               <p className="text-white/60 text-[10px] md:text-sm font-bold uppercase tracking-widest leading-none italic">
                 Bu yayın geçici olarak devre dışıdır
               </p>
            </div>

            <button 
              onClick={(e) => { e.stopPropagation(); handleManualReport(); }}
              disabled={reportSuccess || isReporting}
              className={cn(
                "flex items-center gap-3 md:gap-4 px-6 py-3 md:px-12 md:py-6 rounded-xl md:rounded-[2rem] font-black text-[10px] md:text-sm uppercase tracking-widest transition-all active:scale-95 shadow-2xl",
                reportSuccess 
                  ? "bg-green-500 text-white shadow-green-500/20" 
                  : "bg-red-600 text-white hover:bg-red-500 shadow-red-600/20"
              )}
            >
              {isReporting ? (
                <Activity className="animate-spin" size={16} />
              ) : reportSuccess ? (
                <><CheckCircle2 size={16} /> ADMİNE BİLDİRİLDİ</>
              ) : (
                <><Send size={16} /> YAYINI BİLDİR</>
              )}
            </button>
            
            <button 
              onClick={(e) => { e.stopPropagation(); window.location.reload(); }}
              className="mt-4 md:mt-6 text-white/20 hover:text-white transition-colors text-[8px] md:text-[10px] font-black uppercase tracking-[0.3em]"
            >
              TEKRAR DENE
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeIndicator && (
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-black/60 backdrop-blur-xl border border-white/10 p-6 rounded-3xl flex flex-col items-center gap-4 min-w-[120px]">
            {activeIndicator === 'brightness' ? <Sun size={32} className="text-yellow-500" /> : <Volume2 size={32} className="text-primary" />}
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
               <motion.div className={cn("h-full", activeIndicator === 'brightness' ? "bg-yellow-500" : "bg-primary")} animate={{ width: `${(activeIndicator === 'brightness' ? brightness / 2 : volume)}%` }} />
            </div>
            <span className="text-white font-black text-xs uppercase tracking-widest">{Math.round(activeIndicator === 'brightness' ? brightness / 2 : volume)}%</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && !showErrorUI && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} 
            className="absolute inset-0 z-40 bg-black/30 cursor-default"
            onClick={(e) => { e.stopPropagation(); onTogglePlay(); startControlsTimer(); }}
          >
            <div className="absolute top-2 left-2 right-2 md:top-6 md:left-6 md:right-6 flex justify-between items-start pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1.5 md:px-5 md:py-3 rounded-xl flex items-center gap-2 pointer-events-auto">
                <div className="w-1.5 h-1.5 md:w-2.5 md:h-2.5 rounded-full bg-red-600 animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-white font-black text-[10px] md:text-sm uppercase tracking-wider truncate max-w-[100px] md:max-w-xs">{title}</span>
                  <span className="text-white/40 text-[8px] md:text-[10px] font-bold uppercase">{currentQuality} • CANLI</span>
                </div>
              </div>
              <button onClick={toggleFullscreen} className="p-2 md:p-4 bg-white/10 rounded-lg text-white pointer-events-auto active:scale-90 transition-transform">
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3 md:p-10 flex items-end justify-between pointer-events-none">
              <div className="flex items-center gap-3 md:gap-8 pointer-events-none">
                <button onClick={(e) => { e.stopPropagation(); onTogglePlay(); }} className="w-10 h-10 md:w-20 md:h-20 bg-white rounded-xl md:rounded-2xl flex items-center justify-center text-black pointer-events-auto shadow-xl active:scale-90 transition-transform">
                  {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
                </button>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.8)]" />
                   <span className="text-red-500 font-black text-[10px] md:text-2xl italic tracking-widest leading-none uppercase">CANLI</span>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setIsMuted(!isMuted); }} className="p-2 md:p-6 bg-white/10 rounded-lg text-white pointer-events-auto">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!isReady && playing && !showErrorUI && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
           <Activity className="w-8 h-8 text-primary animate-pulse" />
           <span className="text-white text-[8px] font-black tracking-[0.3em] mt-2 uppercase">YÜKLENİYOR</span>
        </div>
      )}
    </div>
  );
}

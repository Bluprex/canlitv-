import { cn } from '../lib/utils';

interface AdBannerProps {
  className?: string;
  type?: 'horizontal' | 'square';
  label?: string;
}

export default function AdBanner({ className, type = 'horizontal', label = "Sponsorlu İçerik" }: AdBannerProps) {
  return (
    <div className={cn(
      "w-full bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center overflow-hidden transition-all",
      type === 'horizontal' ? "h-24 md:h-32 my-4" : "aspect-square max-w-sm mx-auto my-6",
      className
    )}>
      <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em] mb-1">{label}</span>
      <div className="text-[8px] text-white/5 uppercase">Reklam Alanı</div>
      
      {/* 
         REKLAM ŞİRKETİNDEN ALDIĞIN KODLARI BURAYA YAPIŞTIRACAKSIN.
         Örn: Adsterra Script veya AdMob slotu
      */}
    </div>
  );
}

import { Channel } from '../types';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChannelCardProps {
  channel: Channel;
  isActive: boolean;
  onSelect: (channelId: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, channelId: string) => void;
}

export default function ChannelCard({ channel, isActive, onSelect, isFavorite, onToggleFavorite }: ChannelCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(channel.id)}
      className={cn(
        "relative flex flex-col items-center justify-center p-5 rounded-[2rem] cursor-pointer border transition-all duration-500",
        isActive 
          ? "bg-white/10 border-white/20 shadow-[0_20px_50px_rgba(220,38,38,0.2)]" 
          : "bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.05]"
      )}
      id={`channel-card-${channel.id}`}
    >
      <div className="relative w-16 h-16 md:w-20 md:h-20 bg-black/40 rounded-2xl flex items-center justify-center p-4 mb-4 border border-white/10 group-hover:border-primary/50 transition-colors">
        <img 
          src={channel.logo} 
          alt={channel.name} 
          className="w-full h-full object-contain filter drop-shadow-2xl"
        />
        {isActive && (
          <div className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
          </div>
        )}
      </div>
      
      <div className="text-center w-full">
        <div className="text-xs font-black text-white uppercase tracking-tighter truncate mb-1">{channel.name}</div>
        <div className="text-[10px] text-white/30 font-black uppercase tracking-widest truncate">{channel.category}</div>
      </div>

      <button
        onClick={(e) => onToggleFavorite(e, channel.id)}
        className={cn(
          "absolute top-4 right-4 p-2 rounded-full transition-all hover:scale-110",
          isFavorite ? "text-red-500" : "text-white/10"
        )}
      >
        <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
      </button>

      {isActive && (
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary rounded-t-full shadow-[0_0_20px_#dc2626]" />
      )}
    </motion.div>
  );
}

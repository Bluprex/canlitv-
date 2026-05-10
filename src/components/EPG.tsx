import { Program } from '../types';
import { format, isAfter, isBefore } from 'date-fns';
import { tr } from 'date-fns/locale';
import { motion } from 'motion/react';
import { Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface EPGProps {
  programs: Program[];
}

export default function EPG({ programs }: EPGProps) {
  const now = new Date();

  return (
    <div className="flex flex-col gap-3 h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-2 px-2">
        <Clock size={18} className="text-white/60" />
        <h3 className="text-white/60 font-medium text-sm tracking-widest uppercase">Yayın Akışı</h3>
      </div>
      
      <div className="flex flex-col gap-2 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 custom-scrollbar">
        {programs.map((program, index) => {
          const startTime = new Date(program.startTime);
          const endTime = new Date(program.endTime);
          const isActive = isAfter(now, startTime) && isBefore(now, endTime);
          const isFinished = isAfter(now, endTime);

          return (
            <motion.div
              key={program.id || index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={cn(
                "p-4 rounded-xl border transition-all duration-300",
                isActive 
                  ? "bg-white/10 border-white/20 shadow-lg" 
                  : "bg-white/5 border-white/5 opacity-60"
              )}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "text-xs font-mono tracking-tighter",
                  isActive ? "text-red-400" : "text-white/40"
                )}>
                  {program.dayOfWeek ? (
                    `${program.dayOfWeek} ${program.timeString || ''}`
                  ) : (
                    `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`
                  )}
                </span>
                {isActive && !program.dayOfWeek && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                )}
              </div>
              
              <h4 className="text-white text-sm font-medium line-clamp-1">{program.title}</h4>
              <p className="text-white/40 text-xs mt-1 line-clamp-2 leading-relaxed">
                {program.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

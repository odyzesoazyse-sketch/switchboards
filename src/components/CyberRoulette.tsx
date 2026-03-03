import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, User } from "lucide-react";

interface Dancer {
  id: string;
  name: string;
  photo_url: string | null;
}

interface CyberRouletteProps {
  dancers: Dancer[];
  onResult: (left: Dancer, right: Dancer) => void;
  isActive: boolean;
}

export default function CyberRoulette({ dancers, onResult, isActive }: CyberRouletteProps) {
  const [phase, setPhase] = useState<"idle" | "spinning" | "result">("idle");
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(1);
  const [speed, setSpeed] = useState(50);

  useEffect(() => {
    if (!isActive || dancers.length < 2) return;
    setPhase("spinning");
    setSpeed(50);

    let interval: ReturnType<typeof setInterval>;
    let slowdownTimeout: ReturnType<typeof setTimeout>;

    interval = setInterval(() => {
      setLeftIndex((prev) => (prev + 1) % dancers.length);
      setRightIndex((prev) => {
        let next = (prev + 1) % dancers.length;
        // Avoid same dancer
        if (next === ((leftIndex + 1) % dancers.length)) next = (next + 1) % dancers.length;
        return next;
      });
    }, speed);

    // Slow down after 2s
    slowdownTimeout = setTimeout(() => {
      let currentSpeed = 50;
      const slowdown = setInterval(() => {
        currentSpeed += 30;
        clearInterval(interval);
        interval = setInterval(() => {
          setLeftIndex((prev) => (prev + 1) % dancers.length);
          setRightIndex((prev) => (prev + 2) % dancers.length);
        }, currentSpeed);

        if (currentSpeed > 500) {
          clearInterval(slowdown);
          clearInterval(interval);
          // Pick final random pair
          const l = Math.floor(Math.random() * dancers.length);
          let r = Math.floor(Math.random() * dancers.length);
          while (r === l) r = Math.floor(Math.random() * dancers.length);
          setLeftIndex(l);
          setRightIndex(r);
          setPhase("result");
          setTimeout(() => onResult(dancers[l], dancers[r]), 1500);
        }
      }, 200);
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(slowdownTimeout);
    };
  }, [isActive, dancers.length]);

  if (dancers.length < 2) return null;

  const leftDancer = dancers[leftIndex];
  const rightDancer = dancers[rightIndex];

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="flex items-center gap-8">
        {/* Left slot */}
        <motion.div
          className="w-32 h-32 rounded-2xl border-2 border-primary/50 overflow-hidden bg-card flex items-center justify-center"
          animate={phase === "spinning" ? { scale: [1, 1.05, 1] } : phase === "result" ? { scale: [1, 1.1, 1], borderColor: "hsl(var(--primary))" } : {}}
          transition={phase === "spinning" ? { repeat: Infinity, duration: 0.3 } : { duration: 0.5 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={leftDancer?.id}
              className="w-full h-full flex flex-col items-center justify-center"
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: phase === "spinning" ? 0.05 : 0.3 }}
            >
              {leftDancer?.photo_url ? (
                <img src={leftDancer.photo_url} alt={leftDancer.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-muted-foreground" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* VS center */}
        <motion.div
          className="flex flex-col items-center"
          animate={phase === "spinning" ? { rotate: [0, 360] } : { rotate: 0 }}
          transition={phase === "spinning" ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
        >
          <Zap className="w-10 h-10 text-yellow-400" />
          <span className="text-xs font-black uppercase tracking-wider text-muted-foreground mt-1">VS</span>
        </motion.div>

        {/* Right slot */}
        <motion.div
          className="w-32 h-32 rounded-2xl border-2 border-secondary/50 overflow-hidden bg-card flex items-center justify-center"
          animate={phase === "spinning" ? { scale: [1, 1.05, 1] } : phase === "result" ? { scale: [1, 1.1, 1], borderColor: "hsl(var(--secondary))" } : {}}
          transition={phase === "spinning" ? { repeat: Infinity, duration: 0.3, delay: 0.15 } : { duration: 0.5 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={rightDancer?.id}
              className="w-full h-full flex flex-col items-center justify-center"
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: phase === "spinning" ? 0.05 : 0.3 }}
            >
              {rightDancer?.photo_url ? (
                <img src={rightDancer.photo_url} alt={rightDancer.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-12 h-12 text-muted-foreground" />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Names */}
      {phase === "result" && (
        <motion.div
          className="flex items-center gap-6 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <span className="text-primary font-black font-display text-xl">{leftDancer?.name}</span>
          <span className="text-muted-foreground text-sm">vs</span>
          <span className="text-secondary font-black font-display text-xl">{rightDancer?.name}</span>
        </motion.div>
      )}
    </div>
  );
}

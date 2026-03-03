import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface HypeMeterProps {
  className?: string;
  vertical?: boolean;
}

export default function HypeMeter({ className = "", vertical = true }: HypeMeterProps) {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animRef = useRef<number>();

  useEffect(() => {
    let audioCtx: AudioContext;
    let stream: MediaStream;

    const init = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        analyserRef.current = analyser;

        const update = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          const norm = Math.min(100, Math.round((avg / 128) * 100));
          setLevel((prev) => prev + (norm - prev) * 0.3);
          animRef.current = requestAnimationFrame(update);
        };
        update();
      } catch {
        // No mic access
      }
    };

    init();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      if (audioCtx!) audioCtx.close();
      if (stream!) stream.getTracks().forEach(t => t.stop());
    };
  }, []);

  const getColor = () => {
    if (level > 75) return "from-destructive to-yellow-500";
    if (level > 40) return "from-yellow-500 to-yellow-300";
    return "from-success to-emerald-300";
  };

  if (vertical) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <span className="text-[9px] uppercase tracking-[0.3em] font-black text-muted-foreground rotate-180" style={{ writingMode: "vertical-lr" }}>
          Hype
        </span>
        <div className="w-5 h-40 bg-muted rounded-full overflow-hidden border border-border relative">
          <motion.div
            className={`absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t ${getColor()}`}
            animate={{ height: `${level}%` }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
          />
        </div>
        <span className="text-xs font-black text-foreground">{Math.round(level)}%</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[9px] uppercase tracking-[0.3em] font-black text-muted-foreground">Hype</span>
      <div className="h-5 flex-1 bg-muted rounded-full overflow-hidden border border-border relative">
        <motion.div
          className={`absolute top-0 left-0 bottom-0 rounded-full bg-gradient-to-r ${getColor()}`}
          animate={{ width: `${level}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 15 }}
        />
      </div>
      <span className="text-xs font-black text-foreground">{Math.round(level)}%</span>
    </div>
  );
}

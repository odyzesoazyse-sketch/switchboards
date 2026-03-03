import { useState, useRef, useCallback } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Star, User, MapPin, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Dancer {
  id: string;
  name: string;
  city: string | null;
  photo_url: string | null;
  age: number | null;
  instagram: string | null;
  bio: string | null;
}

interface CypherSwipeCardProps {
  dancer: Dancer;
  onSwipeLeft: (dancerId: string) => void;
  onSwipeRight: (dancerId: string, tags: string[]) => void;
  onSwipeUp: (dancerId: string) => void;
  isTop: boolean;
}

const SWIPE_THRESHOLD = 120;
const SWIPE_UP_THRESHOLD = 100;

const QUICK_TAGS = ["Style", "Technique", "Music", "Power", "Flow"];

export default function CypherSwipeCard({
  dancer,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  isTop,
}: CypherSwipeCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-25, 0, 25]);
  const opacityLeft = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);
  const opacityRight = useTransform(x, [0, 50, 150], [0, 0.5, 1]);
  const opacityUp = useTransform(y, [0, -50, -120], [0, 0.5, 1]);
  const scale = useTransform(
    x,
    [-300, -150, 0, 150, 300],
    [0.9, 0.95, 1, 0.95, 0.9]
  );

  const [showTags, setShowTags] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const tagTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleDragEnd = useCallback(
    (_: any, info: PanInfo) => {
      setIsDragging(false);
      const { offset, velocity } = info;

      // Swipe UP → Golden Ticket
      if (offset.y < -SWIPE_UP_THRESHOLD && Math.abs(offset.x) < 80) {
        if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 100]);
        onSwipeUp(dancer.id);
        return;
      }

      // Swipe LEFT → No
      if (offset.x < -SWIPE_THRESHOLD || (offset.x < -60 && velocity.x < -500)) {
        if (navigator.vibrate) navigator.vibrate(40);
        onSwipeLeft(dancer.id);
        return;
      }

      // Swipe RIGHT → Yes, show tags briefly
      if (offset.x > SWIPE_THRESHOLD || (offset.x > 60 && velocity.x > 500)) {
        if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
        setShowTags(true);
        tagTimeoutRef.current = setTimeout(() => {
          onSwipeRight(dancer.id, selectedTags);
          setShowTags(false);
          setSelectedTags([]);
        }, 1200);
        return;
      }
    },
    [dancer.id, onSwipeLeft, onSwipeRight, onSwipeUp, selectedTags]
  );

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    // Reset timeout so user has more time
    if (tagTimeoutRef.current) clearTimeout(tagTimeoutRef.current);
    tagTimeoutRef.current = setTimeout(() => {
      onSwipeRight(dancer.id, selectedTags.includes(tag) ? [...selectedTags] : [...selectedTags, tag]);
      setShowTags(false);
      setSelectedTags([]);
    }, 1200);
  };

  const confirmWithTags = () => {
    if (tagTimeoutRef.current) clearTimeout(tagTimeoutRef.current);
    onSwipeRight(dancer.id, selectedTags);
    setShowTags(false);
    setSelectedTags([]);
  };

  if (!isTop) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[90%] max-w-sm aspect-[3/4] rounded-3xl bg-card border border-border/50 shadow-lg" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        className="w-[90%] max-w-sm aspect-[3/4] rounded-3xl overflow-hidden cursor-grab active:cursor-grabbing touch-manipulation select-none relative"
        style={{ x, y, rotate, scale }}
        drag
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={0.9}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.98 }}
      >
        {/* Card background */}
        <div className="absolute inset-0 bg-card border-2 border-border/50 rounded-3xl shadow-2xl overflow-hidden">
          {dancer.photo_url ? (
            <img
              src={dancer.photo_url}
              alt={dancer.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-muted to-background flex items-center justify-center">
              <User className="w-24 h-24 text-muted-foreground/30" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        </div>

        {/* NOPE stamp */}
        <motion.div
          className="absolute top-8 right-6 z-10 border-4 border-destructive rounded-xl px-6 py-2 -rotate-12"
          style={{ opacity: opacityLeft }}
        >
          <span className="text-destructive font-black text-4xl tracking-wider">NOPE</span>
        </motion.div>

        {/* YES stamp */}
        <motion.div
          className="absolute top-8 left-6 z-10 border-4 border-success rounded-xl px-6 py-2 rotate-12"
          style={{ opacity: opacityRight }}
        >
          <span className="text-success font-black text-4xl tracking-wider">YES</span>
        </motion.div>

        {/* GOLDEN TICKET stamp */}
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-10 border-4 border-yellow-400 rounded-xl px-6 py-3 bg-yellow-400/20 backdrop-blur-sm"
          style={{ opacity: opacityUp }}
        >
          <div className="flex items-center gap-2">
            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 font-black text-2xl tracking-wider whitespace-nowrap">
              GOLDEN TICKET
            </span>
            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
          </div>
        </motion.div>

        {/* Dancer info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <h2 className="text-3xl font-black text-white font-display tracking-tight">
            {dancer.name}
          </h2>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {dancer.age && (
              <span className="text-white/70 text-sm">{dancer.age} y.o.</span>
            )}
            {dancer.city && (
              <span className="flex items-center gap-1 text-white/70 text-sm">
                <MapPin className="w-3 h-3" />
                {dancer.city}
              </span>
            )}
            {dancer.instagram && (
              <span className="flex items-center gap-1 text-white/70 text-sm">
                <Instagram className="w-3 h-3" />
                {dancer.instagram}
              </span>
            )}
          </div>
          {dancer.bio && (
            <p className="text-white/50 text-xs mt-2 line-clamp-2">{dancer.bio}</p>
          )}
        </div>

        {/* Quick Tags overlay */}
        {showTags && (
          <motion.div
            className="absolute inset-0 bg-success/20 backdrop-blur-md z-20 flex flex-col items-center justify-center gap-4 p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <h3 className="text-white font-black text-xl tracking-wider uppercase">Quick Tags</h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-5 py-3 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all touch-manipulation ${
                    selectedTags.includes(tag)
                      ? "bg-white text-black scale-105"
                      : "bg-white/20 text-white border border-white/30 hover:bg-white/30"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <button
              onClick={confirmWithTags}
              className="mt-2 px-8 py-3 bg-success text-white font-bold rounded-2xl uppercase tracking-wider touch-manipulation active:scale-95"
            >
              Confirm ✓
            </button>
          </motion.div>
        )}
      </motion.div>

      {/* Hint arrows */}
      {!isDragging && !showTags && (
        <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-12 pointer-events-none">
          <div className="flex flex-col items-center text-destructive/60">
            <span className="text-xs font-bold uppercase tracking-wider">← Nope</span>
          </div>
          <div className="flex flex-col items-center text-yellow-400/60">
            <span className="text-xs font-bold uppercase tracking-wider">↑ Golden</span>
          </div>
          <div className="flex flex-col items-center text-success/60">
            <span className="text-xs font-bold uppercase tracking-wider">Yes →</span>
          </div>
        </div>
      )}
    </div>
  );
}

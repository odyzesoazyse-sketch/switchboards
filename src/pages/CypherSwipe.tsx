import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Star, Zap, BarChart3 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import CypherSwipeCard from "@/components/CypherSwipeCard";

interface Dancer {
  id: string;
  name: string;
  city: string | null;
  photo_url: string | null;
  age: number | null;
  instagram: string | null;
  bio: string | null;
}

interface SwipeResult {
  dancerId: string;
  score: number; // 0 = no, 1 = yes, 100 = golden
  tags: string[];
  timestamp: number;
}

export default function CypherSwipe() {
  const { id: nominationId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<SwipeResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [nominationId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      const { data: dancersData } = await supabase
        .from("dancers")
        .select("*")
        .eq("nomination_id", nominationId)
        .order("created_at");

      if (dancersData) {
        // Shuffle for fairness
        const shuffled = [...dancersData].sort(() => Math.random() - 0.5);
        setDancers(shuffled);
      }

      // Load existing scores to resume
      const { data: existingScores } = await supabase
        .from("selection_scores")
        .select("dancer_id")
        .eq("nomination_id", nominationId)
        .eq("judge_id", user.id);

      if (existingScores && existingScores.length > 0) {
        const scored = new Set(existingScores.map(s => s.dancer_id));
        const remaining = (dancersData || []).filter(d => !scored.has(d.id));
        setDancers(remaining.sort(() => Math.random() - 0.5));
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const saveScore = async (dancerId: string, score: number, tags: string[]) => {
    if (!userId || !nominationId) return;

    // Map score: 0=reject(1/10), 1=pass(7/10), 100=golden(10/10)
    const technique = score === 100 ? 10 : score === 1 ? 7 : 2;
    const musicality = technique;
    const performance = technique;

    try {
      await supabase.from("selection_scores").upsert({
        nomination_id: nominationId,
        dancer_id: dancerId,
        judge_id: userId,
        score_technique: technique,
        score_musicality: musicality,
        score_performance: performance,
      }, { onConflict: "nomination_id,dancer_id,judge_id" as any });
    } catch (err) {
      console.error("Error saving swipe score:", err);
    }
  };

  const advanceCard = useCallback(() => {
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleSwipeLeft = useCallback(
    (dancerId: string) => {
      const result: SwipeResult = { dancerId, score: 0, tags: [], timestamp: Date.now() };
      setResults((prev) => [...prev, result]);
      saveScore(dancerId, 0, []);
      advanceCard();
    },
    [advanceCard]
  );

  const handleSwipeRight = useCallback(
    (dancerId: string, tags: string[]) => {
      const result: SwipeResult = { dancerId, score: 1, tags, timestamp: Date.now() };
      setResults((prev) => [...prev, result]);
      saveScore(dancerId, 1, tags);
      advanceCard();
    },
    [advanceCard]
  );

  const handleSwipeUp = useCallback(
    (dancerId: string) => {
      const result: SwipeResult = { dancerId, score: 100, tags: ["Golden Ticket"], timestamp: Date.now() };
      setResults((prev) => [...prev, result]);
      saveScore(dancerId, 100, ["Golden Ticket"]);
      toast({
        title: "⭐ Golden Ticket!",
        description: `${dancers.find(d => d.id === dancerId)?.name} gets automatic qualification!`,
      });
      advanceCard();
    },
    [advanceCard, dancers, toast]
  );

  const totalSwiped = results.length;
  const yesCount = results.filter(r => r.score === 1).length;
  const goldenCount = results.filter(r => r.score === 100).length;
  const noCount = results.filter(r => r.score === 0).length;
  const remaining = dancers.length - currentIndex;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // All done
  if (currentIndex >= dancers.length) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          className="text-center space-y-6 max-w-sm"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto">
            <Zap className="w-10 h-10 text-success" />
          </div>
          <h1 className="text-3xl font-black font-display text-foreground">Done!</h1>
          <p className="text-muted-foreground">
            You swiped through {totalSwiped} dancers
          </p>
          <div className="flex justify-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-black text-success">{yesCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Yes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-yellow-400">{goldenCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Golden</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-destructive">{noCount}</div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider">No</div>
            </div>
          </div>
          <Button onClick={() => navigate(-1)} className="w-full">
            Back to Panel
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 relative z-30">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h1 className="text-sm font-black font-display uppercase tracking-[0.2em] text-foreground">
            Cypher Swipe
          </h1>
          <p className="text-xs text-muted-foreground">
            {remaining} remaining
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setShowStats(!showStats)}>
          <BarChart3 className="w-5 h-5" />
        </Button>
      </div>

      {/* Stats bar */}
      {showStats && (
        <motion.div
          className="px-4 pb-2 flex gap-3 justify-center relative z-30"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
        >
          <Badge variant="outline" className="text-success border-success/30">
            ✓ {yesCount}
          </Badge>
          <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">
            <Star className="w-3 h-3 mr-1 fill-yellow-400" /> {goldenCount}
          </Badge>
          <Badge variant="outline" className="text-destructive border-destructive/30">
            ✕ {noCount}
          </Badge>
        </motion.div>
      )}

      {/* Progress */}
      <div className="px-4 relative z-30">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            animate={{ width: `${(currentIndex / dancers.length) * 100}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      {/* Cards stack */}
      <div className="flex-1 relative">
        <AnimatePresence>
          {dancers.slice(currentIndex, currentIndex + 2).map((dancer, i) => (
            <CypherSwipeCard
              key={dancer.id}
              dancer={dancer}
              isTop={i === 0}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              onSwipeUp={handleSwipeUp}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Check, Users, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface Dancer {
  id: string;
  name: string;
  city: string | null;
  photo_url: string | null;
}

interface AudienceStats {
  left: number;
  right: number;
  total: number;
}

function getSessionId(): string {
  let id = localStorage.getItem("audience_session_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("audience_session_id", id);
  }
  return id;
}

export default function AudienceVote() {
  const { id } = useParams();
  const { t } = useLanguage();
  const [battleName, setBattleName] = useState("");
  const [matchId, setMatchId] = useState<string | null>(null);
  const [leftDancer, setLeftDancer] = useState<Dancer | null>(null);
  const [rightDancer, setRightDancer] = useState<Dancer | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<string | null>(null);
  const [stats, setStats] = useState<AudienceStats>({ left: 0, right: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const sessionId = getSessionId();

  useEffect(() => {
    if (!id) return;
    loadCurrentMatch();

    const channel = supabase
      .channel(`audience-screen-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'screen_state' }, () => loadCurrentMatch())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id]);

  useEffect(() => {
    if (!matchId) return;
    loadStats();
    checkExistingVote();

    const channel = supabase
      .channel(`audience-votes-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audience_votes' }, () => loadStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const loadCurrentMatch = async () => {
    try {
      const { data: battle } = await supabase.from("battles").select("name").eq("id", id).single();
      if (battle) setBattleName(battle.name);

      const { data: states } = await supabase
        .from("screen_state")
        .select("current_match_id")
        .eq("battle_id", id)
        .order("created_at", { ascending: false })
        .limit(1);

      const state = states?.[0];
      if (!state?.current_match_id) {
        setMatchId(null);
        setLeftDancer(null);
        setRightDancer(null);
        setLoading(false);
        return;
      }

      setMatchId(state.current_match_id);

      const { data: match } = await supabase
        .from("matches")
        .select("dancer_left_id, dancer_right_id")
        .eq("id", state.current_match_id)
        .single();

      if (match) {
        if (match.dancer_left_id) {
          const { data } = await supabase.from("dancers").select("*").eq("id", match.dancer_left_id).single();
          setLeftDancer(data);
        }
        if (match.dancer_right_id) {
          const { data } = await supabase.from("dancers").select("*").eq("id", match.dancer_right_id).single();
          setRightDancer(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!matchId) return;
    const { data: votes } = await supabase
      .from("audience_votes")
      .select("vote_for")
      .eq("match_id", matchId);

    if (votes) {
      const left = votes.filter(v => v.vote_for === leftDancer?.id).length;
      const right = votes.filter(v => v.vote_for === rightDancer?.id).length;
      setStats({ left, right, total: votes.length });
    }
  };

  const checkExistingVote = async () => {
    if (!matchId) return;
    const { data } = await supabase
      .from("audience_votes")
      .select("vote_for")
      .eq("match_id", matchId)
      .eq("session_id", sessionId)
      .maybeSingle();

    if (data) {
      setHasVoted(true);
      setVotedFor(data.vote_for);
    } else {
      setHasVoted(false);
      setVotedFor(null);
    }
  };

  const vote = async (dancerId: string) => {
    if (!matchId || submitting) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from("audience_votes").insert({
        match_id: matchId,
        vote_for: dancerId,
        session_id: sessionId,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("You already voted for this match!");
        } else {
          throw error;
        }
      } else {
        setHasVoted(true);
        setVotedFor(dancerId);
        if (navigator.vibrate) navigator.vibrate(50);
        toast.success("Vote submitted! 🎉");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const leftPct = stats.total > 0 ? Math.round((stats.left / stats.total) * 100) : 50;
  const rightPct = stats.total > 0 ? Math.round((stats.right / stats.total) * 100) : 50;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!matchId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-muted flex items-center justify-center">
            <Trophy className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold">{battleName}</h1>
          <p className="text-muted-foreground">{t("audience.noMatch")}</p>
          <Badge variant="outline" className="animate-pulse">{t("audience.waitingMatch")}</Badge>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 flex flex-col">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-display font-bold">{battleName}</h1>
        <div className="flex items-center justify-center gap-2 mt-1">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{stats.total} votes</span>
        </div>
      </div>

      {/* Vote Cards */}
      <div className="flex-1 flex flex-col gap-4 max-w-lg mx-auto w-full">
        <AnimatePresence mode="wait">
          {[
            { dancer: leftDancer, side: "left" as const, isPrimary: true },
            { dancer: rightDancer, side: "right" as const, isPrimary: false },
          ].map(({ dancer, side, isPrimary }) => {
            if (!dancer) return null;
            const isVotedFor = votedFor === dancer.id;
            const pct = side === "left" ? leftPct : rightPct;
            const count = side === "left" ? stats.left : stats.right;

            return (
              <motion.div
                key={dancer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: side === "left" ? 0 : 0.1 }}
              >
                <Card
                  className={`relative overflow-hidden cursor-pointer transition-all touch-manipulation active:scale-[0.98] ${
                    isVotedFor
                      ? isPrimary
                        ? "border-primary ring-2 ring-primary/50 shadow-lg"
                        : "border-secondary ring-2 ring-secondary/50 shadow-lg"
                      : hasVoted
                      ? "opacity-60"
                      : isPrimary
                        ? "border-primary/30 hover:border-primary/60"
                        : "border-secondary/30 hover:border-secondary/60"
                  }`}
                  onClick={() => !hasVoted && vote(dancer.id)}
                >
                  {/* Background progress bar */}
                  {hasVoted && (
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-1000 ${isPrimary ? 'bg-primary/10' : 'bg-secondary/10'}`}
                      style={{ width: `${pct}%` }}
                    />
                  )}

                  <div className="relative p-6 flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-xl border-2 flex items-center justify-center overflow-hidden shrink-0 ${isPrimary ? 'bg-primary/10 border-primary/20' : 'bg-secondary/10 border-secondary/20'}`}>
                      {dancer.photo_url ? (
                        <img src={dancer.photo_url} alt={dancer.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className={`w-8 h-8 ${isPrimary ? 'text-primary' : 'text-secondary'}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-display font-bold truncate">{dancer.name}</h2>
                      {dancer.city && (
                        <p className="text-sm text-muted-foreground">{dancer.city}</p>
                      )}
                    </div>

                    {hasVoted ? (
                      <div className="text-right shrink-0">
                        <div className={`text-2xl font-display font-bold ${isPrimary ? 'text-primary' : 'text-secondary'}`}>{pct}%</div>
                        <div className="text-xs text-muted-foreground">{count} votes</div>
                      </div>
                    ) : (
                      <Badge className={isPrimary ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}>
                        Vote
                      </Badge>
                    )}

                    {isVotedFor && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center ${isPrimary ? 'bg-primary' : 'bg-secondary'}`}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="text-center mt-6 text-xs text-muted-foreground">
        <p>{t("audience.poweredBy")}</p>
      </div>
    </div>
  );
}

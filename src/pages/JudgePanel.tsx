import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Menu, History, LogOut, X, Home, Check, User, CalendarDays } from "lucide-react";
import SliderVoting from "@/components/SliderVoting";

function HeatSliderVoting({ onSubmit }: { onSubmit: (t: number, m: number, p: number) => void }) {
  const [technique, setTechnique] = useState(5);
  const [musicality, setMusicality] = useState(5);
  const [performance, setPerformance] = useState(5);

  return (
    <div className="space-y-8 mt-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Technique</span>
          <span className="font-mono text-primary font-bold text-lg">{technique}/10</span>
        </div>
        <input type="range" min="1" max="10" value={technique} onChange={e => setTechnique(parseInt(e.target.value))} className="w-full accent-primary h-3 bg-muted rounded-full appearance-none touch-manipulation" style={{ minHeight: '44px' }} />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Musicality</span>
          <span className="font-mono text-primary font-bold text-lg">{musicality}/10</span>
        </div>
        <input type="range" min="1" max="10" value={musicality} onChange={e => setMusicality(parseInt(e.target.value))} className="w-full accent-primary h-3 bg-muted rounded-full appearance-none touch-manipulation" style={{ minHeight: '44px' }} />
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Performance</span>
          <span className="font-mono text-primary font-bold text-lg">{performance}/10</span>
        </div>
        <input type="range" min="1" max="10" value={performance} onChange={e => setPerformance(parseInt(e.target.value))} className="w-full accent-primary h-3 bg-muted rounded-full appearance-none touch-manipulation" style={{ minHeight: '44px' }} />
      </div>

      <Button onClick={() => onSubmit(technique, musicality, performance)} className="w-full h-14 bg-primary text-lg font-bold touch-manipulation active:scale-95 transition-transform">
        Submit Score
      </Button>
    </div>
  );
}

interface Dancer {
  id: string;
  name: string;
  city: string | null;
  photo_url: string | null;
  video_url: string | null;
}

interface ActiveMatch {
  id: string;
  dancer_left_id: string | null;
  dancer_right_id: string | null;
  dancer_left?: Dancer;
  dancer_right?: Dancer;
  nomination_name?: string;
  current_round: number;
  battle_name: string;
  judging_mode?: string;
  vote_per_round?: boolean;
}

interface VoteHistory {
  id: string;
  match_id: string;
  round_number: number;
  vote_for: string | null;
  slider_technique: number | null;
  slider_musicality: number | null;
  slider_performance: number | null;
  created_at: string;
  dancer_name?: string;
}

interface ActiveHeat {
  dancers: Dancer[];
  nomination_id: string;
  nomination_name: string;
  battle_name: string;
  concurrent_circles: number;
}

interface HeatScore {
  dancer_id: string;
  score_technique: number;
  score_musicality: number;
  score_performance: number;
}

export default function JudgePanel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [voteHistory, setVoteHistory] = useState<VoteHistory[]>([]);
  const [hasVotedThisRound, setHasVotedThisRound] = useState(false);
  const [submittedVoteFor, setSubmittedVoteFor] = useState<string | null>(null);

  // Overviews / Schedule
  const [showSchedule, setShowSchedule] = useState(false);
  const [assignedNominations, setAssignedNominations] = useState<any[]>([]);
  const [scheduleMatches, setScheduleMatches] = useState<any[]>([]);
  const [scheduleDancers, setScheduleDancers] = useState<Dancer[]>([]);
  const [allMyVotes, setAllMyVotes] = useState<VoteHistory[]>([]);

  // Selection Heat State
  const [activeHeat, setActiveHeat] = useState<ActiveHeat | null>(null);
  const [heatScores, setHeatScores] = useState<HeatScore[]>([]);

  const [activeCircleView, setActiveCircleView] = useState(0);

  // Track previous match ID for notifications
  const prevMatchIdRef = useRef<string | null>(null);

  useEffect(() => {
    loadActiveMatch();

    const channelId = Math.random().toString(36).substring(7);

    const channel = supabase
      .channel(`judge-panel-updates-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screen_state'
        },
        () => {
          loadActiveMatch();
        }
      )
      .subscribe();

    const dancersChannel = supabase
      .channel(`judge-dancers-updates-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dancers'
        },
        () => {
          loadActiveMatch();
          loadSchedule();
        }
      )
      .subscribe();

    const matchesChannel = supabase
      .channel(`judge-matches-updates-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        () => {
          loadActiveMatch();
          loadSchedule();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(dancersChannel);
      supabase.removeChannel(matchesChannel);
    };
  }, []);

  const loadActiveMatch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("battle_id")
        .eq("user_id", user.id)
        .eq("role", "judge");

      if (!roles || roles.length === 0) {
        setActiveMatch(null);
        setLoading(false);
        return;
      }

      const battleIds = roles.map(r => r.battle_id);

      const { data: screenStates } = await supabase
        .from("screen_state")
        .select(`
          current_match_id,
          current_round,
          battle_id,
          nomination_id,
          active_selection_dancers,
          battles (
            name
          )
        `)
        .in("battle_id", battleIds)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle() as any;

      if (!screenStates || (!screenStates.current_match_id && (!screenStates.active_selection_dancers || screenStates.active_selection_dancers.length === 0))) {
        setActiveMatch(null);
        setActiveHeat(null);
        setLoading(false);
        return;
      }

      // Enforce judge assignments
      const { data: assignments } = await supabase
        .from("judge_assignments" as any)
        .select("nomination_id")
        .eq("battle_id", screenStates.battle_id)
        .eq("judge_id", user.id) as any;

      const allowedNominationIds = assignments?.map(a => a.nomination_id) || [];
      const hasRestrictionsForThisBattle = allowedNominationIds.length > 0;

      if (hasRestrictionsForThisBattle && !allowedNominationIds.includes(screenStates.nomination_id)) {
        setActiveMatch(null);
        setActiveHeat(null);
        setLoading(false);
        return;
      }

      const battleName = screenStates.battles?.name || "";

      // Handle Selection Heat Mode
      if (screenStates.active_selection_dancers && screenStates.active_selection_dancers.length > 0) {
        const { data: dancers } = await supabase
          .from("dancers")
          .select("*")
          .in("id", screenStates.active_selection_dancers);

        const { data: nom } = await supabase
          .from("nominations")
          .select("name, concurrent_circles")
          .eq("id", screenStates.nomination_id)
          .single() as any;

        const orderedDancers = screenStates.active_selection_dancers.map((id: string) => dancers?.find(d => d.id === id)).filter(Boolean) as Dancer[];

        setActiveMatch(null);
        setHasVotedThisRound(false);
        setSubmittedVoteFor(null);
        setActiveHeat({
          dancers: orderedDancers,
          nomination_id: screenStates.nomination_id!,
          nomination_name: nom?.name || "Qualifications",
          battle_name: battleName,
          concurrent_circles: nom?.concurrent_circles || 1,
        });

        // Auto-select circle view based on Judge Assignments
        if (assignments && assignments.length > 0) {
          // We'll just default to 0 for now since assignments don't specify circle A/B yet.
          setActiveCircleView(0);
        }

      const { data: existingScores } = await supabase
          .from("selection_scores")
          .select("*")
          .eq("nomination_id", screenStates.nomination_id)
          .eq("judge_id", user.id)
          .in("dancer_id", screenStates.active_selection_dancers);

        setHeatScores((existingScores || []) as HeatScore[]);
        setLoading(false);
        return;
      }

      // Handle Battle Match Mode
      setActiveHeat(null);
      const { data: matchData } = await supabase
        .from("matches")
        .select(`
          *,
          nominations (
            name,
            judging_mode,
            vote_per_round
          )
        `)
        .eq("id", screenStates.current_match_id)
        .single() as any;

      if (!matchData) {
        setActiveMatch(null);
        setLoading(false);
        return;
      }

      const dancerIds = [matchData.dancer_left_id, matchData.dancer_right_id].filter(Boolean);
      const { data: dancers } = await supabase
        .from("dancers")
        .select("*")
        .in("id", dancerIds);

      const dancersMap = new Map(dancers?.map(d => [d.id, d]) || []);

      const match: ActiveMatch = {
        id: matchData.id,
        dancer_left_id: matchData.dancer_left_id,
        dancer_right_id: matchData.dancer_right_id,
        dancer_left: matchData.dancer_left_id ? dancersMap.get(matchData.dancer_left_id) : undefined,
        dancer_right: matchData.dancer_right_id ? dancersMap.get(matchData.dancer_right_id) : undefined,
        nomination_name: matchData.nominations?.name,
        current_round: screenStates.current_round || 1,
        battle_name: screenStates.battles?.name || "",
        judging_mode: matchData.nominations?.judging_mode || "simple",
        vote_per_round: matchData.nominations?.vote_per_round !== false,
      };

      setActiveMatch(match);

      const effectiveRound = match.vote_per_round === false ? 1 : match.current_round;

      const { data: existingVote } = await supabase
        .from("match_votes")
        .select("id, vote_for")
        .eq("match_id", match.id)
        .eq("judge_id", user.id)
        .eq("round_number", effectiveRound)
        .maybeSingle();

      if (existingVote) {
        setHasVotedThisRound(true);
        setSubmittedVoteFor(existingVote.vote_for);
      } else {
        setHasVotedThisRound(false);
        setSubmittedVoteFor(null);
      }
      setLoading(false);
    } catch (error: any) {
      console.error("Error loading active match:", error);
      setLoading(false);
    }
  };

  const loadVoteHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: votes } = await supabase
        .from("match_votes")
        .select(`
          *,
          dancers:vote_for (
            name
          )
        `)
        .eq("judge_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (votes) {
        const history: VoteHistory[] = votes.map(v => ({
          ...v,
          dancer_name: v.dancers?.name
        }));
        setVoteHistory(history);
      }
    } catch (error) {
      console.error("Error loading vote history:", error);
    }
  };

  const loadSchedule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("battle_id")
        .eq("user_id", user.id)
        .eq("role", "judge");

      if (!roles || roles.length === 0) return;

      const battleIds = roles.map(r => r.battle_id);

      // 1. Get all nominations for these battles
      const { data: allNoms } = await supabase
        .from("nominations")
        .select("*")
        .in("battle_id", battleIds);

      // Check judge assignments
      const { data: assignments } = await supabase
        .from("judge_assignments" as any)
        .select("nomination_id, battle_id")
        .in("battle_id", battleIds)
        .eq("judge_id", user.id) as any;

      const assignedByBattle = assignments?.reduce((acc, curr) => {
        if (!acc[curr.battle_id]) acc[curr.battle_id] = [];
        acc[curr.battle_id].push(curr.nomination_id);
        return acc;
      }, {} as Record<string, string[]>) || {};

      const noms = allNoms?.filter(n => {
        const battleAssignments = assignedByBattle[n.battle_id];
        if (!battleAssignments || battleAssignments.length === 0) return true; // No restrictions for this battle
        return battleAssignments.includes(n.id);
      }) || [];

      setAssignedNominations(noms);

      if (noms && noms.length > 0) {
        const nomIds = noms.map(n => n.id);

        // 2. Get all matches for these nominations
        const { data: matches } = await supabase
          .from("matches")
          .select("*")
          .in("nomination_id", nomIds)
          .order("position");
        setScheduleMatches(matches || []);

        // 3. Get dancers
        const { data: dancers } = await supabase
          .from("dancers")
          .select("*")
          .in("nomination_id", nomIds);
        setScheduleDancers(dancers || []);

        // 4. Get all my votes for these matches
        if (matches && matches.length > 0) {
          const matchIds = matches.map(m => m.id);
          const { data: myVotes } = await supabase
            .from("match_votes")
            .select("*")
            .eq("judge_id", user.id)
            .in("match_id", matchIds);

          setAllMyVotes(myVotes || []);
        }
      }
    } catch (error) {
      console.error("Error loading schedule:", error);
    }
  };

  const openSchedule = async () => {
    await loadSchedule();
    setShowSchedule(true);
    setMenuOpen(false);
  };

  const submitVote = async (votedFor: string) => {
    if (!activeMatch) return;

    const effectiveRound = activeMatch.vote_per_round === false ? 1 : activeMatch.current_round;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("match_votes")
        .insert({
          match_id: activeMatch.id,
          judge_id: user.id,
          vote_for: votedFor,
          round_number: effectiveRound,
        });

      if (error) throw error;

      toast({
        title: "Vote Submitted",
        description: "Your vote has been recorded",
      });

      setSubmittedVoteFor(votedFor);
      setHasVotedThisRound(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const submitSliderVote = async (matchId: string, technique: number, musicality: number, performance: number, currentRound: number) => {
    if (!activeMatch) return;

    const effectiveRound = activeMatch.vote_per_round === false ? 1 : currentRound;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const total = technique + musicality + performance;
      let votedFor = null;

      if (total !== 0) {
        votedFor = total > 0 ? activeMatch.dancer_right_id : activeMatch.dancer_left_id;
      }

      const { error } = await supabase
        .from("match_votes")
        .insert({
          match_id: matchId,
          judge_id: user.id,
          vote_for: votedFor,
          round_number: effectiveRound,
          slider_technique: technique,
          slider_musicality: musicality,
          slider_performance: performance,
        });

      if (error) throw error;

      toast({
        title: "Vote Submitted",
        description: "Your scores have been recorded",
      });

      setSubmittedVoteFor(votedFor);
      setHasVotedThisRound(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const submitHeatScore = async (dancerId: string, technique: number, musicality: number, performance: number) => {
    if (!activeHeat) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Session expired",
          description: "Please sign in again",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("selection_scores")
        .upsert({
          nomination_id: activeHeat.nomination_id,
          dancer_id: dancerId,
          judge_id: user.id,
          score_technique: technique,
          score_musicality: musicality,
          score_performance: performance,
        }, { onConflict: "nomination_id,dancer_id,judge_id" });

      if (error) throw error;

      toast({
        title: "Score Recorded",
        description: "Dancer score saved.",
      });

      setHeatScores(prev => [
        ...prev.filter(s => s.dancer_id !== dancerId),
        { dancer_id: dancerId, score_technique: technique, score_musicality: musicality, score_performance: performance }
      ]);
    } catch (error: any) {
      console.error("submitHeatScore error:", error);
      toast({
        title: "Error saving score",
        description: error.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const undoVote = async () => {
    if (!activeMatch) return;

    const effectiveRound = activeMatch.vote_per_round === false ? 1 : activeMatch.current_round;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("match_votes")
        .delete()
        .eq("match_id", activeMatch.id)
        .eq("judge_id", user.id)
        .eq("round_number", effectiveRound);

      if (error) throw error;

      toast({
        title: "Vote Removed",
        description: "You have cancelled your previous vote.",
      });

      setSubmittedVoteFor(null);
      setHasVotedThisRound(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const openHistory = async () => {
    await loadVoteHistory();
    setShowHistory(true);
    setMenuOpen(false);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // History view
  if (showHistory) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-display font-bold">Vote History</h1>
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-3">
            {voteHistory.length === 0 ? (
              <div className="text-center py-16">
                <History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No votes yet</p>
              </div>
            ) : (
              voteHistory.map((vote) => (
                <Card key={vote.id} className="p-4 bg-background/50 border-border/50 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        {vote.dancer_name ? (
                          <>
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            {vote.dancer_name}
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                            Tie / Draw
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Round {vote.round_number}</p>
                    </div>
                    {vote.slider_technique !== null && (
                      <div className="flex gap-3 text-xs font-mono bg-muted/30 p-2 rounded-lg border border-border/30">
                        <div className="flex flex-col items-center">
                          <span className="text-muted-foreground mb-0.5">T</span>
                          <span className={vote.slider_technique > 0 ? "text-primary font-bold" : vote.slider_technique < 0 ? "text-secondary font-bold" : ""}>
                            {vote.slider_technique > 0 ? '+' : ''}{vote.slider_technique}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-muted-foreground mb-0.5">M</span>
                          <span className={vote.slider_musicality > 0 ? "text-primary font-bold" : vote.slider_musicality < 0 ? "text-secondary font-bold" : ""}>
                            {vote.slider_musicality > 0 ? '+' : ''}{vote.slider_musicality}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-muted-foreground mb-0.5">P</span>
                          <span className={vote.slider_performance > 0 ? "text-primary font-bold" : vote.slider_performance < 0 ? "text-secondary font-bold" : ""}>
                            {vote.slider_performance > 0 ? '+' : ''}{vote.slider_performance}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // Schedule view
  if (showSchedule) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-xl mx-auto p-6 pb-24">
          <div className="flex items-center justify-between mb-8 sticky top-0 bg-background/90 backdrop-blur pt-4 pb-2 z-10 border-b border-border/50">
            <h1 className="text-2xl font-display font-bold">My Battles Schedule</h1>
            <Button variant="ghost" size="icon" onClick={() => setShowSchedule(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-6">
            {assignedNominations.length === 0 ? (
              <div className="text-center py-16">
                <Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">You are not assigned to any battles yet.</p>
              </div>
            ) : (
              assignedNominations.map((nom) => {
                const nomsMatches = scheduleMatches.filter(m => m.nomination_id === nom.id);
                if (nomsMatches.length === 0) return null;

                return (
                  <div key={nom.id} className="space-y-3">
                    <h2 className="text-lg font-display font-bold text-primary border-b border-border/50 pb-2">
                      {nom.name}
                    </h2>

                    <div className="space-y-2">
                      {nomsMatches.map(match => {
                        const leftDancer = scheduleDancers.find(d => d.id === match.dancer_left_id);
                        const rightDancer = scheduleDancers.find(d => d.id === match.dancer_right_id);
                        const myVotesForMatch = allMyVotes.filter(v => v.match_id === match.id);

                        const isVoted = myVotesForMatch.length > 0;
                        const matchStatus = isVoted ? "Voted" : "Pending";

                        return (
                          <Card
                            key={match.id}
                            className={`p-4 transition-colors ${isVoted ? 'bg-muted/10 border-success/30' : 'bg-background/50 border-border/50'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Match {match.position}</span>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-primary">{leftDancer?.name || "Red"}</span>
                                  <span className="text-xs text-muted-foreground italic">vs</span>
                                  <span className="font-bold text-secondary">{rightDancer?.name || "Blue"}</span>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                {isVoted ? (
                                  <div className="flex items-center gap-1 text-success text-xs font-bold uppercase tracking-wider bg-success/10 px-2 py-1 rounded">
                                    <Check className="w-3 h-3" />
                                    Voted
                                  </div>
                                ) : (
                                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted px-2 py-1 rounded">
                                    Upcoming
                                  </div>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }

  // No active match - waiting screen
  if (!activeMatch && !activeHeat) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/5 rounded-full blur-2xl" />

        <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
          <Card className="w-full max-w-sm p-8 text-center bg-background/60 backdrop-blur-xl border-border/50 shadow-2xl">
            <div className="relative mx-auto w-24 h-24 mb-8">
              <div className="absolute inset-0 rounded-3xl bg-muted animate-pulse" />
              <div className="absolute inset-0 rounded-3xl border-2 border-primary/20 animate-[spin_4s_linear_infinite]" />
              <div className="absolute inset-0 rounded-3xl border-2 border-secondary/20 animate-[spin_5s_linear_infinite_reverse]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className="w-10 h-10 text-muted-foreground" />
              </div>
            </div>

            <h1 className="text-3xl font-display font-black tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Waiting for Battle
            </h1>
            <p className="text-muted-foreground font-medium">
              The operator will start the next match soon. Stay ready!
            </p>
          </Card>
        </div>

        {/* Floating Menu */}
        <div className="fab">
          <button
            className="fab-button flex items-center justify-center text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {menuOpen && (
            <div className="fab-menu">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={openSchedule}
              >
                <CalendarDays className="h-5 w-5" />
                Schedule
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={openHistory}
              >
                <History className="h-5 w-5" />
                Vote History
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => navigate("/")}
              >
                <Home className="h-5 w-5" />
                Home
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/auth");
                }}
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vote submitted - confirmation screen
  if (hasVotedThisRound) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="p-6 text-center border-b border-border/50">
          <h1 className="text-lg font-display font-bold">{activeMatch.battle_name}</h1>
          <p className="text-sm text-muted-foreground">
            {activeMatch.nomination_name} • {activeMatch.vote_per_round === false ? "Battle Vote" : `Round ${activeMatch.current_round}`}
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-sm animate-scale-in">
            {submittedVoteFor === activeMatch.dancer_left_id ? (
              <div className="w-32 h-32 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary overflow-hidden">
                {activeMatch.dancer_left?.video_url ? (
                  <video src={activeMatch.dancer_left.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : activeMatch.dancer_left?.photo_url ? (
                  <img src={activeMatch.dancer_left.photo_url} alt={activeMatch.dancer_left.name || "Red"} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <span className="block text-xs uppercase tracking-wider text-primary font-bold mb-1">Voted for</span>
                    <span className="text-2xl font-display font-bold text-primary">{activeMatch.dancer_left?.name || "Red"}</span>
                  </div>
                )}
              </div>
            ) : submittedVoteFor === activeMatch.dancer_right_id ? (
              <div className="w-32 h-32 mx-auto rounded-3xl bg-secondary/10 flex items-center justify-center border-2 border-secondary overflow-hidden">
                {activeMatch.dancer_right?.video_url ? (
                  <video src={activeMatch.dancer_right.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : activeMatch.dancer_right?.photo_url ? (
                  <img src={activeMatch.dancer_right.photo_url} alt={activeMatch.dancer_right.name || "Blue"} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <span className="block text-xs uppercase tracking-wider text-secondary font-bold mb-1">Voted for</span>
                    <span className="text-2xl font-display font-bold text-secondary">{activeMatch.dancer_right?.name || "Blue"}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="w-32 h-32 mx-auto rounded-3xl bg-muted flex items-center justify-center border-2 border-muted-foreground/30">
                <div className="text-center">
                  <span className="block text-xs uppercase tracking-wider text-muted-foreground font-bold mb-1">Voted</span>
                  <span className="text-xl font-display font-bold">Tie/Skip</span>
                </div>
              </div>
            )}

            <div>
              <h2 className="text-xl font-display font-bold mb-2 flex items-center justify-center gap-2">
                <Check className="w-5 h-5 text-success" />
                Vote Recorded
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Waiting for the next round...
              </p>
              <Button
                variant="outline"
                onClick={undoVote}
                className="w-full text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Undo / Change Vote
              </Button>
            </div>
          </div>
        </div>

        {/* Floating Menu */}
        <div className="fab">
          <button
            className="fab-button flex items-center justify-center text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {menuOpen && (
            <div className="fab-menu">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={openSchedule}
              >
                <CalendarDays className="h-5 w-5" />
                Schedule
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={openHistory}
              >
                <History className="h-5 w-5" />
                Vote History
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => navigate("/")}
              >
                <Home className="h-5 w-5" />
                Home
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/auth");
                }}
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active Heat - Selection Mode Screen
  if (activeHeat) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="p-6 text-center border-b border-border/50 sticky top-0 bg-background/95 z-10 backdrop-blur">
          <h1 className="text-lg font-display font-bold">{activeHeat.battle_name}</h1>
          <p className="text-sm text-muted-foreground">
            {activeHeat.nomination_name} • Selection Heat
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-2xl mx-auto w-full pb-32">

          {activeHeat.concurrent_circles > 1 && (
            <div className="flex items-center justify-center gap-2 mb-4 bg-background/50 p-2 rounded-2xl backdrop-blur border border-border/50 w-fit mx-auto sticky top-[90px] z-10 shadow-lg">
              {Array.from({ length: activeHeat.concurrent_circles }).map((_, i) => (
                <Button
                  key={i}
                  variant={activeCircleView === i ? "default" : "ghost"}
                  onClick={() => setActiveCircleView(i)}
                  className={`rounded-xl px-6 font-bold ${activeCircleView === i ? "bg-primary text-black" : "text-muted-foreground"}`}
                >
                  Circle {String.fromCharCode(65 + i)}
                </Button>
              ))}
            </div>
          )}

          {(() => {
            const dancersPerCircle = Math.ceil(activeHeat.dancers.length / activeHeat.concurrent_circles);
            const visibleDancers = activeHeat.dancers.slice(
              activeCircleView * dancersPerCircle,
              (activeCircleView + 1) * dancersPerCircle
            );

            return visibleDancers.map(dancer => {
              const existingScore = heatScores.find(s => s.dancer_id === dancer.id);
              return (
                <Card key={dancer.id} className="p-6 border-border/50 bg-background/50 backdrop-blur">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {dancer.photo_url ? (
                        <img src={dancer.photo_url} alt={dancer.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-primary" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold">{dancer.name}</h3>
                      {dancer.city && <p className="text-sm text-muted-foreground">{dancer.city}</p>}
                    </div>
                  </div>

                  {existingScore ? (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30 mt-4">
                      <div className="text-success font-bold flex justify-center items-center gap-2 mb-3">
                        <Check className="w-5 h-5" /> Score Recorded
                      </div>
                      <div className="flex justify-center gap-4 text-sm font-mono text-muted-foreground">
                        <div>T: <span className="text-foreground">{existingScore.score_technique}</span></div>
                        <div>M: <span className="text-foreground">{existingScore.score_musicality}</span></div>
                        <div>P: <span className="text-foreground">{existingScore.score_performance}</span></div>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setHeatScores(prev => prev.filter(s => s.dancer_id !== dancer.id))}
                        className="w-full mt-4 h-10"
                      >
                        Undo / Change
                      </Button>
                    </div>
                  ) : (
                    <HeatSliderVoting
                      onSubmit={(t, m, p) => submitHeatScore(dancer.id, t, m, p)}
                    />
                  )}
                </Card>
              );
            });
          })()}

          {heatScores.length >= Math.ceil(activeHeat.dancers.length / activeHeat.concurrent_circles) && activeHeat.dancers.length > 0 && (
            <div className="text-center p-6 bg-success/10 border border-success/30 rounded-xl text-success animate-scale-in">
              <Check className="w-8 h-8 mx-auto mb-2" />
              <h3 className="font-bold text-lg mb-1">Circle Scored</h3>
              <p className="text-sm opacity-90">Waiting for next heat...</p>
            </div>
          )}
        </div>

        {/* Floating Menu */}
        <div className="fab">
          <button
            className="fab-button flex items-center justify-center text-white"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          {menuOpen && (
            <div className="fab-menu">
              <Button onClick={() => navigate("/")} variant="ghost" className="w-full justify-start gap-3 h-12 text-foreground">
                <Home className="h-5 w-5" /> Home
              </Button>
              <Button onClick={openHistory} variant="ghost" className="w-full justify-start gap-3 h-12 text-foreground">
                <History className="h-5 w-5" /> Vote History
              </Button>
              <Button onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }} variant="ghost" className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive">
                <LogOut className="h-5 w-5" /> Sign Out
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active match - voting screen
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 text-center border-b border-border/50">
        <h1 className="text-lg font-display font-bold">{activeMatch.battle_name}</h1>
        <p className="text-sm text-muted-foreground">
          {activeMatch.nomination_name} • {activeMatch.vote_per_round === false ? "Battle Vote" : `Round ${activeMatch.current_round}`}
        </p>
      </div>

      {/* Voting Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        {activeMatch.judging_mode === "simple" ? (
          <div className="w-full max-w-4xl">
            {/* VS Header */}
            <div className="flex items-center justify-center mb-10 relative">
              <div className="absolute left-0 right-1/2 h-px bg-gradient-to-l from-primary/50 to-transparent" />
              <div className="absolute left-1/2 right-0 h-px bg-gradient-to-r from-secondary/50 to-transparent" />
              <div className="relative z-10 w-16 h-16 rounded-full bg-background border-2 border-border/50 flex items-center justify-center shadow-lg transform -rotate-12">
                <span className="text-2xl font-display font-black text-muted-foreground italic">VS</span>
              </div>
            </div>

            {/* Dancer Cards */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {/* Left Dancer - Red */}
              <button
                className="group touch-manipulation"
                onClick={() => {
                  activeMatch.dancer_left_id && submitVote(activeMatch.dancer_left_id);
                  if (navigator.vibrate) navigator.vibrate(50);
                }}
              >
                <Card className="p-4 sm:p-8 text-center card-red hover:border-primary transition-all active:scale-[0.92] hover:shadow-glow-red min-h-[200px] sm:min-h-[280px] flex items-center justify-center">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors overflow-hidden shrink-0">
                      {activeMatch.dancer_left?.video_url ? (
                        <video src={activeMatch.dancer_left.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                      ) : activeMatch.dancer_left?.photo_url ? (
                        <img src={activeMatch.dancer_left.photo_url} alt={activeMatch.dancer_left.name || "Red"} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 sm:w-14 sm:h-14 text-primary" />
                      )}
                    </div>
                    <div>
                      <div className="text-lg sm:text-2xl font-display font-bold text-primary truncate">
                        {activeMatch.dancer_left?.name || "Waiting"}
                      </div>
                      {activeMatch.dancer_left?.city && (
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {activeMatch.dancer_left.city}
                        </div>
                      )}
                    </div>
                    <div className="pt-1 sm:pt-2">
                      <span className="inline-block px-4 py-2.5 rounded-full bg-primary/10 text-primary font-bold text-sm sm:text-base">
                        Tap to Vote
                      </span>
                    </div>
                  </div>
                </Card>
              </button>

              {/* Right Dancer - Blue */}
              <button
                className="group touch-manipulation"
                onClick={() => {
                  activeMatch.dancer_right_id && submitVote(activeMatch.dancer_right_id);
                  if (navigator.vibrate) navigator.vibrate(50);
                }}
              >
                <Card className="p-4 sm:p-8 text-center card-blue hover:border-secondary transition-all active:scale-[0.92] hover:shadow-glow-blue min-h-[200px] sm:min-h-[280px] flex items-center justify-center">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors overflow-hidden shrink-0">
                      {activeMatch.dancer_right?.video_url ? (
                        <video src={activeMatch.dancer_right.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                      ) : activeMatch.dancer_right?.photo_url ? (
                        <img src={activeMatch.dancer_right.photo_url} alt={activeMatch.dancer_right.name || "Blue"} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-12 h-12 sm:w-14 sm:h-14 text-secondary" />
                      )}
                    </div>
                    <div>
                      <div className="text-lg sm:text-2xl font-display font-bold text-secondary truncate">
                        {activeMatch.dancer_right?.name || "Waiting"}
                      </div>
                      {activeMatch.dancer_right?.city && (
                        <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {activeMatch.dancer_right.city}
                        </div>
                      )}
                    </div>
                    <div className="pt-1 sm:pt-2">
                      <span className="inline-block px-4 py-2.5 rounded-full bg-secondary/10 text-secondary font-bold text-sm sm:text-base">
                        Tap to Vote
                      </span>
                    </div>
                  </div>
                </Card>
              </button>
            </div>

            {/* Tie / Draw Button */}
            <div className="mt-8 flex justify-center">
              <button
                className="group w-full max-w-xs"
                onClick={() => submitVote(null as any as string)} // Tie is encoded as null in db
              >
                <Card className="p-4 text-center border-border/30 hover:border-foreground/30 bg-background/50 hover:bg-muted/20 transition-all active:scale-95 shadow-sm">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-muted-foreground/20 transition-colors">
                      <div className="w-4 h-1 bg-muted-foreground rounded-full" />
                    </div>
                    <span className="text-lg font-display font-bold text-foreground">Tie / Draw</span>
                  </div>
                </Card>
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-lg">
            <SliderVoting
              matchId={activeMatch.id}
              dancerLeft={{
                name: activeMatch.dancer_left?.name || "Waiting",
                city: activeMatch.dancer_left?.city,
                photo_url: activeMatch.dancer_left?.photo_url,
                video_url: activeMatch.dancer_left?.video_url
              }}
              dancerRight={{
                name: activeMatch.dancer_right?.name || "Waiting",
                city: activeMatch.dancer_right?.city,
                photo_url: activeMatch.dancer_right?.photo_url,
                video_url: activeMatch.dancer_right?.video_url
              }}
              currentRound={activeMatch.current_round}
              onSubmit={submitSliderVote}
            />
          </div>
        )}
      </div>

      {/* Floating Menu */}
      <div className="fab">
        <button
          className="fab-button flex items-center justify-center text-white"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>

        {menuOpen && (
          <div className="fab-menu">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
              onClick={openHistory}
            >
              <History className="h-5 w-5" />
              Vote History
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate("/")}
            >
              <Home className="h-5 w-5" />
              Home
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth");
              }}
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
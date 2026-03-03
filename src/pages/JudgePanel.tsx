import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Menu, History, LogOut, X, Home, Check, User, CalendarDays, Sparkles } from "lucide-react";
import SliderVoting from "@/components/SliderVoting";

// ── Heat Slider (inline) ──
function HeatSliderVoting({ onSubmit }: { onSubmit: (t: number, m: number, p: number) => void }) {
  const [technique, setTechnique] = useState(5);
  const [musicality, setMusicality] = useState(5);
  const [performance, setPerformance] = useState(5);

  return (
    <div className="space-y-6 mt-4">
      {[
        { label: "Technique", value: technique, set: setTechnique },
        { label: "Musicality", value: musicality, set: setMusicality },
        { label: "Performance", value: performance, set: setPerformance },
      ].map(({ label, value, set }) => (
        <div key={label} className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className="font-mono text-primary font-bold text-lg">{value}</span>
          </div>
          <input type="range" min="1" max="10" value={value} onChange={e => set(parseInt(e.target.value))} className="w-full accent-primary h-3 bg-muted rounded-full appearance-none touch-manipulation" style={{ minHeight: '48px' }} />
        </div>
      ))}
      <Button onClick={() => onSubmit(technique, musicality, performance)} className="w-full h-14 text-lg font-bold touch-manipulation active:scale-95 transition-transform">
        Submit Score
      </Button>
    </div>
  );
}

// ── Types ──
interface Dancer { id: string; name: string; city: string | null; photo_url: string | null; video_url: string | null; }
interface ActiveMatch { id: string; dancer_left_id: string | null; dancer_right_id: string | null; dancer_left?: Dancer; dancer_right?: Dancer; nomination_name?: string; current_round: number; battle_name: string; judging_mode?: string; vote_per_round?: boolean; }
interface VoteHistory { id: string; match_id: string; round_number: number; vote_for: string | null; slider_technique: number | null; slider_musicality: number | null; slider_performance: number | null; created_at: string; dancer_name?: string; }
interface ActiveHeat { dancers: Dancer[]; nomination_id: string; nomination_name: string; battle_name: string; concurrent_circles: number; }
interface HeatScore { dancer_id: string; score_technique: number; score_musicality: number; score_performance: number; }

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

  const [showSchedule, setShowSchedule] = useState(false);
  const [assignedNominations, setAssignedNominations] = useState<any[]>([]);
  const [scheduleMatches, setScheduleMatches] = useState<any[]>([]);
  const [scheduleDancers, setScheduleDancers] = useState<Dancer[]>([]);
  const [allMyVotes, setAllMyVotes] = useState<VoteHistory[]>([]);

  const [activeHeat, setActiveHeat] = useState<ActiveHeat | null>(null);
  const [heatScores, setHeatScores] = useState<HeatScore[]>([]);
  const [activeCircleView, setActiveCircleView] = useState(0);

  const prevMatchIdRef = useRef<string | null>(null);

  // ── All Effects & Data Loading (PRESERVED 1:1) ──
  useEffect(() => {
    loadActiveMatch();
    const channelId = Math.random().toString(36).substring(7);
    const channel = supabase.channel(`judge-panel-updates-${channelId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'screen_state' }, () => { loadActiveMatch(true); }).subscribe();
    const dancersChannel = supabase.channel(`judge-dancers-updates-${channelId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'dancers' }, () => { loadActiveMatch(); loadSchedule(); }).subscribe();
    const matchesChannel = supabase.channel(`judge-matches-updates-${channelId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => { loadActiveMatch(); loadSchedule(); }).subscribe();
    return () => { supabase.removeChannel(channel); supabase.removeChannel(dancersChannel); supabase.removeChannel(matchesChannel); };
  }, []);

  const loadActiveMatch = async (fromRealtime = false) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/auth"); return; }

      const { data: roles } = await supabase.from("user_roles").select("battle_id").eq("user_id", user.id).eq("role", "judge");
      if (!roles || roles.length === 0) { setActiveMatch(null); setLoading(false); return; }

      const battleIds = roles.map(r => r.battle_id);
      const { data: screenStates } = await supabase.from("screen_state").select(`current_match_id, current_round, battle_id, nomination_id, active_selection_dancers, battles (name)`).in("battle_id", battleIds).order("created_at", { ascending: false }).limit(1).maybeSingle() as any;

      if (!screenStates || (!screenStates.current_match_id && (!screenStates.active_selection_dancers || screenStates.active_selection_dancers.length === 0))) {
        setActiveMatch(null); setActiveHeat(null); setLoading(false); return;
      }

      const { data: assignments } = await supabase.from("judge_assignments" as any).select("nomination_id").eq("battle_id", screenStates.battle_id).eq("judge_id", user.id) as any;
      const allowedNominationIds = assignments?.map((a: any) => a.nomination_id) || [];
      const hasRestrictionsForThisBattle = allowedNominationIds.length > 0;
      if (hasRestrictionsForThisBattle && !allowedNominationIds.includes(screenStates.nomination_id)) { setActiveMatch(null); setActiveHeat(null); setLoading(false); return; }

      const battleName = screenStates.battles?.name || "";

      // Selection Heat Mode
      if (screenStates.active_selection_dancers && screenStates.active_selection_dancers.length > 0) {
        const { data: dancers } = await supabase.from("dancers").select("*").in("id", screenStates.active_selection_dancers);
        const { data: nom } = await supabase.from("nominations").select("name, concurrent_circles").eq("id", screenStates.nomination_id).single() as any;
        const orderedDancers = screenStates.active_selection_dancers.map((id: string) => dancers?.find(d => d.id === id)).filter(Boolean) as Dancer[];
        setActiveMatch(null); setHasVotedThisRound(false); setSubmittedVoteFor(null);
        setActiveHeat({ dancers: orderedDancers, nomination_id: screenStates.nomination_id!, nomination_name: nom?.name || "Qualifications", battle_name: battleName, concurrent_circles: nom?.concurrent_circles || 1 });
        if (assignments && assignments.length > 0) setActiveCircleView(0);
        const { data: existingScores } = await supabase.from("selection_scores").select("*").eq("nomination_id", screenStates.nomination_id).eq("judge_id", user.id).in("dancer_id", screenStates.active_selection_dancers);
        setHeatScores((existingScores || []) as HeatScore[]);
        setLoading(false);
        return;
      }

      // Battle Match Mode
      setActiveHeat(null);
      const { data: matchData } = await supabase.from("matches").select(`*, nominations (name, judging_mode, vote_per_round)`).eq("id", screenStates.current_match_id).single() as any;
      if (!matchData) { setActiveMatch(null); setLoading(false); return; }

      const dancerIds = [matchData.dancer_left_id, matchData.dancer_right_id].filter(Boolean);
      const { data: dancers } = await supabase.from("dancers").select("*").in("id", dancerIds);
      const dancersMap = new Map(dancers?.map(d => [d.id, d]) || []);

      const match: ActiveMatch = {
        id: matchData.id, dancer_left_id: matchData.dancer_left_id, dancer_right_id: matchData.dancer_right_id,
        dancer_left: matchData.dancer_left_id ? dancersMap.get(matchData.dancer_left_id) : undefined,
        dancer_right: matchData.dancer_right_id ? dancersMap.get(matchData.dancer_right_id) : undefined,
        nomination_name: matchData.nominations?.name, current_round: screenStates.current_round || 1,
        battle_name: screenStates.battles?.name || "", judging_mode: matchData.nominations?.judging_mode || "simple",
        vote_per_round: matchData.nominations?.vote_per_round !== false,
      };

      setActiveMatch(match);

      if (fromRealtime && match.id !== prevMatchIdRef.current) {
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        toast({ title: "🔴 New Match Active!", description: `${match.dancer_left?.name || "TBD"} vs ${match.dancer_right?.name || "TBD"}` });
      }
      prevMatchIdRef.current = match.id;

      const effectiveRound = match.vote_per_round === false ? 1 : match.current_round;
      const { data: existingVote } = await supabase.from("match_votes").select("id, vote_for").eq("match_id", match.id).eq("judge_id", user.id).eq("round_number", effectiveRound).maybeSingle();
      if (existingVote) { setHasVotedThisRound(true); setSubmittedVoteFor(existingVote.vote_for); } else { setHasVotedThisRound(false); setSubmittedVoteFor(null); }
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
      const { data: votes } = await supabase.from("match_votes").select(`*, dancers:vote_for (name)`).eq("judge_id", user.id).order("created_at", { ascending: false }).limit(50);
      if (votes) { setVoteHistory(votes.map(v => ({ ...v, dancer_name: v.dancers?.name }))); }
    } catch (error) { console.error("Error loading vote history:", error); }
  };

  const loadSchedule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: roles } = await supabase.from("user_roles").select("battle_id").eq("user_id", user.id).eq("role", "judge");
      if (!roles || roles.length === 0) return;
      const battleIds = roles.map(r => r.battle_id);
      const { data: allNoms } = await supabase.from("nominations").select("*").in("battle_id", battleIds);
      const { data: assignments } = await supabase.from("judge_assignments" as any).select("nomination_id, battle_id").in("battle_id", battleIds).eq("judge_id", user.id) as any;
      const assignedByBattle = assignments?.reduce((acc: any, curr: any) => { if (!acc[curr.battle_id]) acc[curr.battle_id] = []; acc[curr.battle_id].push(curr.nomination_id); return acc; }, {} as Record<string, string[]>) || {};
      const noms = allNoms?.filter(n => { const ba = assignedByBattle[n.battle_id]; if (!ba || ba.length === 0) return true; return ba.includes(n.id); }) || [];
      setAssignedNominations(noms);
      if (noms && noms.length > 0) {
        const nomIds = noms.map(n => n.id);
        const { data: matches } = await supabase.from("matches").select("*").in("nomination_id", nomIds).order("position");
        setScheduleMatches(matches || []);
        const { data: dancers } = await supabase.from("dancers").select("*").in("nomination_id", nomIds);
        setScheduleDancers(dancers || []);
        if (matches && matches.length > 0) {
          const matchIds = matches.map(m => m.id);
          const { data: myVotes } = await supabase.from("match_votes").select("*").eq("judge_id", user.id).in("match_id", matchIds);
          setAllMyVotes(myVotes || []);
        }
      }
    } catch (error) { console.error("Error loading schedule:", error); }
  };

  const openSchedule = async () => { await loadSchedule(); setShowSchedule(true); setMenuOpen(false); };

  // ── Vote Actions (PRESERVED 1:1) ──
  const submitVote = async (votedFor: string) => {
    if (!activeMatch) return;
    const effectiveRound = activeMatch.vote_per_round === false ? 1 : activeMatch.current_round;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("match_votes").insert({ match_id: activeMatch.id, judge_id: user.id, vote_for: votedFor, round_number: effectiveRound });
      if (error) throw error;
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
      toast({ title: "Vote Submitted", description: "Your vote has been recorded" });
      setSubmittedVoteFor(votedFor); setHasVotedThisRound(true);
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const submitSliderVote = async (matchId: string, technique: number, musicality: number, performance: number, currentRound: number) => {
    if (!activeMatch) return;
    const effectiveRound = activeMatch.vote_per_round === false ? 1 : currentRound;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const total = technique + musicality + performance;
      let votedFor = null;
      if (total !== 0) votedFor = total > 0 ? activeMatch.dancer_right_id : activeMatch.dancer_left_id;
      const { error } = await supabase.from("match_votes").insert({ match_id: matchId, judge_id: user.id, vote_for: votedFor, round_number: effectiveRound, slider_technique: technique, slider_musicality: musicality, slider_performance: performance });
      if (error) throw error;
      toast({ title: "Vote Submitted", description: "Your scores have been recorded" });
      setSubmittedVoteFor(votedFor); setHasVotedThisRound(true);
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const submitHeatScore = async (dancerId: string, technique: number, musicality: number, performance: number) => {
    if (!activeHeat) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "Session expired", description: "Please sign in again", variant: "destructive" }); navigate("/auth"); return; }
      const { error } = await supabase.from("selection_scores").upsert({ nomination_id: activeHeat.nomination_id, dancer_id: dancerId, judge_id: user.id, score_technique: technique, score_musicality: musicality, score_performance: performance }, { onConflict: "nomination_id,dancer_id,judge_id" });
      if (error) throw error;
      toast({ title: "Score Recorded", description: "Dancer score saved." });
      setHeatScores(prev => [...prev.filter(s => s.dancer_id !== dancerId), { dancer_id: dancerId, score_technique: technique, score_musicality: musicality, score_performance: performance }]);
    } catch (error: any) { console.error("submitHeatScore error:", error); toast({ title: "Error saving score", description: error.message || "Unknown error", variant: "destructive" }); }
  };

  const undoVote = async () => {
    if (!activeMatch) return;
    const effectiveRound = activeMatch.vote_per_round === false ? 1 : activeMatch.current_round;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { error } = await supabase.from("match_votes").delete().eq("match_id", activeMatch.id).eq("judge_id", user.id).eq("round_number", effectiveRound);
      if (error) throw error;
      toast({ title: "Vote Removed", description: "You have cancelled your previous vote." });
      setSubmittedVoteFor(null); setHasVotedThisRound(false);
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const openHistory = async () => { await loadVoteHistory(); setShowHistory(true); setMenuOpen(false); };

  // ── Floating Menu Component ──
  const FloatingMenu = ({ showCypher = false }: { showCypher?: boolean }) => (
    <div className="fab">
      <button className="fab-button flex items-center justify-center text-white" onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>
      {menuOpen && (
        <div className="fab-menu">
          <Button variant="ghost" className="w-full justify-start gap-3 h-12" onClick={openSchedule}><CalendarDays className="h-5 w-5" />Schedule</Button>
          <Button variant="ghost" className="w-full justify-start gap-3 h-12" onClick={openHistory}><History className="h-5 w-5" />Vote History</Button>
          {showCypher && activeHeat && (
            <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-primary" onClick={() => { setMenuOpen(false); window.open(`/cypher-swipe/${activeHeat.nomination_id}`, '_blank'); }}><Sparkles className="h-5 w-5" />Cypher Swipe</Button>
          )}
          <Button variant="ghost" className="w-full justify-start gap-3 h-12" onClick={() => navigate("/")}><Home className="h-5 w-5" />Home</Button>
          <Button variant="ghost" className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive" onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }}><LogOut className="h-5 w-5" />Sign Out</Button>
        </div>
      )}
    </div>
  );

  // ═══════════ RENDER ═══════════

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading…</p>
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
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}><X className="h-5 w-5" /></Button>
          </div>
          <div className="space-y-3">
            {voteHistory.length === 0 ? (
              <div className="text-center py-16"><History className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">No votes yet</p></div>
            ) : voteHistory.map((vote) => (
              <Card key={vote.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${vote.dancer_name ? 'bg-primary' : 'bg-muted-foreground'}`} />
                      {vote.dancer_name || "Tie / Draw"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Round {vote.round_number}</p>
                  </div>
                  {vote.slider_technique !== null && (
                    <div className="flex gap-3 text-xs font-mono bg-muted/30 p-2 rounded-lg border border-border/30">
                      {[{ l: "T", v: vote.slider_technique }, { l: "M", v: vote.slider_musicality }, { l: "P", v: vote.slider_performance }].map(s => (
                        <div key={s.l} className="flex flex-col items-center">
                          <span className="text-muted-foreground mb-0.5">{s.l}</span>
                          <span className={s.v! > 0 ? "text-primary font-bold" : s.v! < 0 ? "text-secondary font-bold" : ""}>{s.v! > 0 ? '+' : ''}{s.v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            ))}
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
            <h1 className="text-2xl font-display font-bold">My Schedule</h1>
            <Button variant="ghost" size="icon" onClick={() => setShowSchedule(false)}><X className="h-5 w-5" /></Button>
          </div>
          <div className="space-y-6">
            {assignedNominations.length === 0 ? (
              <div className="text-center py-16"><Trophy className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">No assignments yet.</p></div>
            ) : assignedNominations.map((nom) => {
              const nomsMatches = scheduleMatches.filter(m => m.nomination_id === nom.id);
              if (nomsMatches.length === 0) return null;
              return (
                <div key={nom.id} className="space-y-3">
                  <h2 className="text-lg font-display font-bold text-primary border-b border-border/50 pb-2">{nom.name}</h2>
                  <div className="space-y-2">
                    {nomsMatches.map(match => {
                      const leftDancer = scheduleDancers.find(d => d.id === match.dancer_left_id);
                      const rightDancer = scheduleDancers.find(d => d.id === match.dancer_right_id);
                      const isVoted = allMyVotes.some(v => v.match_id === match.id);
                      return (
                        <Card key={match.id} className={`p-4 ${isVoted ? 'border-success/30' : ''}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">Match {match.position}</span>
                              <div className="flex items-center gap-3 mt-0.5">
                                <span className="font-bold text-primary text-sm">{leftDancer?.name || "TBD"}</span>
                                <span className="text-[10px] text-muted-foreground">vs</span>
                                <span className="font-bold text-secondary text-sm">{rightDancer?.name || "TBD"}</span>
                              </div>
                            </div>
                            {isVoted ? (
                              <div className="flex items-center gap-1 text-success text-[10px] font-bold uppercase bg-success/10 px-2 py-1 rounded"><Check className="w-3 h-3" />Voted</div>
                            ) : (
                              <div className="text-[10px] font-semibold text-muted-foreground uppercase bg-muted px-2 py-1 rounded">Upcoming</div>
                            )}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Waiting screen ──
  if (!activeMatch && !activeHeat) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-neon/3 rounded-full blur-[100px]" />

        <div className="flex-1 flex flex-col items-center justify-center p-10 relative z-10">
          <div className="text-center space-y-8 max-w-xs">
            <div className="relative mx-auto w-24 h-24">
              <div className="absolute inset-0 rounded-2xl bg-muted/50 animate-pulse" />
              <div className="absolute inset-0 rounded-2xl border-2 border-neon/20 animate-[spin_4s_linear_infinite]" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Trophy className="w-9 h-9 text-muted-foreground/60" />
              </div>
            </div>
            <h1 className="text-4xl font-display font-black tracking-tight">Waiting</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">The operator will start the next match soon.</p>
          </div>
        </div>

        <FloatingMenu showCypher />
      </div>
    );
  }

  // ── Vote submitted ──
  if (hasVotedThisRound && activeMatch) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="text-center space-y-6 max-w-sm animate-scale-in">
            {/* Voted indicator */}
            <div className={`w-24 h-24 mx-auto rounded-2xl flex items-center justify-center border-2 ${
              submittedVoteFor === activeMatch.dancer_left_id ? 'bg-primary/10 border-primary' :
              submittedVoteFor === activeMatch.dancer_right_id ? 'bg-secondary/10 border-secondary' :
              'bg-muted border-muted-foreground/30'
            }`}>
              <Check className={`w-10 h-10 ${
                submittedVoteFor === activeMatch.dancer_left_id ? 'text-primary' :
                submittedVoteFor === activeMatch.dancer_right_id ? 'text-secondary' :
                'text-muted-foreground'
              }`} />
            </div>

            <div>
              <h2 className="text-xl font-display font-bold mb-1 flex items-center justify-center gap-2">
                <Check className="w-5 h-5 text-success" />Vote Recorded
              </h2>
              <p className="text-sm text-muted-foreground">
                {submittedVoteFor === activeMatch.dancer_left_id ? activeMatch.dancer_left?.name :
                 submittedVoteFor === activeMatch.dancer_right_id ? activeMatch.dancer_right?.name : "Tie"}
              </p>
            </div>

            <Button variant="outline" onClick={undoVote} className="w-full text-muted-foreground">
              Undo / Change Vote
            </Button>
          </div>
        </div>
        <FloatingMenu />
      </div>
    );
  }

  // ── Active Heat (Selection) ──
  if (activeHeat) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Minimal header */}
        <div className="p-4 text-center border-b border-border/50 sticky top-0 bg-background/95 z-10 backdrop-blur">
          <p className="text-xs text-muted-foreground font-medium">{activeHeat.battle_name} • {activeHeat.nomination_name}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5 max-w-lg mx-auto w-full pb-32">
          {activeHeat.concurrent_circles > 1 && (
            <div className="flex items-center justify-center gap-2 mb-2 sticky top-[52px] z-10 bg-background/90 backdrop-blur py-2">
              {Array.from({ length: activeHeat.concurrent_circles }).map((_, i) => (
                <Button key={i} variant={activeCircleView === i ? "default" : "ghost"} onClick={() => setActiveCircleView(i)} className={`rounded-xl px-6 font-bold ${activeCircleView === i ? "" : "text-muted-foreground"}`}>
                  Circle {String.fromCharCode(65 + i)}
                </Button>
              ))}
            </div>
          )}

          {(() => {
            const dancersPerCircle = Math.ceil(activeHeat.dancers.length / activeHeat.concurrent_circles);
            const visibleDancers = activeHeat.dancers.slice(activeCircleView * dancersPerCircle, (activeCircleView + 1) * dancersPerCircle);
            return visibleDancers.map(dancer => {
              const existingScore = heatScores.find(s => s.dancer_id === dancer.id);
              return (
                <Card key={dancer.id} className="p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                      {dancer.photo_url ? <img src={dancer.photo_url} alt={dancer.name} className="w-full h-full object-cover" /> : <User className="w-7 h-7 text-primary" />}
                    </div>
                    <div>
                      <h3 className="text-xl font-display font-bold">{dancer.name}</h3>
                      {dancer.city && <p className="text-xs text-muted-foreground">{dancer.city}</p>}
                    </div>
                  </div>
                  {existingScore ? (
                    <div className="p-4 rounded-xl bg-success/10 border border-success/30">
                      <div className="text-success font-bold flex justify-center items-center gap-2 mb-2"><Check className="w-5 h-5" />Scored</div>
                      <div className="flex justify-center gap-4 text-xs font-mono text-muted-foreground">
                        <span>T: <span className="text-foreground">{existingScore.score_technique}</span></span>
                        <span>M: <span className="text-foreground">{existingScore.score_musicality}</span></span>
                        <span>P: <span className="text-foreground">{existingScore.score_performance}</span></span>
                      </div>
                      <Button variant="outline" onClick={() => setHeatScores(prev => prev.filter(s => s.dancer_id !== dancer.id))} className="w-full mt-3 h-10">Change</Button>
                    </div>
                  ) : <HeatSliderVoting onSubmit={(t, m, p) => submitHeatScore(dancer.id, t, m, p)} />}
                </Card>
              );
            });
          })()}

          {heatScores.length >= Math.ceil(activeHeat.dancers.length / activeHeat.concurrent_circles) && activeHeat.dancers.length > 0 && (
            <div className="text-center p-6 bg-success/10 border border-success/30 rounded-xl text-success animate-scale-in">
              <Check className="w-8 h-8 mx-auto mb-2" />
              <h3 className="font-bold text-lg">All Scored</h3>
              <p className="text-sm opacity-80">Waiting for next heat…</p>
            </div>
          )}
        </div>

        <FloatingMenu />
      </div>
    );
  }

  // ═══ Active Match — VOTING SCREEN ═══
  // 90% giant buttons, minimal chrome
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Ultra-minimal header */}
      <div className="px-5 py-4 text-center">
        <p className="text-xs text-muted-foreground font-semibold tracking-wide">
          {activeMatch!.nomination_name} • {activeMatch!.vote_per_round === false ? "Battle" : `Round ${activeMatch!.current_round}`}
        </p>
      </div>

      {/* VOTING AREA — takes up all space */}
      <div className="flex-1 flex items-center justify-center px-5 pb-24">
        {activeMatch!.judging_mode === "simple" ? (
          <div className="w-full max-w-xl space-y-5">
            {/* Giant vote buttons — full width, huge tap targets */}
            <button
              className="w-full touch-manipulation active:scale-[0.96] transition-transform"
              onClick={() => { activeMatch!.dancer_left_id && submitVote(activeMatch!.dancer_left_id); if (navigator.vibrate) navigator.vibrate(50); }}
            >
              <div className="w-full rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 to-transparent p-8 sm:p-12 text-center hover:border-primary hover-glow-red transition-all" style={{ minHeight: '180px' }}>
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  {activeMatch!.dancer_left?.photo_url ? (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden mx-auto">
                      <img src={activeMatch!.dancer_left.photo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                  <div className="text-3xl sm:text-5xl font-display font-black text-primary tracking-tight">
                    {activeMatch!.dancer_left?.name || "Waiting"}
                  </div>
                </div>
              </div>
            </button>

            {/* VS divider */}
            <div className="flex items-center justify-center py-1">
              <div className="h-px flex-1 bg-border/30" />
              <span className="px-6 text-xl font-display font-black text-muted-foreground/30">VS</span>
              <div className="h-px flex-1 bg-border/30" />
            </div>

            <button
              className="w-full touch-manipulation active:scale-[0.96] transition-transform"
              onClick={() => { activeMatch!.dancer_right_id && submitVote(activeMatch!.dancer_right_id); if (navigator.vibrate) navigator.vibrate(50); }}
            >
              <div className="w-full rounded-2xl border-2 border-secondary/30 bg-gradient-to-br from-secondary/10 to-transparent p-8 sm:p-12 text-center hover:border-secondary hover-glow-blue transition-all" style={{ minHeight: '180px' }}>
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  {activeMatch!.dancer_right?.photo_url ? (
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden mx-auto">
                      <img src={activeMatch!.dancer_right.photo_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                  <div className="text-3xl sm:text-5xl font-display font-black text-secondary tracking-tight">
                    {activeMatch!.dancer_right?.name || "Waiting"}
                  </div>
                </div>
              </div>
            </button>

            {/* Tie button — subtle, bottom */}
            <button
              className="w-full touch-manipulation active:scale-95"
              onClick={() => submitVote(null as any as string)}
            >
              <div className="w-full rounded-xl border border-border/20 bg-muted/10 p-5 text-center hover:bg-muted/30 transition-colors">
                <span className="text-lg font-display font-bold text-muted-foreground/60">Tie / Draw</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="w-full max-w-lg">
            <SliderVoting
              matchId={activeMatch!.id}
              dancerLeft={{ name: activeMatch!.dancer_left?.name || "Waiting", city: activeMatch!.dancer_left?.city, photo_url: activeMatch!.dancer_left?.photo_url, video_url: activeMatch!.dancer_left?.video_url }}
              dancerRight={{ name: activeMatch!.dancer_right?.name || "Waiting", city: activeMatch!.dancer_right?.city, photo_url: activeMatch!.dancer_right?.photo_url, video_url: activeMatch!.dancer_right?.video_url }}
              currentRound={activeMatch!.current_round}
              onSubmit={submitSliderVote}
            />
          </div>
        )}
      </div>

      <FloatingMenu />
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Menu, History, LogOut, X, Home, Check, User } from "lucide-react";
import SliderVoting from "@/components/SliderVoting";

interface Dancer {
  id: string;
  name: string;
  city: string | null;
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

export default function JudgePanel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeMatch, setActiveMatch] = useState<ActiveMatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [voteHistory, setVoteHistory] = useState<VoteHistory[]>([]);
  const [hasVotedThisRound, setHasVotedThisRound] = useState(false);

  useEffect(() => {
    loadActiveMatch();
    
    const channel = supabase
      .channel('judge-panel-updates')
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

    return () => {
      supabase.removeChannel(channel);
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
          battles (
            name
          )
        `)
        .in("battle_id", battleIds)
        .not("current_match_id", "is", null)
        .limit(1)
        .maybeSingle();

      if (!screenStates || !screenStates.current_match_id) {
        setActiveMatch(null);
        setLoading(false);
        return;
      }

      const { data: matchData } = await supabase
        .from("matches")
        .select(`
          *,
          nominations (
            name,
            judging_mode
          )
        `)
        .eq("id", screenStates.current_match_id)
        .single();

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
      };

      setActiveMatch(match);

      const { data: existingVote } = await supabase
        .from("match_votes")
        .select("id")
        .eq("match_id", match.id)
        .eq("judge_id", user.id)
        .eq("round_number", match.current_round)
        .maybeSingle();

      setHasVotedThisRound(!!existingVote);
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

  const submitVote = async (votedFor: string) => {
    if (!activeMatch) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("match_votes")
        .insert({
          match_id: activeMatch.id,
          judge_id: user.id,
          vote_for: votedFor,
          round_number: activeMatch.current_round,
        });

      if (error) throw error;

      toast({
        title: "Vote Submitted",
        description: "Your vote has been recorded",
      });

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
          round_number: currentRound,
          slider_technique: technique,
          slider_musicality: musicality,
          slider_performance: performance,
        });

      if (error) throw error;

      toast({
        title: "Vote Submitted",
        description: "Your scores have been recorded",
      });

      setHasVotedThisRound(true);
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
                <Card key={vote.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{vote.dancer_name || "Draw"}</p>
                      <p className="text-sm text-muted-foreground">Round {vote.round_number}</p>
                    </div>
                    {vote.slider_technique !== null && (
                      <div className="text-right text-sm text-muted-foreground">
                        <p>T: {vote.slider_technique > 0 ? '+' : ''}{vote.slider_technique}</p>
                        <p>M: {vote.slider_musicality > 0 ? '+' : ''}{vote.slider_musicality}</p>
                        <p>P: {vote.slider_performance > 0 ? '+' : ''}{vote.slider_performance}</p>
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

  // No active match - waiting screen
  if (!activeMatch) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-sm">
            <div className="w-24 h-24 mx-auto rounded-3xl bg-muted flex items-center justify-center animate-pulse-soft">
              <Trophy className="w-12 h-12 text-muted-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold mb-2">Waiting for Battle</h1>
              <p className="text-muted-foreground">
                The operator will start the match soon. Stay ready!
              </p>
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
            {activeMatch.nomination_name} • Round {activeMatch.current_round}
          </p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-center space-y-6 max-w-sm animate-scale-in">
            <div className="w-24 h-24 mx-auto rounded-full bg-success/10 flex items-center justify-center">
              <Check className="w-12 h-12 text-success" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-bold mb-2">Vote Submitted</h2>
              <p className="text-muted-foreground">
                Waiting for the next round...
              </p>
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

  // Active match - voting screen
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="p-6 text-center border-b border-border/50">
        <h1 className="text-lg font-display font-bold">{activeMatch.battle_name}</h1>
        <p className="text-sm text-muted-foreground">
          {activeMatch.nomination_name} • Round {activeMatch.current_round}
        </p>
      </div>

      {/* Voting Area */}
      <div className="flex-1 flex items-center justify-center p-6">
        {activeMatch.judging_mode === "simple" ? (
          <div className="w-full max-w-4xl">
            {/* VS Header */}
            <div className="text-center mb-8">
              <span className="text-4xl font-display font-bold text-muted-foreground/50">VS</span>
            </div>

            {/* Dancer Cards */}
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              {/* Left Dancer - Red */}
              <button
                className="group"
                onClick={() => activeMatch.dancer_left_id && submitVote(activeMatch.dancer_left_id)}
              >
                <Card className="p-6 sm:p-8 text-center card-red hover:border-primary transition-all active:scale-95 hover:shadow-glow-red">
                  <div className="space-y-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <User className="w-10 h-10 sm:w-12 sm:h-12 text-primary" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-display font-bold text-primary truncate">
                        {activeMatch.dancer_left?.name || "Waiting"}
                      </div>
                      {activeMatch.dancer_left?.city && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {activeMatch.dancer_left.city}
                        </div>
                      )}
                    </div>
                    <div className="pt-2">
                      <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        Tap to Vote
                      </span>
                    </div>
                  </div>
                </Card>
              </button>

              {/* Right Dancer - Blue */}
              <button
                className="group"
                onClick={() => activeMatch.dancer_right_id && submitVote(activeMatch.dancer_right_id)}
              >
                <Card className="p-6 sm:p-8 text-center card-blue hover:border-secondary transition-all active:scale-95 hover:shadow-glow-blue">
                  <div className="space-y-4">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                      <User className="w-10 h-10 sm:w-12 sm:h-12 text-secondary" />
                    </div>
                    <div>
                      <div className="text-xl sm:text-2xl font-display font-bold text-secondary truncate">
                        {activeMatch.dancer_right?.name || "Waiting"}
                      </div>
                      {activeMatch.dancer_right?.city && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {activeMatch.dancer_right.city}
                        </div>
                      )}
                    </div>
                    <div className="pt-2">
                      <span className="inline-block px-4 py-2 rounded-full bg-secondary/10 text-secondary font-semibold text-sm">
                        Tap to Vote
                      </span>
                    </div>
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
                city: activeMatch.dancer_left?.city
              }}
              dancerRight={{
                name: activeMatch.dancer_right?.name || "Waiting",
                city: activeMatch.dancer_right?.city
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
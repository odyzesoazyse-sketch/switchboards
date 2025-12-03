import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Menu, History, LogOut, X, Home } from "lucide-react";
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

      // Check judge role
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

      // Load active match from screen_state
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

      // Load match info
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

      // Load dancers
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

      // Check if already voted this round
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
        title: "Vote accepted",
        description: "Your vote has been registered",
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
        title: "Vote accepted",
        description: "Your scores have been registered",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  // History view
  if (showHistory) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Vote History</h1>
            <Button variant="ghost" size="icon" onClick={() => setShowHistory(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="space-y-3">
            {voteHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No votes yet</p>
            ) : (
              voteHistory.map((vote) => (
                <Card key={vote.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {vote.dancer_name || "Draw"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Round {vote.round_number}
                      </p>
                    </div>
                    {vote.slider_technique !== null && (
                      <div className="text-right text-sm">
                        <p>T: {vote.slider_technique}</p>
                        <p>M: {vote.slider_musicality}</p>
                        <p>P: {vote.slider_performance}</p>
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

  // No active match
  if (!activeMatch) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Trophy className="w-12 h-12 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Waiting for Battle</h1>
          <p className="text-muted-foreground">
            The operator will start the match soon
          </p>
        </div>

        {/* Menu Button */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2">
          <Button
            size="lg"
            className="rounded-full w-16 h-16 shadow-lg"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>

          {menuOpen && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-card border rounded-2xl shadow-xl p-2 min-w-[200px]">
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={openHistory}
              >
                <History className="h-5 w-5" />
                Vote History
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => navigate("/dashboard")}
              >
                <Home className="h-5 w-5" />
                Dashboard
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive"
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/auth");
                }}
              >
                <LogOut className="h-5 w-5" />
                Logout
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
      <div className="p-4 text-center border-b">
        <h1 className="text-lg font-bold">{activeMatch.battle_name}</h1>
        <p className="text-sm text-muted-foreground">
          {activeMatch.nomination_name} • Round {activeMatch.current_round}
        </p>
      </div>

      {/* Voting Area */}
      <div className="flex-1 flex items-center justify-center p-4">
        {hasVotedThisRound ? (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-xl font-bold">Vote Submitted</h2>
            <p className="text-muted-foreground">Waiting for next round...</p>
          </div>
        ) : activeMatch.judging_mode === "simple" ? (
          <div className="w-full max-w-4xl grid grid-cols-3 gap-4 items-center">
            <Card 
              className="p-6 text-center border-2 border-opponent-left/30 hover:border-opponent-left cursor-pointer transition-all active:scale-95"
              onClick={() => activeMatch.dancer_left_id && submitVote(activeMatch.dancer_left_id)}
            >
              <div className="space-y-3">
                <div className="w-20 h-20 mx-auto rounded-full bg-opponent-left/20 flex items-center justify-center">
                  <span className="text-3xl font-bold text-opponent-left">L</span>
                </div>
                <div className="text-xl font-bold text-opponent-left">
                  {activeMatch.dancer_left?.name || "Waiting"}
                </div>
                {activeMatch.dancer_left?.city && (
                  <div className="text-sm text-muted-foreground">{activeMatch.dancer_left.city}</div>
                )}
              </div>
            </Card>

            <div className="text-center text-4xl font-bold text-muted-foreground">
              VS
            </div>

            <Card 
              className="p-6 text-center border-2 border-opponent-right/30 hover:border-opponent-right cursor-pointer transition-all active:scale-95"
              onClick={() => activeMatch.dancer_right_id && submitVote(activeMatch.dancer_right_id)}
            >
              <div className="space-y-3">
                <div className="w-20 h-20 mx-auto rounded-full bg-opponent-right/20 flex items-center justify-center">
                  <span className="text-3xl font-bold text-opponent-right">R</span>
                </div>
                <div className="text-xl font-bold text-opponent-right">
                  {activeMatch.dancer_right?.name || "Waiting"}
                </div>
                {activeMatch.dancer_right?.city && (
                  <div className="text-sm text-muted-foreground">{activeMatch.dancer_right.city}</div>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
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

      {/* Floating Menu Button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <Button
          size="lg"
          className="rounded-full w-16 h-16 shadow-lg"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>

        {menuOpen && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-card border rounded-2xl shadow-xl p-2 min-w-[200px]">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={openHistory}
            >
              <History className="h-5 w-5" />
              Vote History
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={() => navigate("/dashboard")}
            >
              <Home className="h-5 w-5" />
              Dashboard
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth");
              }}
            >
              <LogOut className="h-5 w-5" />
              Logout
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

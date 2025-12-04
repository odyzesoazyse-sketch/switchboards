import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TournamentBracket from "@/components/TournamentBracket";
import { Trophy, User } from "lucide-react";

interface ScreenState {
  id: string;
  battle_id: string;
  nomination_id: string | null;
  current_match_id: string | null;
  current_round: number;
  show_judges: boolean;
  show_timer: boolean;
  timer_seconds: number;
  show_winner: boolean;
  show_score: boolean;
  rounds_to_win: number;
  match_status: string;
  votes_left: number;
  votes_right: number;
  show_bracket: boolean;
}

interface Dancer {
  id: string;
  name: string;
  city: string | null;
  photo_url: string | null;
}

interface Match {
  id: string;
  dancer_left_id: string | null;
  dancer_right_id: string | null;
  winner_id: string | null;
}

interface BracketMatch {
  id: string;
  round: string;
  position: number;
  dancer_left_id: string | null;
  dancer_right_id: string | null;
  winner_id: string | null;
}

interface Judge {
  id: string;
  full_name: string;
}

export default function BattleScreen() {
  const { id } = useParams();
  const [screenState, setScreenState] = useState<ScreenState | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [leftDancer, setLeftDancer] = useState<Dancer | null>(null);
  const [rightDancer, setRightDancer] = useState<Dancer | null>(null);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [battleName, setBattleName] = useState("");
  const [loading, setLoading] = useState(true);
  const [allMatches, setAllMatches] = useState<BracketMatch[]>([]);
  const [allDancers, setAllDancers] = useState<Dancer[]>([]);

  useEffect(() => {
    if (!id) return;
    loadScreenState();

    const channel = supabase
      .channel('screen-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screen_state',
          filter: `battle_id=eq.${id}`
        },
        () => loadScreenState()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
    if (screenState?.show_timer && screenState.timer_seconds > 0) {
      setTimeLeft(screenState.timer_seconds);
    }
  }, [screenState?.timer_seconds, screenState?.show_timer]);

  useEffect(() => {
    if (timeLeft > 0 && screenState?.show_timer) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, screenState?.show_timer]);

  const loadScreenState = async () => {
    try {
      setLoading(true);
      
      const { data: battleData } = await supabase
        .from("battles")
        .select("name")
        .eq("id", id)
        .single();
      
      if (battleData) setBattleName(battleData.name);
      
      const { data: existingState, error: stateError } = await supabase
        .from("screen_state")
        .select("*")
        .eq("battle_id", id)
        .maybeSingle();

      if (stateError) throw stateError;

      let stateData = existingState;

      if (!existingState) {
        const { data: newState, error: createError } = await supabase
          .from("screen_state")
          .insert({
            battle_id: id,
            show_judges: true,
            show_timer: false,
            timer_seconds: 120,
            show_winner: false,
            show_score: true,
            rounds_to_win: 2,
            current_round: 1,
            votes_left: 0,
            votes_right: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        stateData = newState;
      }

      setScreenState(stateData);

      if (stateData.current_match_id) {
        const { data: matchData } = await supabase
          .from("matches")
          .select("*")
          .eq("id", stateData.current_match_id)
          .single();

        if (matchData) {
          setCurrentMatch(matchData);

          if (matchData.dancer_left_id) {
            const { data: leftData } = await supabase
              .from("dancers")
              .select("*")
              .eq("id", matchData.dancer_left_id)
              .single();
            setLeftDancer(leftData);
          }

          if (matchData.dancer_right_id) {
            const { data: rightData } = await supabase
              .from("dancers")
              .select("*")
              .eq("id", matchData.dancer_right_id)
              .single();
            setRightDancer(rightData);
          }
        }
      }

      if (stateData.nomination_id) {
        const { data: allMatchesData } = await supabase
          .from("matches")
          .select("*")
          .eq("nomination_id", stateData.nomination_id)
          .order("position", { ascending: true });

        const { data: allDancersData } = await supabase
          .from("dancers")
          .select("*")
          .eq("nomination_id", stateData.nomination_id);

        setAllMatches(allMatchesData || []);
        setAllDancers(allDancersData || []);
      }

      if (stateData.show_judges) {
        const { data: judgesData } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("battle_id", id)
          .eq("role", "judge");

        if (judgesData) {
          const judgeProfiles = await Promise.all(
            judgesData.map(async (j) => {
              const { data } = await supabase
                .from("profiles")
                .select("id, full_name")
                .eq("id", j.user_id)
                .single();
              return data;
            })
          );
          setJudges(judgeProfiles.filter(Boolean) as Judge[]);
        }
      }
    } catch (error) {
      console.error("Error loading screen state:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-background/30 border-t-background rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl text-background/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!screenState) {
    return (
      <div className="min-h-screen bg-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-background/30 border-t-background rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl text-background/60">Initializing...</p>
        </div>
      </div>
    );
  }

  // Bracket view
  if (screenState.show_bracket) {
    return (
      <div className="min-h-screen bg-foreground p-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-5xl font-display font-bold text-background mb-2">
              {battleName}
            </h1>
            <p className="text-xl text-background/60">Tournament Bracket</p>
          </div>
          <Card className="p-8 bg-background/5 border-background/10 backdrop-blur">
            <TournamentBracket matches={allMatches} dancers={allDancers} />
          </Card>
        </div>
      </div>
    );
  }

  // Waiting for match
  if (!currentMatch && !screenState.show_winner) {
    return (
      <div className="min-h-screen bg-foreground flex items-center justify-center p-8">
        <div className="text-center space-y-8 max-w-2xl">
          <h1 className="text-6xl font-display font-bold text-background">{battleName}</h1>
          <div className="glass-dark rounded-3xl p-12">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-background/10 flex items-center justify-center mb-6">
              <Trophy className="w-10 h-10 text-background/60" />
            </div>
            <p className="text-3xl text-background/80 font-display">Waiting for next battle...</p>
            <p className="text-lg text-background/50 mt-2">The operator will select the match soon</p>
          </div>
        </div>
      </div>
    );
  }

  // Winner screen
  if (screenState.show_winner && currentMatch?.winner_id) {
    const winner = currentMatch.winner_id === leftDancer?.id ? leftDancer : rightDancer;
    const isRed = currentMatch.winner_id === leftDancer?.id;
    
    return (
      <div className={`min-h-screen flex items-center justify-center p-8 ${isRed ? 'bg-primary' : 'bg-secondary'}`}>
        <div className="text-center space-y-8 animate-scale-in">
          <div className="flex items-center justify-center gap-4 text-background">
            <Trophy className="w-16 h-16" />
            <h1 className="text-7xl font-display font-bold">WINNER</h1>
            <Trophy className="w-16 h-16" />
          </div>
          
          <div className="glass-dark rounded-3xl p-12 min-w-[400px]">
            <div className="w-32 h-32 mx-auto rounded-2xl bg-background/10 flex items-center justify-center mb-6">
              {winner?.photo_url ? (
                <img src={winner.photo_url} alt={winner.name} className="w-full h-full object-cover rounded-2xl" />
              ) : (
                <User className="w-16 h-16 text-background" />
              )}
            </div>
            <h2 className="text-5xl font-display font-bold text-background mb-2">{winner?.name}</h2>
            {winner?.city && (
              <p className="text-2xl text-background/70">{winner.city}</p>
            )}
          </div>
          
          {screenState.show_score && (
            <div className="text-5xl font-display font-bold text-background/90">
              {screenState.votes_left} — {screenState.votes_right}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active match view
  return (
    <div className="min-h-screen bg-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Timer */}
        {screenState.show_timer && (
          <div className="text-center">
            <div className="inline-block glass-dark rounded-2xl px-12 py-6">
              <div className="text-7xl font-display font-bold text-background tabular-nums">
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        )}

        {/* Main battle display */}
        <div className="grid grid-cols-3 gap-8 items-center">
          {/* Left dancer - Red */}
          <Card className="p-8 bg-primary/10 border-2 border-primary/30 backdrop-blur">
            <div className="text-center space-y-6">
              <div className="w-48 h-48 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
                {leftDancer?.photo_url ? (
                  <img src={leftDancer.photo_url} alt={leftDancer.name} className="w-full h-full object-cover rounded-3xl" />
                ) : (
                  <User className="w-24 h-24 text-primary" />
                )}
              </div>
              <div>
                <h2 className="text-4xl font-display font-bold text-primary">{leftDancer?.name || "Waiting"}</h2>
                {leftDancer?.city && (
                  <p className="text-xl text-muted-foreground mt-2">{leftDancer.city}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Center - VS and score */}
          <div className="text-center space-y-8">
            <div className="text-8xl font-display font-bold text-background/20">VS</div>
            
            {screenState.show_score && (
              <div className="flex items-center justify-center gap-8">
                <div className="text-7xl font-display font-bold text-primary glow-red">{screenState.votes_left}</div>
                <div className="text-4xl text-background/30">—</div>
                <div className="text-7xl font-display font-bold text-secondary glow-blue">{screenState.votes_right}</div>
              </div>
            )}
            
            <Badge className="text-2xl px-6 py-3 bg-background/10 text-background border-background/20">
              Round {screenState.current_round}
            </Badge>
            
            <div className="text-lg text-background/50">
              First to {screenState.rounds_to_win} rounds wins
            </div>
          </div>

          {/* Right dancer - Blue */}
          <Card className="p-8 bg-secondary/10 border-2 border-secondary/30 backdrop-blur">
            <div className="text-center space-y-6">
              <div className="w-48 h-48 mx-auto rounded-3xl bg-secondary/10 flex items-center justify-center border-2 border-secondary/20">
                {rightDancer?.photo_url ? (
                  <img src={rightDancer.photo_url} alt={rightDancer.name} className="w-full h-full object-cover rounded-3xl" />
                ) : (
                  <User className="w-24 h-24 text-secondary" />
                )}
              </div>
              <div>
                <h2 className="text-4xl font-display font-bold text-secondary">{rightDancer?.name || "Waiting"}</h2>
                {rightDancer?.city && (
                  <p className="text-xl text-muted-foreground mt-2">{rightDancer.city}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Judges */}
        {screenState.show_judges && judges.length > 0 && (
          <Card className="p-6 bg-background/5 border-background/10 backdrop-blur">
            <h3 className="text-xl font-display font-bold mb-4 text-center text-background/60">Judges</h3>
            <div className="flex justify-center gap-4 flex-wrap">
              {judges.map((judge) => (
                <Badge key={judge.id} className="text-lg px-4 py-2 bg-background/10 text-background border-background/20">
                  {judge.full_name || "Judge"}
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
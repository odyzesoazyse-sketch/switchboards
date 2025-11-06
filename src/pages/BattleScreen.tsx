import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TournamentBracket from "@/components/TournamentBracket";

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
        (payload) => {
          console.log('Screen state updated:', payload);
          loadScreenState();
        }
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
      
      // Загружаем название баттла
      const { data: battleData } = await supabase
        .from("battles")
        .select("name")
        .eq("id", id)
        .single();
      
      if (battleData) {
        setBattleName(battleData.name);
      }
      
      let stateData = null;
      
      const { data: existingState, error: stateError } = await supabase
        .from("screen_state")
        .select("*")
        .eq("battle_id", id)
        .maybeSingle();

      if (stateError) throw stateError;

      if (!existingState) {
        // Создаём screen_state автоматически, если его нет
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
      } else {
        stateData = existingState;
      }

      setScreenState(stateData);

      if (stateData.current_match_id) {
        const { data: matchData, error: matchError } = await supabase
          .from("matches")
          .select("*")
          .eq("id", stateData.current_match_id)
          .single();

        if (matchError) throw matchError;
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

      // Загружаем все матчи и танцоров для турнирной сетки
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-xl text-muted-foreground">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!screenState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-xl text-muted-foreground">Инициализация экрана...</p>
        </div>
      </div>
    );
  }

  if (screenState.show_bracket) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 p-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
              {battleName}
            </h1>
            <p className="text-2xl text-muted-foreground">Турнирная сетка</p>
          </div>
          <Card className="p-8 bg-card/50 backdrop-blur-sm">
            <TournamentBracket matches={allMatches} dancers={allDancers} />
          </Card>
        </div>
      </div>
    );
  }

  if (!currentMatch && !screenState.show_winner) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center p-8">
        <div className="text-center space-y-8">
          <h1 className="text-6xl font-bold text-white drop-shadow-2xl">{battleName}</h1>
          <div className="bg-white/20 backdrop-blur-md rounded-3xl p-12 border-4 border-white/50">
            <p className="text-4xl text-white">Ожидание выбора матча...</p>
            <p className="text-xl text-white/80 mt-4">Оператор скоро выберет следующий баттл</p>
          </div>
        </div>
      </div>
    );
  }

  if (screenState.show_winner && currentMatch?.winner_id) {
    const winner = currentMatch.winner_id === leftDancer?.id ? leftDancer : rightDancer;
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center p-8">
        <div className="text-center space-y-8 animate-scale-in">
          <h1 className="text-8xl font-bold text-white drop-shadow-2xl">🏆 ПОБЕДИТЕЛЬ 🏆</h1>
          <div className="bg-white/20 backdrop-blur-md rounded-3xl p-12 border-4 border-white/50">
            <h2 className="text-6xl font-bold text-white mb-4">{winner?.name}</h2>
            {winner?.city && (
              <p className="text-3xl text-white/90">{winner.city}</p>
            )}
          </div>
          {screenState.show_score && (
            <div className="text-5xl font-bold text-white">
              Счёт: {screenState.votes_left} - {screenState.votes_right}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {screenState.show_timer && (
          <div className="text-center">
            <div className="inline-block bg-gradient-to-r from-primary to-accent p-8 rounded-3xl shadow-2xl">
              <div className="text-7xl font-bold text-white tabular-nums">
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-8 items-center">
          <Card className="p-8 bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/30 backdrop-blur-sm">
            {leftDancer ? (
              <div className="text-center space-y-4">
                {leftDancer.photo_url && (
                  <img
                    src={leftDancer.photo_url}
                    alt={leftDancer.name}
                    className="w-48 h-48 mx-auto rounded-full object-cover border-4 border-primary shadow-xl"
                  />
                )}
                <h2 className="text-4xl font-bold">{leftDancer.name}</h2>
                {leftDancer.city && (
                  <p className="text-xl text-muted-foreground">{leftDancer.city}</p>
                )}
              </div>
            ) : (
              <div className="text-center text-2xl text-muted-foreground">Ожидание...</div>
            )}
          </Card>

          <div className="text-center space-y-6">
            <div className="text-8xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              VS
            </div>
            {screenState.show_score && (
              <div className="flex items-center justify-center gap-8">
                <div className="text-6xl font-bold text-primary">{screenState.votes_left}</div>
                <div className="text-4xl text-muted-foreground">-</div>
                <div className="text-6xl font-bold text-accent">{screenState.votes_right}</div>
              </div>
            )}
            <Badge variant="secondary" className="text-2xl px-6 py-3">
              Раунд {screenState.current_round}
            </Badge>
            <div className="text-xl text-muted-foreground">
              До {screenState.rounds_to_win} побед
            </div>
          </div>

          <Card className="p-8 bg-gradient-to-br from-accent/20 to-accent/5 border-2 border-accent/30 backdrop-blur-sm">
            {rightDancer ? (
              <div className="text-center space-y-4">
                {rightDancer.photo_url && (
                  <img
                    src={rightDancer.photo_url}
                    alt={rightDancer.name}
                    className="w-48 h-48 mx-auto rounded-full object-cover border-4 border-accent shadow-xl"
                  />
                )}
                <h2 className="text-4xl font-bold">{rightDancer.name}</h2>
                {rightDancer.city && (
                  <p className="text-xl text-muted-foreground">{rightDancer.city}</p>
                )}
              </div>
            ) : (
              <div className="text-center text-2xl text-muted-foreground">Ожидание...</div>
            )}
          </Card>
        </div>

        {screenState.show_judges && judges.length > 0 && (
          <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
            <h3 className="text-2xl font-bold mb-4 text-center">Судьи</h3>
            <div className="flex justify-center gap-6 flex-wrap">
              {judges.map((judge) => (
                <Badge key={judge.id} variant="secondary" className="text-lg px-4 py-2">
                  {judge.full_name || "Судья"}
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

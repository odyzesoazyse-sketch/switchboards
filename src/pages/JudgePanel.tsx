import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trophy, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import SliderVoting from "@/components/SliderVoting";

interface Battle {
  id: string;
  name: string;
  date: string;
  location: string;
}

interface JudgeApplication {
  id: string;
  battle_id: string;
  status: string;
  created_at: string;
  battles: Battle;
}

interface Match {
  id: string;
  dancer_left_id: string | null;
  dancer_right_id: string | null;
  round: string;
  position: number;
}

interface Dancer {
  id: string;
  name: string;
  city: string | null;
}

interface ActiveMatch extends Match {
  dancer_left?: Dancer;
  dancer_right?: Dancer;
  nomination_name?: string;
  current_round: number;
  battle_name: string;
  judging_mode?: string;
}

export default function JudgePanel() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<JudgeApplication[]>([]);
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([]);
  const [availableBattles, setAvailableBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    
    // Подписка на изменения screen_state для отслеживания активных матчей
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
          loadActiveMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Загружаем заявки судьи
      const { data: appsData } = await supabase
        .from("judge_applications")
        .select(`
          *,
          battles (
            id,
            name,
            date,
            location
          )
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setApplications(appsData || []);
      
      await loadActiveMatches();
      await loadAvailableBattles(user.id);
      setLoading(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const loadAvailableBattles = async (userId: string) => {
    try {
      // Получаем все батлы, которые еще не завершены
      const { data: battlesData } = await supabase
        .from("battles")
        .select("*")
        .neq("phase", "completed")
        .order("date", { ascending: true });

      if (!battlesData) {
        setAvailableBattles([]);
        return;
      }

      // Фильтруем батлы, на которые пользователь еще не подавал заявку
      const appliedBattleIds = applications.map(app => app.battle_id);
      const available = battlesData.filter(battle => !appliedBattleIds.includes(battle.id));
      
      setAvailableBattles(available);
    } catch (error: any) {
      console.error("Error loading available battles:", error);
    }
  };

  const loadActiveMatches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Проверяем роль судьи
      const { data: roles } = await supabase
        .from("user_roles")
        .select("battle_id")
        .eq("user_id", user.id)
        .eq("role", "judge");

      if (!roles || roles.length === 0) return;

      const battleIds = roles.map(r => r.battle_id);

      // Загружаем активные матчи для батлов, где пользователь - судья
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
        .not("current_match_id", "is", null);

      if (!screenStates || screenStates.length === 0) {
        setActiveMatches([]);
        return;
      }

      // Загружаем информацию о матчах
      const matchIds = screenStates.map(s => s.current_match_id).filter(Boolean);
      const { data: matchesData } = await supabase
        .from("matches")
        .select(`
          *,
          nominations (
            name,
            judging_mode
          )
        `)
        .in("id", matchIds);

      if (!matchesData) {
        setActiveMatches([]);
        return;
      }

      // Загружаем танцоров
      const dancerIds = matchesData.flatMap(m => [m.dancer_left_id, m.dancer_right_id]).filter(Boolean);
      const { data: dancers } = await supabase
        .from("dancers")
        .select("*")
        .in("id", dancerIds);

      const dancersMap = new Map(dancers?.map(d => [d.id, d]) || []);

      const matches: ActiveMatch[] = matchesData.map(match => {
        const screenState = screenStates.find(s => s.current_match_id === match.id);
        return {
          ...match,
          dancer_left: match.dancer_left_id ? dancersMap.get(match.dancer_left_id) : undefined,
          dancer_right: match.dancer_right_id ? dancersMap.get(match.dancer_right_id) : undefined,
          nomination_name: match.nominations?.name,
          current_round: screenState?.current_round || 1,
          battle_name: screenState?.battles?.name || "",
          judging_mode: match.nominations?.judging_mode || "simple",
        };
      });

      setActiveMatches(matches);
    } catch (error: any) {
      console.error("Error loading active matches:", error);
    }
  };

  const applyToBattle = async (battleId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("judge_applications")
        .insert({
          battle_id: battleId,
          user_id: user.id,
        });

      if (error) throw error;

      toast({
        title: "Application submitted",
        description: "Awaiting organizer approval",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const cancelApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase
        .from("judge_applications")
        .delete()
        .eq("id", applicationId);

      if (error) throw error;

      toast({
        title: "Application canceled",
        description: "Your application has been successfully canceled",
      });

      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const submitVote = async (matchId: string, votedFor: string, currentRound: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Проверяем, не голосовал ли уже судья в этом раунде
      const { data: existingVote } = await supabase
        .from("match_votes")
        .select("id")
        .eq("match_id", matchId)
        .eq("judge_id", user.id)
        .eq("round_number", currentRound)
        .maybeSingle();

      if (existingVote) {
        toast({
          title: "Already voted",
          description: "You have already voted in this round",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from("match_votes")
        .insert({
          match_id: matchId,
          judge_id: user.id,
          vote_for: votedFor,
          round_number: currentRound,
        });

      if (error) throw error;

      toast({
        title: "Vote accepted",
        description: "Your vote has been successfully registered",
      });

      await loadActiveMatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const submitSliderVote = async (matchId: string, technique: number, musicality: number, performance: number, currentRound: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Проверяем, не голосовал ли уже судья в этом раунде
      const { data: existingVote } = await supabase
        .from("match_votes")
        .select("id")
        .eq("match_id", matchId)
        .eq("judge_id", user.id)
        .eq("round_number", currentRound)
        .maybeSingle();

      if (existingVote) {
        toast({
          title: "Already voted",
          description: "You have already voted in this round",
          variant: "destructive",
        });
        return;
      }

      // Определяем победителя на основе суммы
      const total = technique + musicality + performance;
      let votedFor = null;
      
      // Если total > 0, победил правый (синий), если < 0 - левый (красный)
      const match = activeMatches.find(m => m.id === matchId);
      if (match) {
        votedFor = total > 0 ? match.dancer_right_id : match.dancer_left_id;
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
        description: "Your slider scores have been registered",
      });

      await loadActiveMatches();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Judge Panel
        </h1>

        {/* Активные матчи для голосования */}
        {activeMatches.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Active Matches</h2>
            {activeMatches.map((match) => (
              <Card key={match.id} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-bold">{match.battle_name}</h3>
                      <p className="text-muted-foreground">{match.nomination_name} - Round {match.current_round}</p>
                    </div>
                  </div>

                  {match.judging_mode === "simple" ? (
                    <div className="grid md:grid-cols-3 gap-4 items-center">
                      <Card className="p-6 text-center border-opponent-left/50 hover:border-opponent-left transition-colors">
                        <div className="space-y-3">
                          <div className="text-2xl font-bold text-opponent-left">
                            {match.dancer_left?.name || "Waiting"}
                          </div>
                          {match.dancer_left?.city && (
                            <div className="text-sm text-muted-foreground">{match.dancer_left.city}</div>
                          )}
                          <Button
                            onClick={() => match.dancer_left_id && submitVote(match.id, match.dancer_left_id, match.current_round)}
                            className="w-full bg-opponent-left hover:bg-opponent-left/90"
                            disabled={!match.dancer_left_id}
                          >
                            <Trophy className="mr-2 h-4 w-4" />
                            Vote
                          </Button>
                        </div>
                      </Card>

                      <div className="text-center text-3xl font-bold text-muted-foreground">
                        VS
                      </div>

                      <Card className="p-6 text-center border-opponent-right/50 hover:border-opponent-right transition-colors">
                        <div className="space-y-3">
                          <div className="text-2xl font-bold text-opponent-right">
                            {match.dancer_right?.name || "Waiting"}
                          </div>
                          {match.dancer_right?.city && (
                            <div className="text-sm text-muted-foreground">{match.dancer_right.city}</div>
                          )}
                          <Button
                            onClick={() => match.dancer_right_id && submitVote(match.id, match.dancer_right_id, match.current_round)}
                            className="w-full bg-opponent-right hover:bg-opponent-right/90"
                            disabled={!match.dancer_right_id}
                          >
                            <Trophy className="mr-2 h-4 w-4" />
                            Vote
                          </Button>
                        </div>
                      </Card>
                    </div>
                  ) : (
                    <SliderVoting
                      matchId={match.id}
                      dancerLeft={{
                        name: match.dancer_left?.name || "Waiting",
                        city: match.dancer_left?.city
                      }}
                      dancerRight={{
                        name: match.dancer_right?.name || "Waiting",
                        city: match.dancer_right?.city
                      }}
                      currentRound={match.current_round}
                      onSubmit={submitSliderVote}
                    />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Доступные батлы */}
        {availableBattles.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Available Battles</h2>
            <div className="grid gap-4">
              {availableBattles.map((battle) => (
                <Card key={battle.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{battle.name}</h3>
                      <p className="text-muted-foreground">
                        {new Date(battle.date).toLocaleDateString("ru-RU")} • {battle.location}
                      </p>
                    </div>
                    <Button onClick={() => applyToBattle(battle.id)}>
                      Submit Application
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Мои заявки */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">My Judge Applications</h2>
          {applications.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No judge applications yet
            </Card>
          ) : (
            <div className="grid gap-4">
              {applications.map((app) => (
                <Card key={app.id} className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold">{app.battles.name}</h3>
                      <p className="text-muted-foreground">
                        {new Date(app.battles.date).toLocaleDateString("ru-RU")} • {app.battles.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(app.status)}
                      {app.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => cancelApplication(app.id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

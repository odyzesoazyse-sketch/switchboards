import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Trophy, FileText, CheckCircle, XCircle, Trash2, UserMinus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Battle {
  id: string;
  name: string;
  date: string;
  location: string;
  phase: string;
  organizer_id: string;
}

interface Nomination {
  id: string;
  name: string;
  description: string;
  phase: string;
  top_count: number;
  max_dancers: number;
}

interface Dancer {
  id: string;
  name: string;
  photo_url: string | null;
  age: number | null;
  city: string | null;
  position: number | null;
  average_score: number;
  is_qualified: boolean;
}

interface Match {
  id: string;
  round: string;
  position: number;
  dancer_left_id: string | null;
  dancer_right_id: string | null;
  winner_id: string | null;
  votes_left: number;
  votes_right: number;
  is_completed: boolean;
}

interface ApprovedJudge {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export default function BattleView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [selectedNomination, setSelectedNomination] = useState<string | null>(null);
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [judgeApplications, setJudgeApplications] = useState<any[]>([]);
  const [approvedJudges, setApprovedJudges] = useState<ApprovedJudge[]>([]);

  useEffect(() => {
    if (id) {
      loadBattleData();
    }
  }, [id]);

  useEffect(() => {
    if (selectedNomination) {
      loadNominationData();
    }
  }, [selectedNomination]);

  useEffect(() => {
    if (!id || !isOrganizer) return;

    // Подписка на изменения заявок судей
    const channel = supabase
      .channel('judge-applications-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'judge_applications',
          filter: `battle_id=eq.${id}`
        },
        () => {
          loadBattleData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, isOrganizer]);

  const loadBattleData = async () => {
    try {
      // Сначала проверяем пользователя
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || null;
      setCurrentUserId(userId);

      const { data: battleData, error: battleError } = await supabase
        .from("battles")
        .select("*")
        .eq("id", id)
        .single();

      if (battleError) throw battleError;
      setBattle(battleData);
      setIsOrganizer(battleData.organizer_id === userId);
      console.log("Is Organizer:", battleData.organizer_id === userId, "User ID:", userId, "Organizer ID:", battleData.organizer_id);

      const { data: nominationsData, error: nominationsError } = await supabase
        .from("nominations")
        .select("*")
        .eq("battle_id", id);

      if (nominationsError) throw nominationsError;
      setNominations(nominationsData || []);
      
      if (nominationsData && nominationsData.length > 0) {
        setSelectedNomination(nominationsData[0].id);
      }

      // Загружаем заявки судей, если пользователь организатор
      if (userId && battleData?.organizer_id === userId) {
        const { data: appsData } = await supabase
          .from("judge_applications")
          .select("*")
          .eq("battle_id", id)
          .order("created_at", { ascending: false });

        if (appsData) {
          // Загружаем профили отдельным запросом
          const userIds = appsData.map(app => app.user_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", userIds);

          const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
          
          const appsWithProfiles = appsData.map(app => ({
            ...app,
            profiles: profilesMap.get(app.user_id) || null
          }));

          setJudgeApplications(appsWithProfiles);
        }

        // Load approved judges
        const { data: judgeRoles } = await supabase
          .from("user_roles")
          .select("id, user_id")
          .eq("battle_id", id)
          .eq("role", "judge");

        if (judgeRoles && judgeRoles.length > 0) {
          const judgeUserIds = judgeRoles.map(r => r.user_id);
          const { data: judgeProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", judgeUserIds);

          const profilesMap = new Map(judgeProfiles?.map(p => [p.id, p]) || []);
          const judges: ApprovedJudge[] = judgeRoles.map(r => ({
            id: r.id,
            user_id: r.user_id,
            full_name: profilesMap.get(r.user_id)?.full_name || null,
            email: profilesMap.get(r.user_id)?.email || null,
          }));
          setApprovedJudges(judges);
        } else {
          setApprovedJudges([]);
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBattle = async () => {
    if (!id || !isOrganizer) return;
    try {
      const { error } = await supabase.from("battles").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Battle deleted" });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const removeJudge = async (roleId: string) => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
      setApprovedJudges(approvedJudges.filter(j => j.id !== roleId));
      toast({ title: "Judge removed" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const loadNominationData = async () => {
    try {
      const { data: dancersData, error: dancersError } = await supabase
        .from("dancers")
        .select("*")
        .eq("nomination_id", selectedNomination)
        .order("position", { ascending: true });

      if (dancersError) throw dancersError;
      setDancers(dancersData || []);

      const { data: matchesData, error: matchesError } = await supabase
        .from("matches")
        .select("*")
        .eq("nomination_id", selectedNomination)
        .order("position", { ascending: true });

      if (matchesError) throw matchesError;
      setMatches(matchesData || []);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getDancerById = (id: string | null) => {
    if (!id) return null;
    return dancers.find(d => d.id === id);
  };

  const getPhaseLabel = (phase: string) => {
    const labels: Record<string, string> = {
      registration: "Registration",
      selection: "Selection",
      bracket: "Bracket",
      completed: "Completed",
    };
    return labels[phase] || phase;
  };

  const getRoundMatches = (round: string) => {
    return matches.filter(m => m.round === round);
  };

  const changeNominationPhase = async (newPhase: "registration" | "selection" | "bracket" | "completed") => {
    if (!selectedNomination || !isOrganizer) return;

    try {
      const { error } = await supabase
        .from("nominations")
        .update({ phase: newPhase })
        .eq("id", selectedNomination);

      if (error) throw error;

      if (newPhase === "bracket") {
        await createBracket();
      }

      toast({
        title: "Success",
        description: `Phase changed to "${getPhaseLabel(newPhase)}"`,
      });

      await loadBattleData();
      await loadNominationData();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const addTestDancers = async () => {
    if (!selectedNomination || !isOrganizer) return;

    const testNames = [
      "Max", "Alex", "Dima", "Sasha", "Nikita", "Vlad", "Artem", "Denis",
      "Egor", "Ivan", "Andrey", "Sergey", "Misha", "Pasha", "Eugene", "Roman"
    ];

    try {
      const dancersToAdd = testNames.map((name, index) => ({
        nomination_id: selectedNomination,
        name,
        city: "Moscow",
        age: 18 + Math.floor(Math.random() * 15),
        position: index + 1,
        average_score: 0,
        is_qualified: false,
      }));

      const { error } = await supabase.from("dancers").insert(dancersToAdd);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Added ${testNames.length} dancers`,
      });

      await loadNominationData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleJudgeApplication = async (applicationId: string, userId: string, status: "approved" | "rejected") => {
    try {
      // Обновляем статус заявки
      const { error: updateError } = await supabase
        .from("judge_applications")
        .update({ status })
        .eq("id", applicationId);

      if (updateError) throw updateError;

      // Если одобрено, добавляем роль судьи
      if (status === "approved") {
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: userId,
            battle_id: id,
            role: "judge",
          });

        if (roleError && !roleError.message.includes("duplicate")) {
          throw roleError;
        }
      }

      toast({
        title: status === "approved" ? "Application approved" : "Application rejected",
        description: status === "approved" 
          ? "Judge added to battle" 
          : "Application was rejected",
      });

      await loadBattleData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createBracket = async () => {
    if (!selectedNomination) return;

    try {
      const topDancers = dancers
        .sort((a, b) => (b.average_score || 0) - (a.average_score || 0))
        .slice(0, currentNomination?.top_count || 16);

      if (topDancers.length < 2) {
        throw new Error("Not enough dancers to create bracket");
      }

      // Отметить квалифицированных
      for (const dancer of topDancers) {
        await supabase
          .from("dancers")
          .update({ is_qualified: true })
          .eq("id", dancer.id);
      }

      // Создать первый раунд
      const shuffled = [...topDancers].sort(() => Math.random() - 0.5);
      const matchesToCreate = [];

      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          matchesToCreate.push({
            nomination_id: selectedNomination,
            round: shuffled.length === 2 ? "final" : 
                   shuffled.length === 4 ? "semifinal" :
                   shuffled.length === 8 ? "quarterfinal" : "round_of_16",
            position: i / 2,
            dancer_left_id: shuffled[i].id,
            dancer_right_id: shuffled[i + 1].id,
            votes_left: 0,
            votes_right: 0,
            is_completed: false,
          });
        }
      }

      const { error } = await supabase.from("matches").insert(matchesToCreate);
      if (error) throw error;

      toast({
        title: "Bracket created",
        description: `Created ${matchesToCreate.length} matches`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Battle not found</p>
      </div>
    );
  }

  const currentNomination = nominations.find(n => n.id === selectedNomination);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Battles
          </Button>
          
          {isOrganizer && (
            <div className="flex gap-2">
              <Button onClick={() => navigate(`/battle/${id}/operator`)} variant="default">
                Operator Panel
              </Button>
              <Button onClick={() => navigate(`/battle/${id}/logs`)} variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Logs
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Battle?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{battle.name}" and all related data.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteBattle} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Judge Applications & Approved Judges */}
        {isOrganizer && (
          <div className="grid gap-6 md:grid-cols-2 mb-6">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Judge Applications</h2>
              {judgeApplications.filter(a => a.status === "pending").length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No pending applications</div>
              ) : (
                <div className="space-y-3">
                  {judgeApplications.filter(a => a.status === "pending").map((app) => (
                    <Card key={app.id} className="p-3 bg-card/50">
                      <div className="flex items-center justify-between">
                        <div className="font-semibold">{app.profiles?.full_name || app.profiles?.email}</div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleJudgeApplication(app.id, app.user_id, "approved")}>
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleJudgeApplication(app.id, app.user_id, "rejected")}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Approved Judges ({approvedJudges.length})</h2>
              {approvedJudges.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">No judges yet</div>
              ) : (
                <div className="space-y-2">
                  {approvedJudges.map((judge) => (
                    <div key={judge.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                      <span className="font-medium">{judge.full_name || judge.email}</span>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => removeJudge(judge.id)}>
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {battle.name}
          </h1>
          <div className="flex gap-4 text-muted-foreground">
            <span>{new Date(battle.date).toLocaleDateString("en-US")}</span>
            {battle.location && <span>📍 {battle.location}</span>}
            <Badge variant="secondary">{getPhaseLabel(battle.phase)}</Badge>
          </div>
        </div>

        {nominations.length > 0 && (
          <div className="mb-6">
            <div className="flex gap-2 flex-wrap">
              {nominations.map((nom) => (
                <Button
                  key={nom.id}
                  variant={selectedNomination === nom.id ? "default" : "outline"}
                  onClick={() => setSelectedNomination(nom.id)}
                  className="transition-all"
                >
                  {nom.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {currentNomination && (
          <div className="space-y-6">
            <Card className="p-6 bg-card/50 backdrop-blur-sm border-border/50">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">{currentNomination.name}</h2>
                <Badge variant="secondary">{getPhaseLabel(currentNomination.phase)}</Badge>
              </div>
              {currentNomination.description && (
                <p className="text-muted-foreground mb-4">{currentNomination.description}</p>
              )}
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Participants: {dancers.length} / {currentNomination.max_dancers}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-accent" />
                  <span>Bracket: top-{currentNomination.top_count}</span>
                </div>
              </div>

              {isOrganizer && (
                <div className="mt-6 pt-6 border-t border-border/50 space-y-3">
                  <div className="flex gap-2 flex-wrap">
                    {currentNomination.phase === "registration" && (
                      <>
                        <Button onClick={addTestDancers} variant="outline">Add Test Dancers</Button>
                        <Button onClick={() => changeNominationPhase("selection")}>Start Selection</Button>
                      </>
                    )}
                    {currentNomination.phase === "selection" && (
                      <Button onClick={() => changeNominationPhase("bracket")}>Go to Bracket</Button>
                    )}
                    {currentNomination.phase === "bracket" && (
                      <Button onClick={() => changeNominationPhase("completed")} variant="outline">Complete</Button>
                    )}
                  </div>
                </div>
              )}
            </Card>

            {currentNomination.phase === "bracket" && matches.length > 0 && (
              <div className="space-y-8">
                <h3 className="text-2xl font-bold">Battle Bracket</h3>
                
                {["final", "semifinal", "quarterfinal", "round_of_16"].map((round) => {
                  const roundMatches = getRoundMatches(round);
                  if (roundMatches.length === 0) return null;

                  const roundLabels: Record<string, string> = {
                    round_of_16: "Round of 16",
                    quarterfinal: "Quarterfinals",
                    semifinal: "Semifinals",
                    final: "Final",
                  };

                  return (
                    <div key={round} className="space-y-4">
                      <h4 className="text-xl font-semibold text-primary">{roundLabels[round]}</h4>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {roundMatches.map((match) => {
                          const leftDancer = getDancerById(match.dancer_left_id);
                          const rightDancer = getDancerById(match.dancer_right_id);

                          return (
                            <Card
                              key={match.id}
                              className="p-4 bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/50 transition-all"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 text-center">
                                  <div
                                    className={`p-3 rounded-lg ${
                                      match.winner_id === leftDancer?.id
                                        ? "bg-primary/20 border-2 border-primary"
                                        : "bg-muted"
                                    }`}
                                  >
                                    {leftDancer ? (
                                      <>
                                        <div className="font-bold text-sm mb-1">
                                          {leftDancer.name}
                                        </div>
                                        {leftDancer.city && (
                                          <div className="text-xs text-muted-foreground">
                                            {leftDancer.city}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-xs text-muted-foreground">Ожидание</div>
                                    )}
                                  </div>
                                  {match.is_completed && (
                                    <div className="text-sm font-bold mt-2 text-primary">
                                      {match.votes_left}
                                    </div>
                                  )}
                                </div>

                                <div className="text-2xl font-bold text-muted-foreground">VS</div>

                                <div className="flex-1 text-center">
                                  <div
                                    className={`p-3 rounded-lg ${
                                      match.winner_id === rightDancer?.id
                                        ? "bg-accent/20 border-2 border-accent"
                                        : "bg-muted"
                                    }`}
                                  >
                                    {rightDancer ? (
                                      <>
                                        <div className="font-bold text-sm mb-1">
                                          {rightDancer.name}
                                        </div>
                                        {rightDancer.city && (
                                          <div className="text-xs text-muted-foreground">
                                            {rightDancer.city}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="text-xs text-muted-foreground">Waiting</div>
                                    )}
                                  </div>
                                  {match.is_completed && (
                                    <div className="text-sm font-bold mt-2 text-accent">{match.votes_right}</div>
                                  )}
                                </div>
                              </div>
                              {match.is_completed && (
                                <div className="mt-3 text-center">
                                  <Badge variant="secondary" className="bg-primary/20">Completed</Badge>
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {dancers.length > 0 && currentNomination.phase === "selection" && (
              <div>
                <h3 className="text-2xl font-bold mb-4">Selection Participants</h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {dancers.map((dancer, index) => (
                    <Card key={dancer.id} className="p-4 bg-card/50 backdrop-blur-sm border-border/50">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg font-bold">{index + 1}</div>
                        <div>
                          <div className="font-bold">{dancer.name}</div>
                          {dancer.city && <div className="text-xs text-muted-foreground">{dancer.city}</div>}
                        </div>
                      </div>
                      {dancer.average_score > 0 && (
                        <div className="mt-2 text-sm">
                          <span className="text-muted-foreground">Avg Score: </span>
                          <span className="font-bold text-primary">{dancer.average_score.toFixed(1)}</span>
                        </div>
                      )}
                      {dancer.is_qualified && <Badge variant="secondary" className="mt-2 bg-primary/20">Qualified</Badge>}
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

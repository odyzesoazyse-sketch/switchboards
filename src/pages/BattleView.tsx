import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, Trophy, FileText, CheckCircle, XCircle, Trash2, UserMinus,
  BarChart3, Medal, Settings2, MoreVertical, Share2, Monitor, ChevronDown, ChevronUp, User
} from "lucide-react";
import QRCodeShare from "@/components/QRCodeShare";
import SocialShare from "@/components/SocialShare";
import DancerPhotoUpload from "@/components/DancerPhotoUpload";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  video_url: string | null;
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
  const [showJudgeSection, setShowJudgeSection] = useState(false);

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

      const { data: nominationsData, error: nominationsError } = await supabase
        .from("nominations")
        .select("*")
        .eq("battle_id", id);

      if (nominationsError) throw nominationsError;
      setNominations(nominationsData || []);

      if (nominationsData && nominationsData.length > 0) {
        // Bug fix #1: Only set if not already valid
        setSelectedNomination(prev => prev && nominationsData.some(n => n.id === prev) ? prev : nominationsData[0].id);
      }

      if (userId && battleData?.organizer_id === userId) {
        const { data: appsData } = await supabase
          .from("judge_applications")
          .select("*")
          .eq("battle_id", id)
          .order("created_at", { ascending: false });

        if (appsData) {
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
        title: "Error",
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

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "registration": return "bg-secondary/15 text-secondary";
      case "selection": return "bg-primary/15 text-primary";
      case "bracket": return "bg-neon/15 text-neon";
      case "completed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
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
        title: "Error",
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
      const { error: updateError } = await supabase
        .from("judge_applications")
        .update({ status })
        .eq("id", applicationId);

      if (updateError) throw updateError;

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

      for (const dancer of topDancers) {
        await supabase
          .from("dancers")
          .update({ is_qualified: true })
          .eq("id", dancer.id);
      }

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

  const pendingApplications = judgeApplications.filter(a => a.status === "pending");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
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
    <div className="min-h-screen bg-background pb-20 sm:pb-8">
      {/* Header — sticky, minimal */}
      <header className="border-b border-border/30 bg-surface/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="-ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline text-sm">Back</span>
          </Button>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex gap-2">
              <QRCodeShare url={`${window.location.origin}/battles/${id}`} title={battle.name} />
              <SocialShare url={`${window.location.origin}/battles/${id}`} title={battle.name} description={`Join ${battle.name}!`} />
            </div>

            <Button onClick={() => navigate(`/battles/${id}/leaderboard`)} variant="ghost" size="sm" className="text-muted-foreground">
              <Medal className="h-4 w-4" />
            </Button>

            {isOrganizer && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate(`/battle/${id}/operator`)}>
                    <Monitor className="h-4 w-4 mr-2" />
                    Operator Panel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/battle/${id}/settings`)}>
                    <Settings2 className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/battle/${id}/analytics`)}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(`/battle/${id}/logs`)}>
                    <FileText className="h-4 w-4 mr-2" />
                    Logs
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="sm:hidden px-2 py-1.5">
                    <QRCodeShare url={`${window.location.origin}/battles/${id}`} title={battle.name} />
                  </div>
                  <DropdownMenuSeparator />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive focus:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Battle
                      </DropdownMenuItem>
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
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Battle Title — clean, bold */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2">{battle.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>{new Date(battle.date).toLocaleDateString("en-US", { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            {battle.location && <span>📍 {battle.location}</span>}
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPhaseColor(battle.phase)}`}>
              {getPhaseLabel(battle.phase)}
            </span>
          </div>
        </div>

        {/* Judge Management — collapsible, progressive disclosure */}
        {isOrganizer && (pendingApplications.length > 0 || approvedJudges.length > 0) && (
          <Collapsible open={showJudgeSection} onOpenChange={setShowJudgeSection} className="mb-6">
            <CollapsibleTrigger asChild>
              <Card className="p-4 cursor-pointer hover:bg-muted/30 transition-colors border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Judges</span>
                      <span className="text-xs text-muted-foreground">{approvedJudges.length} approved</span>
                      {pendingApplications.length > 0 && (
                        <Badge className="bg-primary/15 text-primary text-[10px] font-bold border-0">{pendingApplications.length} pending</Badge>
                      )}
                    </div>
                  </div>
                  {showJudgeSection ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </Card>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="grid gap-3 sm:grid-cols-2 mt-3">
                {pendingApplications.length > 0 && (
                  <Card className="p-4 border-border/30">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Pending</h3>
                    <div className="space-y-2">
                      {pendingApplications.map((app) => (
                        <div key={app.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                          <span className="text-sm font-medium truncate">{app.profiles?.full_name || app.profiles?.email}</span>
                          <div className="flex gap-1">
                            <Button size="icon" className="h-7 w-7 bg-neon/15 text-neon hover:bg-neon/25 border-0" onClick={() => handleJudgeApplication(app.id, app.user_id, "approved")}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleJudgeApplication(app.id, app.user_id, "rejected")}>
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                <Card className="p-4 border-border/30">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Approved ({approvedJudges.length})</h3>
                  {approvedJudges.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No judges yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {approvedJudges.map((judge) => (
                        <div key={judge.id} className="flex items-center justify-between p-2.5 bg-muted/20 rounded-lg">
                          <span className="text-sm truncate">{judge.full_name || judge.email}</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeJudge(judge.id)}>
                            <UserMinus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Category Tabs */}
        {nominations.length > 0 && (
          <div className="mb-6 -mx-4 px-4 overflow-x-auto">
            <div className="flex gap-2 min-w-max pb-2">
              {nominations.map((nom) => (
                <button
                  key={nom.id}
                  onClick={() => setSelectedNomination(nom.id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedNomination === nom.id
                      ? "bg-primary text-primary-foreground shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {nom.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Current Nomination Content */}
        {currentNomination && (
          <div className="space-y-6">
            {/* Nomination Info — minimal card */}
            <Card className="p-5 border-border/30 bg-card/30">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold">{currentNomination.name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${getPhaseColor(currentNomination.phase)}`}>
                  {getPhaseLabel(currentNomination.phase)}
                </span>
              </div>

              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  {dancers.length}/{currentNomination.max_dancers} dancers
                </span>
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5 text-primary" />
                  Top-{currentNomination.top_count}
                </span>
              </div>

              {/* Phase Actions */}
              {isOrganizer && (
                <div className="pt-4 border-t border-border/20 flex flex-wrap gap-2">
                  {currentNomination.phase === "registration" && (
                    <>
                      <Button onClick={addTestDancers} variant="outline" size="sm" className="text-xs border-border/40">Add Test</Button>
                      <Button onClick={() => changeNominationPhase("selection")} size="sm" className="text-xs bg-primary hover:bg-primary/90">Start Selection</Button>
                    </>
                  )}
                  {currentNomination.phase === "selection" && (
                    <Button onClick={() => changeNominationPhase("bracket")} size="sm" className="text-xs bg-primary hover:bg-primary/90">Go to Bracket</Button>
                  )}
                  {currentNomination.phase === "bracket" && (
                    <Button onClick={() => changeNominationPhase("completed")} variant="outline" size="sm" className="text-xs">Complete</Button>
                  )}
                </div>
              )}
            </Card>

            {/* Bracket View */}
            {currentNomination.phase === "bracket" && matches.length > 0 && (
              <div className="space-y-5">
                <div className="section-label">Bracket</div>

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
                    <div key={round} className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{roundLabels[round]}</h4>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {roundMatches.map((match) => {
                          const leftDancer = getDancerById(match.dancer_left_id);
                          const rightDancer = getDancerById(match.dancer_right_id);

                          return (
                            <Card key={match.id} className="p-3 border-border/20 bg-card/30">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 text-center min-w-0">
                                  <div className={`p-2.5 rounded-lg transition-colors ${match.winner_id === leftDancer?.id ? "bg-primary/15 ring-1 ring-primary/40" : "bg-muted/30"}`}>
                                    <div className="font-semibold text-xs truncate">
                                      {leftDancer?.name || "—"}
                                    </div>
                                  </div>
                                  {match.is_completed && (
                                    <div className="text-xs font-bold mt-1 text-primary">{match.votes_left}</div>
                                  )}
                                </div>

                                <div className="text-xs font-bold text-muted-foreground/50 shrink-0">VS</div>

                                <div className="flex-1 text-center min-w-0">
                                  <div className={`p-2.5 rounded-lg transition-colors ${match.winner_id === rightDancer?.id ? "bg-secondary/15 ring-1 ring-secondary/40" : "bg-muted/30"}`}>
                                    <div className="font-semibold text-xs truncate">
                                      {rightDancer?.name || "—"}
                                    </div>
                                  </div>
                                  {match.is_completed && (
                                    <div className="text-xs font-bold mt-1 text-secondary">{match.votes_right}</div>
                                  )}
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Participants List */}
            {dancers.length > 0 && (currentNomination.phase === "selection" || currentNomination.phase === "registration") && (
              <div>
                <div className="section-label mb-3">
                  {currentNomination.phase === "registration" ? `Registered (${dancers.length})` : "Participants"}
                </div>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {dancers.map((dancer, index) => (
                    <Card key={dancer.id} className="p-3 border-border/20 bg-card/20 hover:bg-card/40 transition-colors">
                      <div className="flex items-center gap-3">
                        {isOrganizer ? (
                          <DancerPhotoUpload
                            dancerId={dancer.id}
                            currentPhotoUrl={dancer.video_url || dancer.photo_url}
                            dancerName={dancer.name}
                            onPhotoUpdated={(url) => {
                              const isVideo = url?.match(/\.(mp4|webm|mov)(\?.*)?$/i);
                              setDancers(prev => prev.map(d =>
                                d.id === dancer.id ? {
                                  ...d,
                                  photo_url: isVideo ? null : (url || null),
                                  video_url: isVideo ? (url || null) : null
                                } : d
                              ));
                            }}
                            compact
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                            {dancer.video_url ? (
                              <video src={dancer.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                            ) : dancer.photo_url ? (
                              <img src={dancer.photo_url} alt={dancer.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                            )}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-sm truncate">{dancer.name}</div>
                          {dancer.city && <div className="text-[11px] text-muted-foreground truncate">{dancer.city}</div>}
                        </div>
                        {dancer.is_qualified && (
                          <span className="text-[10px] font-bold text-neon bg-neon/10 px-2 py-0.5 rounded-full">Q</span>
                        )}
                      </div>
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

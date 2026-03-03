import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Calendar, Users, Trophy, Gavel, Trash2, LogOut, Crown, CreditCard } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
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
  phase: string;
  nominations?: { count: number }[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJudge, setIsJudge] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      await loadUserData(session.user.id);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserData = async (userId: string) => {
    try {
      const { data: organizerBattles, error: battleError } = await supabase
        .from("battles")
        .select(`*, nominations (count)`)
        .eq("organizer_id", userId)
        .order("date", { ascending: false });

      if (battleError) throw battleError;

      const hasOrganizerBattles = organizerBattles && organizerBattles.length > 0;

      const { data: judgeRoles } = await supabase
        .from("user_roles")
        .select("battle_id")
        .eq("user_id", userId)
        .eq("role", "judge");

      const hasJudgeRole = judgeRoles && judgeRoles.length > 0;

      if (hasJudgeRole && !hasOrganizerBattles) {
        navigate("/judge");
        return;
      }

      if (hasOrganizerBattles) {
        setBattles(organizerBattles);
      }

      if (hasJudgeRole) {
        setIsJudge(true);
      }
    } catch (error: any) {
      toast.error("Error loading data");
    } finally {
      setLoading(false);
    }
  };

  const deleteBattle = async (battleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from("battles").delete().eq("id", battleId);
      if (error) throw error;
      setBattles(battles.filter(b => b.id !== battleId));
      toast.success("Battle deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
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
      case "registration": return "bg-secondary/15 text-secondary border border-secondary/20";
      case "selection": return "bg-primary/15 text-primary border border-primary/20";
      case "bracket": return "bg-neon/15 text-neon border border-neon/20";
      case "completed": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      {/* Header — clean, minimal */}
      <header className="border-b border-border/30 bg-surface/50 backdrop-blur-md sticky top-0 z-10">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tight text-foreground">SWITCHBOARD</h1>
          <div className="flex items-center gap-3">
            {isJudge && (
              <Button variant="ghost" size="sm" onClick={() => navigate("/judge")} className="text-muted-foreground hover:text-foreground">
                <Gavel className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline text-sm">Judge</span>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Title + Create */}
        <div className="flex items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-1">My Battles</h2>
            <p className="text-sm text-muted-foreground">{battles.length} events</p>
          </div>
          <Button onClick={() => navigate("/battle/create")} size="sm" className="bg-primary hover:bg-primary/90 shrink-0 gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Battle</span>
          </Button>
        </div>

        {battles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
              <Trophy className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No battles yet</h3>
            <p className="text-muted-foreground text-sm mb-8 max-w-xs">Create your first battle to start organizing dance events</p>
            <Button onClick={() => navigate("/battle/create")} className="bg-primary hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" />
              Create Battle
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {battles.map((battle) => (
              <Card
                key={battle.id}
                className="group relative cursor-pointer border-border/30 bg-card/50 hover:bg-card hover:border-border/60 transition-all duration-200 hover-lift"
                onClick={() => navigate(`/battle/${battle.id}`)}
              >
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-muted-foreground hover:text-destructive h-8 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
                      <AlertDialogAction onClick={(e) => deleteBattle(battle.id, e)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <div className="p-5 sm:p-6">
                  <h3 className="text-lg font-bold mb-3 group-hover:text-primary transition-colors pr-8">{battle.name}</h3>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(battle.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {battle.nominations?.[0]?.count || 0}
                      </span>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getPhaseColor(battle.phase)}`}>
                      {getPhaseLabel(battle.phase)}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

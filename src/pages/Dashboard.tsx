import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Users, Trophy, Gavel, Trash2, LogOut } from "lucide-react";
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
      // Check if user is organizer (has any battles)
      const { data: organizerBattles, error: battleError } = await supabase
        .from("battles")
        .select(`*, nominations (count)`)
        .eq("organizer_id", userId)
        .order("date", { ascending: false });

      if (battleError) throw battleError;

      const hasOrganizerBattles = organizerBattles && organizerBattles.length > 0;

      // Check if user is judge for any battles
      const { data: judgeRoles } = await supabase
        .from("user_roles")
        .select("battle_id")
        .eq("user_id", userId)
        .eq("role", "judge");

      const hasJudgeRole = judgeRoles && judgeRoles.length > 0;

      // If user is ONLY a judge (not organizer), redirect directly to judge panel
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card pt-0 sm:pt-14">
      <header className="border-b border-border/50 backdrop-blur-sm sm:mt-0">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-2xl font-bold text-foreground shrink-0 sm:hidden">SWITCHBOARD</h1>
          <h1 className="text-lg font-bold text-foreground shrink-0 hidden sm:block">My Dashboard</h1>
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <span className="text-xs sm:text-sm text-muted-foreground truncate max-w-[120px] sm:max-w-none hidden sm:inline">{user?.email}</span>
            {isJudge && (
              <Button variant="outline" size="sm" onClick={() => navigate("/judge")} className="shrink-0">
                <Gavel className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Judge Panel</span>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleSignOut} className="shrink-0">
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-8 gap-2">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2">My Battles</h2>
            <p className="text-muted-foreground text-sm sm:text-base">Manage your events</p>
          </div>
          <Button onClick={() => navigate("/battle/create")} size="sm" className="bg-primary hover:bg-primary/90 glow-primary shrink-0">
            <Plus className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Battle</span>
          </Button>
        </div>

        {battles.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No battles yet</h3>
              <p className="text-muted-foreground text-center mb-6">Create your first battle or find an event to join!</p>
              <Button onClick={() => navigate("/battle/create")} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Battle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {battles.map((battle) => (
              <Card
                key={battle.id}
                className="border-border/50 hover:border-primary/50 transition-all cursor-pointer group relative"
                onClick={() => navigate(`/battle/${battle.id}`)}
              >
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 text-destructive hover:text-destructive"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="w-4 h-4" />
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
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors">{battle.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(battle.date).toLocaleDateString("en-US")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{battle.nominations?.[0]?.count || 0} categories</span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${battle.phase === "registration" ? "bg-secondary/20 text-secondary"
                      : battle.phase === "selection" ? "bg-primary/20 text-primary"
                        : battle.phase === "bracket" ? "bg-accent/20 text-accent"
                          : "bg-muted text-muted-foreground"
                      }`}>
                      {getPhaseLabel(battle.phase)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;

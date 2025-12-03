import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Users, Trophy, Gavel, Trash2 } from "lucide-react";
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

interface JudgeBattle {
  id: string;
  name: string;
  date: string;
  phase: string;
  location: string | null;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [judgeBattles, setJudgeBattles] = useState<JudgeBattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isJudge, setIsJudge] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);

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
      
      if (organizerBattles && organizerBattles.length > 0) {
        setIsOrganizer(true);
        setBattles(organizerBattles);
      }

      // Check if user is judge for any battles
      const { data: judgeRoles } = await supabase
        .from("user_roles")
        .select("battle_id")
        .eq("user_id", userId)
        .eq("role", "judge");

      if (judgeRoles && judgeRoles.length > 0) {
        setIsJudge(true);
        const battleIds = judgeRoles.map(r => r.battle_id).filter(Boolean);
        
        if (battleIds.length > 0) {
          const { data: jBattles } = await supabase
            .from("battles")
            .select("*")
            .in("id", battleIds)
            .order("date", { ascending: false });
          
          setJudgeBattles(jBattles || []);
        }
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

  // Judge-only view
  if (isJudge && !isOrganizer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-card">
        <header className="border-b border-border/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gradient-primary">BreakDance Judge</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <Gavel className="w-8 h-8 text-primary" />
              My Judging
            </h2>
            <p className="text-muted-foreground">Battles you are judging</p>
          </div>

          {judgeBattles.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Gavel className="w-16 h-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No battles assigned</h3>
                <p className="text-muted-foreground text-center">Wait for organizer to approve your application</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {judgeBattles.map((battle) => (
                <Card 
                  key={battle.id}
                  className="border-border/50 hover:border-primary/50 transition-all cursor-pointer group"
                  onClick={() => navigate("/judge")}
                >
                  <CardHeader>
                    <CardTitle className="group-hover:text-primary transition-colors">
                      {battle.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(battle.date).toLocaleDateString("en-US")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      {battle.location && (
                        <span className="text-muted-foreground">📍 {battle.location}</span>
                      )}
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        battle.phase === "bracket" ? "bg-accent/20 text-accent" : "bg-muted text-muted-foreground"
                      }`}>
                        {getPhaseLabel(battle.phase)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Button size="lg" onClick={() => navigate("/judge")} className="gap-2">
              <Gavel className="w-5 h-5" />
              Open Judge Panel
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Organizer view (can also be judge)
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gradient-primary">BreakDance Judge</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.email}</span>
            {isJudge && (
              <Button variant="outline" onClick={() => navigate("/judge")}>
                <Gavel className="w-4 h-4 mr-2" />
                Judge Panel
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>Sign Out</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">My Battles</h2>
            <p className="text-muted-foreground">Manage your breakdance events</p>
          </div>
          <Button onClick={() => navigate("/battle/create")} className="bg-primary hover:bg-primary/90 glow-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Battle
          </Button>
        </div>

        {battles.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No battles yet</h3>
              <p className="text-muted-foreground text-center mb-6">Create your first battle</p>
              <Button onClick={() => navigate("/battle/create")} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Create Battle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      battle.phase === "registration" ? "bg-secondary/20 text-secondary" 
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

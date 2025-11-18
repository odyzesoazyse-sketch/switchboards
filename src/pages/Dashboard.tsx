import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Calendar, Users, Trophy } from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [battles, setBattles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadBattles(session.user.id);
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

  const loadBattles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("battles")
        .select(`
          *,
          nominations (count)
        `)
        .eq("organizer_id", userId)
        .order("date", { ascending: false });

      if (error) throw error;
      setBattles(data || []);
    } catch (error: any) {
      toast.error("Error loading battles");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gradient-primary">
            BreakDance Judge
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.email}
            </span>
            <Button variant="outline" onClick={() => navigate("/judge")}>
              Judge Panel
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">My Battles</h2>
            <p className="text-muted-foreground">
              Manage your breakdance events
            </p>
          </div>
          <Button 
            onClick={() => navigate("/battle/create")}
            className="bg-primary hover:bg-primary/90 glow-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Battle
          </Button>
        </div>

        {battles.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Trophy className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                No battles yet
              </h3>
              <p className="text-muted-foreground text-center mb-6">
                Create your first battle and start judging
              </p>
              <Button 
                onClick={() => navigate("/battle/create")}
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Battle
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {battles.map((battle) => (
              <Card 
                key={battle.id}
                className="border-border/50 hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => navigate(`/battle/${battle.id}`)}
              >
                <CardHeader>
                  <CardTitle className="group-hover:text-primary transition-colors">
                    {battle.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(battle.date).toLocaleDateString("ru-RU")}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{battle.nominations?.[0]?.count || 0} categories</span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      battle.phase === "registration" 
                        ? "bg-secondary/20 text-secondary" 
                        : battle.phase === "selection"
                        ? "bg-primary/20 text-primary"
                        : battle.phase === "bracket"
                        ? "bg-accent/20 text-accent"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {battle.phase === "registration" && "Registration"}
                      {battle.phase === "selection" && "Selection"}
                      {battle.phase === "bracket" && "Bracket"}
                      {battle.phase === "completed" && "Completed"}
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

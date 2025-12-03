import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Users, Trophy, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Battle {
  id: string;
  name: string;
  date: string;
  location: string | null;
  phase: string;
  nomination_count: number;
}

export default function BattlesList() {
  const navigate = useNavigate();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBattles();
  }, []);

  const loadBattles = async () => {
    try {
      const { data } = await supabase
        .from("battles")
        .select(`*, nominations (count)`)
        .order("date", { ascending: true });

      if (data) {
        const battlesWithCounts = data.map(b => ({
          ...b,
          nomination_count: b.nominations?.[0]?.count || 0,
        }));
        setBattles(battlesWithCounts);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getPhaseInfo = (phase: string) => {
    switch (phase) {
      case "registration":
        return { label: "Open for Registration", color: "bg-green-500/20 text-green-500" };
      case "selection":
        return { label: "Selection Phase", color: "bg-yellow-500/20 text-yellow-500" };
      case "bracket":
        return { label: "Battle Phase", color: "bg-primary/20 text-primary" };
      case "completed":
        return { label: "Completed", color: "bg-muted text-muted-foreground" };
      default:
        return { label: phase, color: "bg-muted text-muted-foreground" };
    }
  };

  const upcomingBattles = battles.filter(b => b.phase === "registration" || new Date(b.date) >= new Date());
  const pastBattles = battles.filter(b => b.phase === "completed" || (new Date(b.date) < new Date() && b.phase !== "registration"));

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground cursor-pointer" onClick={() => navigate("/")}>
            SWITCHBOARD
          </h1>
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-primary">Find Your</span>{" "}
            <span className="text-gradient-secondary">Battle</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Browse upcoming breakdance battles and register as a dancer
          </p>
        </div>

        {upcomingBattles.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              Upcoming Battles
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {upcomingBattles.map((battle) => {
                const phaseInfo = getPhaseInfo(battle.phase);
                return (
                  <Card
                    key={battle.id}
                    className="border-border/50 hover:border-primary/50 transition-all cursor-pointer group overflow-hidden"
                    onClick={() => navigate(`/battles/${battle.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {battle.name}
                        </CardTitle>
                        <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(battle.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {battle.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {battle.location}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {battle.nomination_count} {battle.nomination_count === 1 ? "category" : "categories"}
                          </div>
                          <Badge className={phaseInfo.color}>{phaseInfo.label}</Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {upcomingBattles.length === 0 && (
          <Card className="mb-12">
            <CardContent className="py-12 text-center">
              <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Upcoming Battles</h3>
              <p className="text-muted-foreground mb-4">Check back soon for new events!</p>
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Organize a Battle
              </Button>
            </CardContent>
          </Card>
        )}

        {pastBattles.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6 text-muted-foreground">Past Battles</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pastBattles.map((battle) => (
                <Card key={battle.id} className="border-border/30 opacity-70">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{battle.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(battle.date).toLocaleDateString("en-US")}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

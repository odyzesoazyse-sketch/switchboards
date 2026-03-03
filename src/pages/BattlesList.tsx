import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, MapPin, Users, Trophy, ArrowRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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
  const [searchQuery, setSearchQuery] = useState("");

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
        return { label: "Open", color: "bg-success/15 text-success border-success/30" };
      case "selection":
        return { label: "Selection", color: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" };
      case "bracket":
        return { label: "Live", color: "bg-primary/15 text-primary border-primary/30" };
      case "completed":
        return { label: "Completed", color: "bg-muted text-muted-foreground border-border" };
      default:
        return { label: phase, color: "bg-muted text-muted-foreground border-border" };
    }
  };

  const filteredBattles = battles.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const upcomingBattles = filteredBattles.filter(b => 
    b.phase === "registration" || b.phase === "selection" || b.phase === "bracket"
  );
  const pastBattles = filteredBattles.filter(b => b.phase === "completed");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background sm:pt-14">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-display font-bold tracking-tight cursor-pointer"
            onClick={() => navigate("/")}
          >
            SWITCHBOARD
          </h1>
          <Button onClick={() => navigate("/auth")}>
            Sign In
          </Button>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
            Find Your <span className="text-gradient-mixed">Battle</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
            Browse upcoming breakdance events and register as a dancer
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search battles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-lg"
            />
          </div>
        </div>

        {/* Upcoming Battles */}
        {upcomingBattles.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold">Upcoming Battles</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {upcomingBattles.map((battle) => {
                const phaseInfo = getPhaseInfo(battle.phase);
                return (
                  <Card
                    key={battle.id}
                    className="group cursor-pointer hover-lift border-border/50 hover:border-primary/30 overflow-hidden"
                    onClick={() => navigate(`/battles/${battle.id}`)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
                          {battle.name}
                        </CardTitle>
                        <ArrowRight className="w-5 h-5 flex-shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                        {new Date(battle.date).toLocaleDateString("en-US", { 
                          weekday: "short", 
                          month: "short", 
                          day: "numeric" 
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        {battle.location && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{battle.location}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Users className="w-4 h-4" />
                            {battle.nomination_count} {battle.nomination_count === 1 ? "category" : "categories"}
                          </div>
                          <Badge variant="outline" className={phaseInfo.color}>
                            {phaseInfo.label}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* Empty State */}
        {upcomingBattles.length === 0 && !searchQuery && (
          <Card className="mb-16">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-6">
                <Trophy className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2">No Upcoming Battles</h3>
              <p className="text-muted-foreground mb-6">Check back soon for new events!</p>
              <Button variant="outline" onClick={() => navigate("/auth")}>
                Organize a Battle
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No Results */}
        {filteredBattles.length === 0 && searchQuery && (
          <Card className="mb-16">
            <CardContent className="py-16 text-center">
              <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-xl font-display font-semibold mb-2">No Results</h3>
              <p className="text-muted-foreground">
                No battles found for "{searchQuery}"
              </p>
            </CardContent>
          </Card>
        )}

        {/* Past Battles */}
        {pastBattles.length > 0 && (
          <section>
            <h2 className="text-xl font-display font-bold mb-6 text-muted-foreground">Past Battles</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {pastBattles.map((battle) => (
                <Card key={battle.id} className="border-border/30 opacity-70 hover:opacity-100 transition-opacity">
                  <CardHeader className="py-4">
                    <CardTitle className="text-base">{battle.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 text-xs">
                      <Calendar className="w-3 h-3" />
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
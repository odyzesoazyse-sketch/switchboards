import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, ArrowLeft, Users, Flame, Crown } from "lucide-react";
import SocialShare from "@/components/SocialShare";

interface Dancer {
  id: string;
  name: string;
  city: string | null;
  average_score: number;
  is_qualified: boolean;
  wins: number;
}

interface Battle {
  id: string;
  name: string;
  phase: string;
}

export default function Leaderboard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData();

    const channel = supabase
      .channel('leaderboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dancers' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const loadData = async () => {
    try {
      const { data: battleData } = await supabase
        .from("battles")
        .select("*")
        .eq("id", id)
        .single();

      if (battleData) setBattle(battleData);

      // Get all dancers with their win counts
      const { data: nominations } = await supabase
        .from("nominations")
        .select("id")
        .eq("battle_id", id);

      if (!nominations) return;

      const nominationIds = nominations.map(n => n.id);

      const { data: dancersData } = await supabase
        .from("dancers")
        .select("*")
        .in("nomination_id", nominationIds);

      // Count wins from matches
      const { data: matches } = await supabase
        .from("matches")
        .select("winner_id")
        .in("nomination_id", nominationIds)
        .not("winner_id", "is", null);

      const winCounts = new Map<string, number>();
      matches?.forEach(m => {
        if (m.winner_id) {
          winCounts.set(m.winner_id, (winCounts.get(m.winner_id) || 0) + 1);
        }
      });

      const dancersWithWins = dancersData?.map(d => ({
        ...d,
        wins: winCounts.get(d.id) || 0
      })) || [];

      // Sort by wins, then by average score
      dancersWithWins.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (b.average_score || 0) - (a.average_score || 0);
      });

      setDancers(dancersWithWins);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-6 h-6 text-primary" />;
    if (index === 1) return <Medal className="w-6 h-6 text-muted-foreground" />;
    if (index === 2) return <Medal className="w-6 h-6 text-secondary" />;
    return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">{index + 1}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background sm:pt-14">
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {battle && (
            <SocialShare
              url={window.location.href}
              title={`${battle.name} Leaderboard`}
              description={`Check out the live standings for ${battle.name}!`}
            />
          )}
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">{battle?.name}</h1>
          <p className="text-muted-foreground">Live Leaderboard</p>
          <Badge className="mt-3" variant="outline">
            <Flame className="w-3 h-3 mr-1" />
            {battle?.phase === "bracket" ? "Battle in Progress" : battle?.phase}
          </Badge>
        </div>

        {dancers.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No dancers registered yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {dancers.map((dancer, index) => (
              <Card 
                key={dancer.id} 
                className={`transition-all ${
                  index === 0 ? "border-primary/50 bg-primary/5" :
                  index === 1 ? "border-muted-foreground/50 bg-muted/10" :
                  index === 2 ? "border-secondary/50 bg-secondary/5" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {getRankIcon(index)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{dancer.name}</h3>
                      {dancer.city && (
                        <p className="text-sm text-muted-foreground">{dancer.city}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold text-lg">{dancer.wins}</div>
                      <div className="text-xs text-muted-foreground">wins</div>
                    </div>
                    {dancer.is_qualified && (
                      <Badge variant="secondary" className="bg-success/15 text-success">
                        Qualified
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
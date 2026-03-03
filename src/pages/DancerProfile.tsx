import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Trophy, MapPin, Star, Calendar, Instagram, User } from "lucide-react";
import SocialShare from "@/components/SocialShare";

interface DancerProfile {
  id: string;
  name: string;
  city: string | null;
  age: number | null;
  bio: string | null;
  instagram: string | null;
  photo_url: string | null;
  video_url: string | null;
  wins_count: number;
  battles_count: number;
  average_score: number | null;
  nomination_name?: string;
  battle_name?: string;
}

interface Match {
  id: string;
  round: string;
  winner_id: string | null;
  opponent_name?: string;
  battle_name?: string;
}

export default function DancerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [dancer, setDancer] = useState<DancerProfile | null>(null);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadDancer();
  }, [id]);

  const loadDancer = async () => {
    try {
      // Get dancer with nomination and battle info
      const { data: dancerData } = await supabase
        .from("dancers")
        .select(`
          *,
          nominations (
            name,
            battles (
              name
            )
          )
        `)
        .eq("id", id)
        .single();

      if (dancerData) {
        setDancer({
          ...dancerData,
          nomination_name: dancerData.nominations?.name,
          battle_name: dancerData.nominations?.battles?.name,
        });
      }

      // Get recent matches
      const { data: matchesAsLeft } = await supabase
        .from("matches")
        .select("*")
        .eq("dancer_left_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      const { data: matchesAsRight } = await supabase
        .from("matches")
        .select("*")
        .eq("dancer_right_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      const allMatches = [...(matchesAsLeft || []), ...(matchesAsRight || [])];

      // Get opponent names
      const opponentIds = new Set<string>();
      allMatches.forEach(m => {
        const oppId = m.dancer_left_id === id ? m.dancer_right_id : m.dancer_left_id;
        if (oppId) opponentIds.add(oppId);
      });

      const { data: opponents } = await supabase
        .from("dancers")
        .select("id, name")
        .in("id", Array.from(opponentIds));

      const oppMap = new Map(opponents?.map(o => [o.id, o.name]));

      setRecentMatches(allMatches.map(m => ({
        ...m,
        opponent_name: oppMap.get(m.dancer_left_id === id ? m.dancer_right_id : m.dancer_left_id),
      })));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!dancer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Dancer not found</p>
      </div>
    );
  }

  const wins = recentMatches.filter(m => m.winner_id === id).length;
  const losses = recentMatches.filter(m => m.winner_id && m.winner_id !== id).length;

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0">
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <SocialShare
            url={window.location.href}
            title={dancer.name}
            description={`Check out ${dancer.name}'s profile on SWITCHBOARD!`}
          />
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        {/* Profile Header */}
        <div className="text-center mb-10">
          <div className="w-32 h-32 mx-auto rounded-3xl bg-primary/10 flex items-center justify-center mb-6 overflow-hidden">
            {dancer.video_url ? (
              <video src={dancer.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
            ) : dancer.photo_url ? (
              <img src={dancer.photo_url} alt={dancer.name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-primary" />
            )}
          </div>

          <h1 className="text-3xl font-display font-bold mb-2">{dancer.name}</h1>

          <div className="flex items-center justify-center gap-4 text-muted-foreground mb-4">
            {dancer.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {dancer.city}
              </span>
            )}
            {dancer.age && (
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {dancer.age} years
              </span>
            )}
          </div>

          {dancer.instagram && (
            <a
              href={`https://instagram.com/${dancer.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <Instagram className="w-4 h-4" />
              @{dancer.instagram}
            </a>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-display font-bold text-primary">{wins}</div>
              <div className="text-sm text-muted-foreground">Wins</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-display font-bold text-secondary">{losses}</div>
              <div className="text-sm text-muted-foreground">Losses</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-display font-bold">
                {dancer.average_score?.toFixed(1) || "-"}
              </div>
              <div className="text-sm text-muted-foreground">Avg Score</div>
            </CardContent>
          </Card>
        </div>

        {/* Bio */}
        {dancer.bio && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="font-display text-lg">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{dancer.bio}</p>
            </CardContent>
          </Card>
        )}

        {/* Recent Matches */}
        {recentMatches.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Recent Battles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentMatches.slice(0, 5).map((match) => {
                  const isWin = match.winner_id === id;
                  const isPending = !match.winner_id;

                  return (
                    <div
                      key={match.id}
                      className={`flex items-center justify-between p-3 rounded-xl ${isPending ? "bg-muted/50" : isWin ? "bg-success/10" : "bg-destructive/10"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Trophy className={`w-5 h-5 ${isPending ? "text-muted-foreground" : isWin ? "text-success" : "text-destructive"
                          }`} />
                        <div>
                          <p className="font-medium">vs {match.opponent_name || "TBD"}</p>
                          <p className="text-sm text-muted-foreground">{match.round}</p>
                        </div>
                      </div>
                      <Badge variant={isPending ? "secondary" : isWin ? "default" : "destructive"}>
                        {isPending ? "Pending" : isWin ? "Won" : "Lost"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
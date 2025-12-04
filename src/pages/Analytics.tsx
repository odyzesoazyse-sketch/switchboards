import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Trophy, Gavel, Calendar, TrendingUp, Download, BarChart3 } from "lucide-react";
import { exportToPDF, exportToCSV } from "@/lib/export";
import { toast } from "sonner";

interface AnalyticsData {
  totalDancers: number;
  totalMatches: number;
  completedMatches: number;
  totalJudges: number;
  totalVotes: number;
  nominations: {
    name: string;
    dancerCount: number;
    matchCount: number;
  }[];
}

export default function Analytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [battle, setBattle] = useState<any>(null);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      // Battle info
      const { data: battleData } = await supabase
        .from("battles")
        .select("*")
        .eq("id", id)
        .single();
      
      setBattle(battleData);

      // Nominations
      const { data: nominations } = await supabase
        .from("nominations")
        .select("*")
        .eq("battle_id", id);

      const nominationIds = nominations?.map(n => n.id) || [];

      // Dancers count
      const { count: totalDancers } = await supabase
        .from("dancers")
        .select("*", { count: "exact", head: true })
        .in("nomination_id", nominationIds);

      // Matches
      const { data: matches } = await supabase
        .from("matches")
        .select("*")
        .in("nomination_id", nominationIds);

      // Judges
      const { count: totalJudges } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("battle_id", id)
        .eq("role", "judge");

      // Votes
      const matchIds = matches?.map(m => m.id) || [];
      const { count: totalVotes } = await supabase
        .from("match_votes")
        .select("*", { count: "exact", head: true })
        .in("match_id", matchIds);

      // Per-nomination stats
      const nominationStats = await Promise.all(
        (nominations || []).map(async (nom) => {
          const { count: dancerCount } = await supabase
            .from("dancers")
            .select("*", { count: "exact", head: true })
            .eq("nomination_id", nom.id);

          const { count: matchCount } = await supabase
            .from("matches")
            .select("*", { count: "exact", head: true })
            .eq("nomination_id", nom.id);

          return {
            name: nom.name,
            dancerCount: dancerCount || 0,
            matchCount: matchCount || 0,
          };
        })
      );

      setData({
        totalDancers: totalDancers || 0,
        totalMatches: matches?.length || 0,
        completedMatches: matches?.filter(m => m.is_completed).length || 0,
        totalJudges: totalJudges || 0,
        totalVotes: totalVotes || 0,
        nominations: nominationStats,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "pdf" | "csv") => {
    if (!battle) return;
    
    setExporting(true);
    try {
      // Fetch all data for export
      const { data: nominations } = await supabase
        .from("nominations")
        .select("*")
        .eq("battle_id", id);

      const exportData = {
        battleName: battle.name,
        date: battle.date,
        location: battle.location,
        nominations: await Promise.all(
          (nominations || []).map(async (nom) => {
            const { data: dancers } = await supabase
              .from("dancers")
              .select("*")
              .eq("nomination_id", nom.id)
              .order("average_score", { ascending: false });

            const { data: matches } = await supabase
              .from("matches")
              .select("*")
              .eq("nomination_id", nom.id)
              .order("position");

            // Get dancer names for matches
            const dancerIds = new Set<string>();
            matches?.forEach(m => {
              if (m.dancer_left_id) dancerIds.add(m.dancer_left_id);
              if (m.dancer_right_id) dancerIds.add(m.dancer_right_id);
              if (m.winner_id) dancerIds.add(m.winner_id);
            });

            const { data: matchDancers } = await supabase
              .from("dancers")
              .select("id, name")
              .in("id", Array.from(dancerIds));

            const dancerMap = new Map(matchDancers?.map(d => [d.id, d.name]));

            return {
              name: nom.name,
              dancers: dancers || [],
              matches: (matches || []).map(m => ({
                round: m.round,
                position: m.position,
                dancer_left_name: m.dancer_left_id ? dancerMap.get(m.dancer_left_id) : undefined,
                dancer_right_name: m.dancer_right_id ? dancerMap.get(m.dancer_right_id) : undefined,
                winner_name: m.winner_id ? dancerMap.get(m.winner_id) : undefined,
              })),
            };
          })
        ),
      };

      if (format === "pdf") {
        exportToPDF(exportData);
      } else {
        exportToCSV(exportData);
      }
      
      toast.success(`Exported to ${format.toUpperCase()}`);
    } catch (error) {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(`/battle/${id}`)} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleExport("csv")}
              disabled={exporting}
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button 
              size="sm" 
              onClick={() => handleExport("pdf")}
              disabled={exporting}
            >
              <Download className="w-4 h-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8 max-w-4xl">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">{battle?.name}</h1>
          <p className="text-muted-foreground">Analytics & Statistics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 mx-auto text-primary mb-2" />
              <div className="text-3xl font-display font-bold">{data?.totalDancers}</div>
              <div className="text-sm text-muted-foreground">Dancers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Trophy className="w-8 h-8 mx-auto text-secondary mb-2" />
              <div className="text-3xl font-display font-bold">{data?.completedMatches}/{data?.totalMatches}</div>
              <div className="text-sm text-muted-foreground">Matches</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <Gavel className="w-8 h-8 mx-auto text-primary mb-2" />
              <div className="text-3xl font-display font-bold">{data?.totalJudges}</div>
              <div className="text-sm text-muted-foreground">Judges</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 mx-auto text-secondary mb-2" />
              <div className="text-3xl font-display font-bold">{data?.totalVotes}</div>
              <div className="text-sm text-muted-foreground">Votes</div>
            </CardContent>
          </Card>
        </div>

        {/* Categories breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.nominations.map((nom, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                  <div>
                    <h3 className="font-semibold">{nom.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {nom.dancerCount} dancers • {nom.matchCount} matches
                    </p>
                  </div>
                  <div className="flex gap-4 text-right">
                    <div>
                      <div className="text-xl font-display font-bold text-primary">{nom.dancerCount}</div>
                      <div className="text-xs text-muted-foreground">Dancers</div>
                    </div>
                    <div>
                      <div className="text-xl font-display font-bold text-secondary">{nom.matchCount}</div>
                      <div className="text-xs text-muted-foreground">Matches</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
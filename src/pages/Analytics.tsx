import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Trophy, Gavel, TrendingUp, Download, BarChart3 } from "lucide-react";
import { exportToPDF, exportToCSV } from "@/lib/export";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

interface AnalyticsData {
  totalDancers: number;
  totalMatches: number;
  completedMatches: number;
  totalJudges: number;
  totalVotes: number;
  totalAudienceVotes: number;
  nominations: {
    name: string;
    dancerCount: number;
    matchCount: number;
  }[];
  votesByRound: { round: number; votes: number }[];
  judgeActivity: { name: string; votes: number }[];
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"];

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
      const { data: battleData } = await supabase.from("battles").select("*").eq("id", id).single();
      setBattle(battleData);

      const { data: nominations } = await supabase.from("nominations").select("*").eq("battle_id", id);
      const nominationIds = nominations?.map(n => n.id) || [];

      const { count: totalDancers } = await supabase.from("dancers").select("*", { count: "exact", head: true }).in("nomination_id", nominationIds);

      const { data: matches } = await supabase.from("matches").select("*").in("nomination_id", nominationIds);

      const { count: totalJudges } = await supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("battle_id", id).eq("role", "judge");

      const matchIds = matches?.map(m => m.id) || [];
      
      const { data: allVotes } = await supabase.from("match_votes").select("*").in("match_id", matchIds);
      
      const { count: totalAudienceVotes } = await supabase.from("audience_votes").select("*", { count: "exact", head: true }).in("match_id", matchIds);

      // Votes by round
      const roundMap = new Map<number, number>();
      allVotes?.forEach(v => {
        roundMap.set(v.round_number, (roundMap.get(v.round_number) || 0) + 1);
      });
      const votesByRound = Array.from(roundMap.entries())
        .map(([round, votes]) => ({ round, votes }))
        .sort((a, b) => a.round - b.round);

      // Judge activity
      const judgeVoteMap = new Map<string, number>();
      allVotes?.forEach(v => {
        judgeVoteMap.set(v.judge_id, (judgeVoteMap.get(v.judge_id) || 0) + 1);
      });

      const { data: judgeRoles } = await supabase.from("user_roles").select("user_id").eq("battle_id", id).eq("role", "judge");
      const judgeIds = judgeRoles?.map(r => r.user_id) || [];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", judgeIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name || "Unknown"]) || []);

      const judgeActivity = Array.from(judgeVoteMap.entries())
        .map(([judgeId, votes]) => ({ name: profileMap.get(judgeId) || "Unknown", votes }))
        .sort((a, b) => b.votes - a.votes);

      const nominationStats = await Promise.all(
        (nominations || []).map(async (nom) => {
          const { count: dancerCount } = await supabase.from("dancers").select("*", { count: "exact", head: true }).eq("nomination_id", nom.id);
          const { count: matchCount } = await supabase.from("matches").select("*", { count: "exact", head: true }).eq("nomination_id", nom.id);
          return { name: nom.name, dancerCount: dancerCount || 0, matchCount: matchCount || 0 };
        })
      );

      setData({
        totalDancers: totalDancers || 0,
        totalMatches: matches?.length || 0,
        completedMatches: matches?.filter(m => m.is_completed).length || 0,
        totalJudges: totalJudges || 0,
        totalVotes: allVotes?.length || 0,
        totalAudienceVotes: totalAudienceVotes || 0,
        nominations: nominationStats,
        votesByRound,
        judgeActivity,
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
      const { data: nominations } = await supabase.from("nominations").select("*").eq("battle_id", id);
      const exportData = {
        battleName: battle.name,
        date: battle.date,
        location: battle.location,
        nominations: await Promise.all(
          (nominations || []).map(async (nom) => {
            const { data: dancers } = await supabase.from("dancers").select("*").eq("nomination_id", nom.id).order("average_score", { ascending: false });
            const { data: matches } = await supabase.from("matches").select("*").eq("nomination_id", nom.id).order("position");
            const dancerIds = new Set<string>();
            matches?.forEach(m => { if (m.dancer_left_id) dancerIds.add(m.dancer_left_id); if (m.dancer_right_id) dancerIds.add(m.dancer_right_id); if (m.winner_id) dancerIds.add(m.winner_id); });
            const { data: matchDancers } = await supabase.from("dancers").select("id, name").in("id", Array.from(dancerIds));
            const dancerMap = new Map(matchDancers?.map(d => [d.id, d.name]));
            return {
              name: nom.name,
              dancers: dancers || [],
              matches: (matches || []).map(m => ({
                round: m.round, position: m.position,
                dancer_left_name: m.dancer_left_id ? dancerMap.get(m.dancer_left_id) : undefined,
                dancer_right_name: m.dancer_right_id ? dancerMap.get(m.dancer_right_id) : undefined,
                winner_name: m.winner_id ? dancerMap.get(m.winner_id) : undefined,
              })),
            };
          })
        ),
      };
      if (format === "pdf") exportToPDF(exportData); else exportToCSV(exportData);
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

  const categoryChartData = data?.nominations.map(n => ({
    name: n.name,
    dancers: n.dancerCount,
    matches: n.matchCount,
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(`/battle/${id}`)} className="-ml-2">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport("csv")} disabled={exporting}>
              <Download className="w-4 h-4 mr-2" />CSV
            </Button>
            <Button size="sm" onClick={() => handleExport("pdf")} disabled={exporting}>
              <Download className="w-4 h-4 mr-2" />PDF
            </Button>
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-6 py-8 max-w-5xl space-y-8">
        <div className="text-center mb-10">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-secondary/10 flex items-center justify-center mb-4">
            <BarChart3 className="w-8 h-8 text-secondary" />
          </div>
          <h1 className="text-3xl font-display font-bold mb-2">{battle?.name}</h1>
          <p className="text-muted-foreground">Analytics & Statistics</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { icon: Users, label: "Dancers", value: data?.totalDancers, color: "text-primary" },
            { icon: Trophy, label: "Matches", value: `${data?.completedMatches}/${data?.totalMatches}`, color: "text-secondary" },
            { icon: Gavel, label: "Judges", value: data?.totalJudges, color: "text-primary" },
            { icon: TrendingUp, label: "Judge Votes", value: data?.totalVotes, color: "text-secondary" },
            { icon: Users, label: "Audience Votes", value: data?.totalAudienceVotes, color: "text-primary" },
          ].map(({ icon: Icon, label, value, color }, i) => (
            <Card key={i}>
              <CardContent className="pt-6 text-center">
                <Icon className={`w-7 h-7 mx-auto ${color} mb-2`} />
                <div className="text-2xl font-display font-bold">{value}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Votes by Round */}
          {data && data.votesByRound.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Votes by Round</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.votesByRound}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="round" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `R${v}`} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="votes" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Judge Activity */}
          {data && data.judgeActivity.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Judge Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.judgeActivity} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={100} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                    />
                    <Bar dataKey="votes" fill="hsl(var(--secondary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Categories Chart */}
        {categoryChartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Categories Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  <Bar dataKey="dancers" fill="hsl(var(--primary))" name="Dancers" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="matches" fill="hsl(var(--secondary))" name="Matches" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Categories Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data?.nominations.map((nom, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-muted/50 rounded-xl">
                  <div>
                    <h3 className="font-semibold">{nom.name}</h3>
                    <p className="text-sm text-muted-foreground">{nom.dancerCount} dancers • {nom.matchCount} matches</p>
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

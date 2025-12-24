import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, Trophy, TrendingUp, Zap, Users, Swords, 
  Plus, RefreshCw, Trash2, ChevronRight, Loader2,
  Crown, Medal, Award, User, Network
} from "lucide-react";
import { toast } from "sonner";
import { calculatePageRank, parseBattleText } from "@/lib/pagerank";
import { generateDemoData, BBOYS, BGIRLS } from "@/lib/demoData";
import { BattleGraph } from "@/components/BattleGraph";
import { RankingTournamentView } from "@/components/RankingTournamentView";
import { TournamentBracketDialog } from "@/components/TournamentBracketDialog";

interface RankedDancer {
  id: string;
  name: string;
  category: string;
  pagerank_score: number;
  wins_count: number;
  losses_count: number;
  battles_count: number;
}

interface JudgeVote {
  judgeName: string;
  votedFor: string;
}

interface Battle {
  id: string;
  winner_id: string;
  loser_id: string;
  winner_name?: string;
  loser_name?: string;
  tournament_name: string | null;
  battle_date: string | null;
  round?: string;
  match_position?: number;
  judge_votes?: JudgeVote[];
  category?: string;
}

export default function WorldRanking() {
  const navigate = useNavigate();
  const [dancers, setDancers] = useState<RankedDancer[]>([]);
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [activeTab, setActiveTab] = useState<'bboy' | 'bgirl'>('bboy');
  const [mainView, setMainView] = useState<'ranking' | 'tournaments'>('ranking');
  const [battleInput, setBattleInput] = useState('');
  const [selectedDancer, setSelectedDancer] = useState<RankedDancer | null>(null);
  const [showAddBattles, setShowAddBattles] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [highlightDancer, setHighlightDancer] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const [dancersRes, battlesRes] = await Promise.all([
      supabase.from('ranking_dancers').select('*').order('pagerank_score', { ascending: false }),
      supabase.from('ranking_battles').select('*')
    ]);

    if (dancersRes.data) {
      setDancers(dancersRes.data);
    }
    if (battlesRes.data) {
      // Enrich battles with dancer names and category
      const dancerMap = new Map(dancersRes.data?.map(d => [d.id, { name: d.name, category: d.category }]) || []);
      const enrichedBattles = battlesRes.data.map(b => ({
        ...b,
        winner_name: dancerMap.get(b.winner_id)?.name,
        loser_name: dancerMap.get(b.loser_id)?.name,
        category: dancerMap.get(b.winner_id)?.category,
        judge_votes: Array.isArray(b.judge_votes) ? (b.judge_votes as unknown as JudgeVote[]) : []
      }));
      setBattles(enrichedBattles);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('ranking-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_dancers' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ranking_battles' }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [loadData]);

  const recalculateRankings = async () => {
    setCalculating(true);
    
    try {
      // Get all battles
      const { data: allBattles } = await supabase.from('ranking_battles').select('*');
      const { data: allDancers } = await supabase.from('ranking_dancers').select('*');
      
      if (!allBattles || !allDancers) {
        toast.error("Failed to load data");
        return;
      }

      // Build edges for PageRank (winner -> loser means winner gains rank from loser)
      const edges = allBattles.map(b => ({
        from: b.loser_id,  // Loser transfers rank to winner
        to: b.winner_id,
        weight: 1
      }));

      // Calculate PageRank
      const ranks = calculatePageRank(edges);

      // Count wins/losses for each dancer
      const winsMap = new Map<string, number>();
      const lossesMap = new Map<string, number>();
      
      for (const battle of allBattles) {
        winsMap.set(battle.winner_id, (winsMap.get(battle.winner_id) || 0) + 1);
        lossesMap.set(battle.loser_id, (lossesMap.get(battle.loser_id) || 0) + 1);
      }

      // Update all dancers
      for (const dancer of allDancers) {
        const score = ranks.get(dancer.id) || 0;
        const wins = winsMap.get(dancer.id) || 0;
        const losses = lossesMap.get(dancer.id) || 0;
        
        await supabase.from('ranking_dancers').update({
          pagerank_score: score,
          wins_count: wins,
          losses_count: losses,
          battles_count: wins + losses
        }).eq('id', dancer.id);
      }

      toast.success("Rankings recalculated!");
      loadData();
    } catch (error) {
      console.error(error);
      toast.error("Failed to recalculate rankings");
    } finally {
      setCalculating(false);
    }
  };

  const getOrCreateDancer = async (name: string, category: string): Promise<string> => {
    // Check if dancer exists
    const { data: existing } = await supabase
      .from('ranking_dancers')
      .select('id')
      .eq('name', name)
      .eq('category', category)
      .single();

    if (existing) return existing.id;

    // Create new dancer
    const { data: created, error } = await supabase
      .from('ranking_dancers')
      .insert({ name, category })
      .select('id')
      .single();

    if (error) throw error;
    return created.id;
  };

  const addBattlesFromText = async () => {
    const parsed = parseBattleText(battleInput);
    if (parsed.length === 0) {
      toast.error("No valid battles found in input");
      return;
    }

    setCalculating(true);
    try {
      for (const battle of parsed) {
        // Determine category based on known names
        const isBgirl = BGIRLS.some(bg => 
          bg.toLowerCase() === battle.winner.toLowerCase() || 
          bg.toLowerCase() === battle.loser.toLowerCase()
        );
        const category = isBgirl ? 'bgirl' : 'bboy';

        const winnerId = await getOrCreateDancer(battle.winner, category);
        const loserId = await getOrCreateDancer(battle.loser, category);

        await supabase.from('ranking_battles').insert({
          winner_id: winnerId,
          loser_id: loserId,
          is_demo: false
        });
      }

      await recalculateRankings();
      setBattleInput('');
      setShowAddBattles(false);
      toast.success(`Added ${parsed.length} battles!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to add battles");
    } finally {
      setCalculating(false);
    }
  };

  const generateDemo = async () => {
    setCalculating(true);
    try {
      // Clear existing demo data
      await supabase.from('ranking_battles').delete().eq('is_demo', true);
      
      const demoData = generateDemoData();
      
      for (const battle of demoData) {
        const winnerId = await getOrCreateDancer(battle.winner, battle.category);
        const loserId = await getOrCreateDancer(battle.loser, battle.category);

        await supabase.from('ranking_battles').insert({
          winner_id: winnerId,
          loser_id: loserId,
          tournament_name: battle.tournamentName,
          battle_date: battle.tournamentDate,
          round: battle.round,
          match_position: battle.matchPosition,
          judge_votes: JSON.parse(JSON.stringify(battle.judgeVotes)),
          is_demo: true
        } as any);
      }

      await recalculateRankings();
      toast.success(`Generated demo data with ${demoData.length} battles!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate demo data");
    } finally {
      setCalculating(false);
    }
  };

  const resetDemo = async () => {
    setCalculating(true);
    try {
      // Delete demo battles
      await supabase.from('ranking_battles').delete().eq('is_demo', true);
      
      // Delete dancers with no remaining battles
      const { data: remainingBattles } = await supabase.from('ranking_battles').select('winner_id, loser_id');
      const activeDancerIds = new Set<string>();
      remainingBattles?.forEach(b => {
        activeDancerIds.add(b.winner_id);
        activeDancerIds.add(b.loser_id);
      });

      const { data: allDancers } = await supabase.from('ranking_dancers').select('id');
      for (const dancer of allDancers || []) {
        if (!activeDancerIds.has(dancer.id)) {
          await supabase.from('ranking_dancers').delete().eq('id', dancer.id);
        }
      }

      await recalculateRankings();
      toast.success("Demo data reset!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to reset demo data");
    } finally {
      setCalculating(false);
    }
  };

  const filteredDancers = dancers
    .filter(d => d.category === activeTab)
    .sort((a, b) => b.pagerank_score - a.pagerank_score);

  const getDancerBattles = (dancerId: string) => {
    return battles.filter(b => b.winner_id === dancerId || b.loser_id === dancerId);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-mono">{rank}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-display font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Dominance Graph Ranking
                </h1>
                <p className="text-sm text-muted-foreground">Pure head-to-head PageRank</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={recalculateRankings}
                disabled={calculating}
              >
                {calculating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="hidden sm:inline ml-2">Recalculate</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Demo Controls */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-lg font-display font-semibold flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Quick Start
              </h2>
              <p className="text-sm text-muted-foreground">Generate demo data or add your own battles</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={generateDemo} disabled={calculating} className="bg-primary">
                <Zap className="w-4 h-4 mr-2" />
                Generate Demo
              </Button>
              <Button variant="outline" onClick={resetDemo} disabled={calculating}>
                <Trash2 className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Dialog open={showAddBattles} onOpenChange={setShowAddBattles}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Battles
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Swords className="w-5 h-5" />
                      Add Battle Results
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Enter one battle per line. Supported formats:
                      </p>
                      <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
                        <li>"Phil Wizard beat Victor"</li>
                        <li>"Shigekix &gt; Menno"</li>
                        <li>"Ami defeated Ayumi"</li>
                      </ul>
                    </div>
                    <Textarea
                      value={battleInput}
                      onChange={(e) => setBattleInput(e.target.value)}
                      placeholder="Phil Wizard beat Victor&#10;Shigekix > Menno&#10;Ami defeated Ayumi"
                      className="min-h-[200px] font-mono text-sm"
                    />
                    <Button 
                      onClick={addBattlesFromText} 
                      className="w-full"
                      disabled={calculating || !battleInput.trim()}
                    >
                      {calculating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Add Battles
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="p-4 text-center">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{dancers.length}</div>
            <div className="text-xs text-muted-foreground">Dancers</div>
          </Card>
          <Card className="p-4 text-center">
            <Swords className="w-6 h-6 mx-auto mb-2 text-secondary" />
            <div className="text-2xl font-bold">{battles.length}</div>
            <div className="text-xs text-muted-foreground">Battles</div>
          </Card>
          <Card className="p-4 text-center">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">
              {new Set(battles.map(b => b.tournament_name).filter(Boolean)).size}
            </div>
            <div className="text-xs text-muted-foreground">Events</div>
          </Card>
        </div>

        {/* Main View Tabs */}
        <Tabs value={mainView} onValueChange={(v) => setMainView(v as 'ranking' | 'tournaments')} className="mb-6">
          <TabsList className="w-full max-w-md mx-auto">
            <TabsTrigger value="ranking" className="flex-1">
              <TrendingUp className="w-4 h-4 mr-2" />
              Ranking
            </TabsTrigger>
            <TabsTrigger value="tournaments" className="flex-1">
              <Trophy className="w-4 h-4 mr-2" />
              Tournaments
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {mainView === 'ranking' ? (
          <>
            {/* Graph Visualization */}
            <div className="mb-6">
              <BattleGraph
                dancers={dancers}
                battles={battles}
                category={activeTab}
                onSelectDancer={setSelectedDancer}
              />
            </div>

            {/* Leaderboard */}
            <Card className="overflow-hidden">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'bboy' | 'bgirl')}>
                <div className="px-4 pt-4 border-b border-border/50">
                  <TabsList className="w-full max-w-xs">
                    <TabsTrigger value="bboy" className="flex-1">
                      <span className="mr-2">🏆</span> B-Boys
                    </TabsTrigger>
                    <TabsTrigger value="bgirl" className="flex-1">
                      <span className="mr-2">👑</span> B-Girls
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="bboy" className="mt-0">
                  <LeaderboardList 
                    dancers={filteredDancers} 
                    getRankIcon={getRankIcon}
                    onSelectDancer={setSelectedDancer}
                  />
                </TabsContent>
                <TabsContent value="bgirl" className="mt-0">
                  <LeaderboardList 
                    dancers={filteredDancers} 
                    getRankIcon={getRankIcon}
                    onSelectDancer={setSelectedDancer}
                  />
                </TabsContent>
              </Tabs>
            </Card>
          </>
        ) : (
          <RankingTournamentView 
            battles={battles}
            onSelectDancer={(dancerName) => {
              const dancer = dancers.find(d => d.name === dancerName);
              if (dancer) setSelectedDancer(dancer);
            }}
          />
        )}

        {/* Dancer Profile Dialog */}
        <Dialog open={!!selectedDancer} onOpenChange={() => setSelectedDancer(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            {selectedDancer && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="text-xl">{selectedDancer.name}</div>
                      <Badge variant="outline" className="mt-1">
                        {selectedDancer.category === 'bboy' ? 'B-Boy' : 'B-Girl'}
                      </Badge>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="grid grid-cols-3 gap-3 my-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <div className="text-xl font-bold text-primary">
                      {selectedDancer.pagerank_score.toFixed(1)}
                    </div>
                    <div className="text-xs text-muted-foreground">Score</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-500/10">
                    <div className="text-xl font-bold text-green-500">
                      {selectedDancer.wins_count}
                    </div>
                    <div className="text-xs text-muted-foreground">Wins</div>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-500/10">
                    <div className="text-xl font-bold text-red-500">
                      {selectedDancer.losses_count}
                    </div>
                    <div className="text-xs text-muted-foreground">Losses</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Swords className="w-4 h-4" />
                    Battle History
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {getDancerBattles(selectedDancer.id).map((battle, idx) => {
                      const isWinner = battle.winner_id === selectedDancer.id;
                      return (
                        <div 
                          key={idx}
                          className={`p-3 rounded-lg border ${
                            isWinner 
                              ? 'bg-green-500/5 border-green-500/20' 
                              : 'bg-red-500/5 border-red-500/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant={isWinner ? "default" : "destructive"} className="text-xs">
                                {isWinner ? 'W' : 'L'}
                              </Badge>
                              <span className="font-medium">
                                vs {isWinner ? battle.loser_name : battle.winner_name}
                              </span>
                            </div>
                            {battle.round && (
                              <Badge variant="outline" className="text-xs">
                                {battle.round}
                              </Badge>
                            )}
                          </div>
                          {battle.tournament_name && (
                            <button
                              className="text-xs text-primary hover:underline mt-1 text-left"
                              onClick={() => {
                                setHighlightDancer(selectedDancer.name);
                                setSelectedTournament(battle.tournament_name);
                              }}
                            >
                              📋 {battle.tournament_name} →
                            </button>
                          )}
                          {battle.judge_votes && battle.judge_votes.length > 0 && (
                            <div className="flex items-center gap-1 mt-2">
                              <span className="text-xs text-muted-foreground">Judges:</span>
                              <Badge variant="secondary" className="text-xs">
                                {battle.judge_votes.filter(v => v.votedFor === battle.winner_name).length}-
                                {battle.judge_votes.filter(v => v.votedFor === battle.loser_name).length}
                              </Badge>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {getDancerBattles(selectedDancer.id).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No battles recorded
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Tournament Bracket Dialog */}
        <TournamentBracketDialog
          open={!!selectedTournament}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTournament(null);
              setHighlightDancer(null);
            }
          }}
          tournamentName={selectedTournament || ""}
          battles={battles.filter(b => b.tournament_name === selectedTournament)}
          highlightDancerName={highlightDancer || undefined}
          onSelectDancer={(name) => {
            const dancer = dancers.find(d => d.name === name);
            if (dancer) {
              setSelectedTournament(null);
              setHighlightDancer(null);
              setSelectedDancer(dancer);
            }
          }}
        />
      </main>
    </div>
  );
}

function LeaderboardList({ 
  dancers, 
  getRankIcon,
  onSelectDancer
}: { 
  dancers: RankedDancer[]; 
  getRankIcon: (rank: number) => React.ReactNode;
  onSelectDancer: (dancer: RankedDancer) => void;
}) {
  if (dancers.length === 0) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>No dancers ranked yet</p>
        <p className="text-sm">Generate demo data or add battles to get started</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium text-muted-foreground bg-muted/30">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Name</div>
        <div className="col-span-2 text-center">Score</div>
        <div className="col-span-2 text-center">W/L</div>
        <div className="col-span-2 text-center">Battles</div>
      </div>

      {/* Rows */}
      {dancers.map((dancer, idx) => (
        <div 
          key={dancer.id}
          onClick={() => onSelectDancer(dancer)}
          className={`grid grid-cols-12 gap-2 px-4 py-3 items-center cursor-pointer hover:bg-muted/50 transition-colors ${
            idx < 3 ? 'bg-gradient-to-r from-primary/5 to-transparent' : ''
          }`}
        >
          <div className="col-span-1">
            {getRankIcon(idx + 1)}
          </div>
          <div className="col-span-5 font-medium truncate">
            {dancer.name}
          </div>
          <div className="col-span-2 text-center">
            <Badge variant="outline" className="font-mono">
              {dancer.pagerank_score.toFixed(1)}
            </Badge>
          </div>
          <div className="col-span-2 text-center text-sm">
            <span className="text-green-500">{dancer.wins_count}</span>
            <span className="text-muted-foreground">/</span>
            <span className="text-red-500">{dancer.losses_count}</span>
          </div>
          <div className="col-span-2 flex items-center justify-center gap-1">
            <span className="text-sm text-muted-foreground">{dancer.battles_count}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      ))}
    </div>
  );
}

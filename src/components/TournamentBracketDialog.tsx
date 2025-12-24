import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Crown, Award } from "lucide-react";

interface JudgeVote {
  judgeName: string;
  votedFor: string;
}

interface TournamentBattle {
  id: string;
  winner_id: string;
  loser_id: string;
  winner_name?: string;
  loser_name?: string;
  tournament_name: string | null;
  round?: string;
  match_position?: number;
  judge_votes?: JudgeVote[];
  category?: string;
}

interface TournamentBracketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentName: string;
  battles: TournamentBattle[];
  highlightDancerName?: string;
  onSelectDancer?: (dancerName: string) => void;
}

const ROUND_ORDER = ["Top 32", "Top 16", "Quarter-Final", "Semi-Final", "Final"];

function BracketView({ 
  battles, 
  highlightDancerName, 
  onSelectDancer 
}: { 
  battles: TournamentBattle[];
  highlightDancerName?: string;
  onSelectDancer?: (name: string) => void;
}) {
  const roundsData = useMemo(() => {
    const rounds = new Map<string, TournamentBattle[]>();
    
    for (const battle of battles) {
      const round = battle.round || "Unknown";
      if (!rounds.has(round)) {
        rounds.set(round, []);
      }
      rounds.get(round)!.push(battle);
    }
    
    return ROUND_ORDER
      .filter(r => rounds.has(r))
      .map(roundName => ({
        name: roundName,
        battles: rounds.get(roundName)!.sort((a, b) => (a.match_position || 0) - (b.match_position || 0))
      }));
  }, [battles]);

  const winner = useMemo(() => {
    const finalBattle = battles.find(b => b.round === "Final");
    return finalBattle?.winner_name || null;
  }, [battles]);

  const isHighlighted = (name?: string) => highlightDancerName && name === highlightDancerName;
  const hasRoundData = roundsData.some(r => r.name !== "Unknown");

  if (battles.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No battles in this category
      </div>
    );
  }

  if (!hasRoundData) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground mb-3">
          No bracket data available. Showing battle list:
        </p>
        {battles.map((battle) => (
          <div 
            key={battle.id}
            className="flex items-center gap-3 p-2 rounded-lg border border-border/50 bg-card"
          >
            <div 
              className={`flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 cursor-pointer hover:bg-green-500/20 ${
                isHighlighted(battle.winner_name) ? "ring-1 ring-primary" : ""
              }`}
              onClick={() => battle.winner_name && onSelectDancer?.(battle.winner_name)}
            >
              <Crown className="w-3 h-3 text-green-500" />
              <span className="text-sm font-medium">{battle.winner_name}</span>
            </div>
            <span className="text-muted-foreground text-sm">beat</span>
            <div 
              className={`px-2 py-1 rounded bg-muted/50 cursor-pointer hover:bg-muted ${
                isHighlighted(battle.loser_name) ? "ring-1 ring-primary" : ""
              }`}
              onClick={() => battle.loser_name && onSelectDancer?.(battle.loser_name)}
            >
              <span className="text-sm">{battle.loser_name}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-2 min-w-max">
        {roundsData.map((round, roundIdx) => {
          const isLast = roundIdx === roundsData.length - 1;
          
          return (
            <div key={round.name} className="flex flex-col">
              <div className="text-center mb-2 sticky top-0 bg-background z-10 pb-1">
                <Badge 
                  variant={round.name === "Final" ? "default" : "outline"}
                  className={round.name === "Final" ? "bg-primary" : ""}
                >
                  {round.name}
                </Badge>
              </div>

              <div 
                className="flex flex-col justify-around flex-1 gap-1"
                style={{ minHeight: round.battles.length * 80 + (round.battles.length - 1) * 8 }}
              >
                {round.battles.map((battle) => {
                  const winnerVotes = battle.judge_votes?.filter(v => v.votedFor === battle.winner_name).length || 0;
                  const loserVotes = battle.judge_votes?.filter(v => v.votedFor === battle.loser_name).length || 0;
                  const hasVotes = battle.judge_votes && battle.judge_votes.length > 0;
                  
                  return (
                    <div key={battle.id} className="relative flex items-center">
                      <div 
                        className={`w-44 rounded-lg border overflow-hidden ${
                          round.name === "Final" 
                            ? "border-primary/50 bg-primary/5 ring-2 ring-primary/20" 
                            : "border-border/50 bg-card"
                        }`}
                      >
                        <div 
                          className={`flex items-center justify-between px-2 py-1.5 border-b border-border/30 cursor-pointer hover:bg-muted/50 transition-colors ${
                            isHighlighted(battle.winner_name) ? "bg-primary/20" : "bg-green-500/10"
                          }`}
                          onClick={() => battle.winner_name && onSelectDancer?.(battle.winner_name)}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Crown className="w-3 h-3 text-green-500 flex-shrink-0" />
                            <span className="text-xs font-medium truncate">{battle.winner_name}</span>
                          </div>
                          {hasVotes && (
                            <Badge variant="secondary" className="text-[10px] px-1 h-4 bg-green-500/20 text-green-600">
                              {winnerVotes}
                            </Badge>
                          )}
                        </div>
                        
                        <div 
                          className={`flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-muted/50 transition-colors ${
                            isHighlighted(battle.loser_name) ? "bg-primary/20" : ""
                          }`}
                          onClick={() => battle.loser_name && onSelectDancer?.(battle.loser_name)}
                        >
                          <span className="text-xs text-muted-foreground truncate">{battle.loser_name}</span>
                          {hasVotes && (
                            <Badge variant="outline" className="text-[10px] px-1 h-4">{loserVotes}</Badge>
                          )}
                        </div>
                      </div>

                      {!isLast && <div className="w-4 h-px bg-border/50 flex-shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {winner && (
          <div className="flex flex-col justify-center items-center pl-2">
            <div className="w-20 p-3 rounded-lg bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 text-center">
              <Trophy className="w-6 h-6 mx-auto text-yellow-500 mb-1" />
              <div className="text-xs font-bold text-yellow-600 truncate">{winner}</div>
              <div className="text-[10px] text-muted-foreground">Champion</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function TournamentBracketDialog({
  open,
  onOpenChange,
  tournamentName,
  battles,
  highlightDancerName,
  onSelectDancer
}: TournamentBracketDialogProps) {
  const [activeCategory, setActiveCategory] = useState<'bboy' | 'bgirl'>('bboy');

  // Filter battles by category
  const bboyBattles = useMemo(() => battles.filter(b => b.category === 'bboy'), [battles]);
  const bgirlBattles = useMemo(() => battles.filter(b => b.category === 'bgirl'), [battles]);
  
  const hasBboys = bboyBattles.length > 0;
  const hasBgirls = bgirlBattles.length > 0;

  // Get unique judges from all battles
  const judges = useMemo(() => {
    const judgeSet = new Set<string>();
    for (const battle of battles) {
      if (battle.judge_votes) {
        for (const vote of battle.judge_votes) {
          judgeSet.add(vote.judgeName);
        }
      }
    }
    return Array.from(judgeSet);
  }, [battles]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2 border-b border-border/50">
          <DialogTitle className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <div className="text-lg">{tournamentName}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {battles.length} battles
                </Badge>
                {hasBboys && (
                  <Badge variant="secondary" className="text-xs">
                    🏆 {bboyBattles.length} B-Boy
                  </Badge>
                )}
                {hasBgirls && (
                  <Badge variant="secondary" className="text-xs">
                    👑 {bgirlBattles.length} B-Girl
                  </Badge>
                )}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Tournament bracket with battle results
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 pb-0">
          {/* Judges Panel */}
          {judges.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 flex-wrap">
                <Award className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Judges:</span>
                {judges.map(judge => (
                  <Badge key={judge} variant="secondary" className="text-xs">
                    {judge}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Category Tabs */}
          {hasBboys && hasBgirls ? (
            <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as 'bboy' | 'bgirl')}>
              <TabsList className="w-full max-w-xs mb-4">
                <TabsTrigger value="bboy" className="flex-1">
                  🏆 B-Boys
                </TabsTrigger>
                <TabsTrigger value="bgirl" className="flex-1">
                  👑 B-Girls
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="max-h-[55vh]">
                <TabsContent value="bboy" className="mt-0">
                  <BracketView 
                    battles={bboyBattles}
                    highlightDancerName={highlightDancerName}
                    onSelectDancer={onSelectDancer}
                  />
                </TabsContent>
                <TabsContent value="bgirl" className="mt-0">
                  <BracketView 
                    battles={bgirlBattles}
                    highlightDancerName={highlightDancerName}
                    onSelectDancer={onSelectDancer}
                  />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          ) : (
            <ScrollArea className="max-h-[60vh]">
              <BracketView 
                battles={hasBboys ? bboyBattles : bgirlBattles}
                highlightDancerName={highlightDancerName}
                onSelectDancer={onSelectDancer}
              />
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

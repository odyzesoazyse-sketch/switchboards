import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Crown, User, Check, Award, ChevronDown, ChevronUp } from "lucide-react";

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

export function TournamentBracketDialog({
  open,
  onOpenChange,
  tournamentName,
  battles,
  highlightDancerName,
  onSelectDancer
}: TournamentBracketDialogProps) {
  const [expandedBattle, setExpandedBattle] = useState<string | null>(null);

  // Organize battles by round
  const roundsData = useMemo(() => {
    const rounds = new Map<string, TournamentBattle[]>();
    
    for (const battle of battles) {
      const round = battle.round || "Unknown";
      if (!rounds.has(round)) {
        rounds.set(round, []);
      }
      rounds.get(round)!.push(battle);
    }
    
    // Sort by round order
    return ROUND_ORDER
      .filter(r => rounds.has(r))
      .map(roundName => ({
        name: roundName,
        battles: rounds.get(roundName)!.sort((a, b) => (a.match_position || 0) - (b.match_position || 0))
      }));
  }, [battles]);

  // Get unique judges
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

  // Find winner (final battle winner)
  const winner = useMemo(() => {
    const finalBattle = battles.find(b => b.round === "Final");
    return finalBattle?.winner_name || null;
  }, [battles]);

  const isHighlighted = (name?: string) => highlightDancerName && name === highlightDancerName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-primary" />
            <div>
              <div>{tournamentName}</div>
              {winner && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                    <Crown className="w-3 h-3 mr-1" />
                    Champion: {winner}
                  </Badge>
                </div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[75vh] px-6 pb-6">
          {/* Judges Panel */}
          {judges.length > 0 && (
            <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/50">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Award className="w-4 h-4" />
                Judges Panel
              </h4>
              <div className="flex flex-wrap gap-2">
                {judges.map(judge => (
                  <Badge key={judge} variant="secondary">
                    {judge}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Bracket Visualization */}
          <div className="space-y-1">
            {roundsData.map((round, roundIdx) => (
              <div key={round.name} className="relative">
                {/* Round Header */}
                <div className="sticky top-0 z-10 py-2 bg-background/95 backdrop-blur">
                  <Badge 
                    variant={round.name === "Final" ? "default" : "outline"}
                    className={`${round.name === "Final" ? "bg-primary" : ""}`}
                  >
                    {round.name}
                  </Badge>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {round.battles.length} {round.battles.length === 1 ? 'battle' : 'battles'}
                  </span>
                </div>

                {/* Battles Grid */}
                <div className={`grid gap-2 ${
                  round.battles.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 
                  round.battles.length <= 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' :
                  'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                }`}>
                  {round.battles.map((battle) => {
                    const isExpanded = expandedBattle === battle.id;
                    const winnerVotes = battle.judge_votes?.filter(v => v.votedFor === battle.winner_name).length || 0;
                    const loserVotes = battle.judge_votes?.filter(v => v.votedFor === battle.loser_name).length || 0;
                    
                    return (
                      <div
                        key={battle.id}
                        className={`rounded-lg border transition-all ${
                          round.name === "Final" 
                            ? "border-primary/50 bg-primary/5" 
                            : "border-border/50 bg-card"
                        } ${isExpanded ? "ring-2 ring-primary/30" : ""}`}
                      >
                        {/* Match Header */}
                        <div 
                          className="p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setExpandedBattle(isExpanded ? null : battle.id)}
                        >
                          {/* Winner */}
                          <div 
                            className={`flex items-center justify-between p-2 rounded-md mb-1 ${
                              isHighlighted(battle.winner_name) 
                                ? "bg-primary/20 ring-1 ring-primary" 
                                : "bg-green-500/10"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <Crown className="w-3 h-3 text-green-500" />
                              <button
                                className="font-medium text-sm hover:underline text-left"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (battle.winner_name && onSelectDancer) {
                                    onSelectDancer(battle.winner_name);
                                  }
                                }}
                              >
                                {battle.winner_name}
                              </button>
                            </div>
                            {battle.judge_votes && battle.judge_votes.length > 0 && (
                              <Badge variant="secondary" className="bg-green-500/20 text-green-600 text-xs">
                                {winnerVotes}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Loser */}
                          <div 
                            className={`flex items-center justify-between p-2 rounded-md ${
                              isHighlighted(battle.loser_name) 
                                ? "bg-primary/20 ring-1 ring-primary" 
                                : "bg-muted/50"
                            }`}
                          >
                            <button
                              className="text-sm text-muted-foreground hover:underline text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (battle.loser_name && onSelectDancer) {
                                  onSelectDancer(battle.loser_name);
                                }
                              }}
                            >
                              {battle.loser_name}
                            </button>
                            {battle.judge_votes && battle.judge_votes.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {loserVotes}
                              </Badge>
                            )}
                          </div>

                          {/* Expand indicator */}
                          {battle.judge_votes && battle.judge_votes.length > 0 && (
                            <div className="flex justify-center pt-1">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Judge Votes (Expanded) */}
                        {isExpanded && battle.judge_votes && battle.judge_votes.length > 0 && (
                          <div className="px-3 pb-3 pt-0 border-t border-border/30">
                            <div className="text-xs font-medium text-muted-foreground mb-2 mt-2">
                              Judge Votes
                            </div>
                            <div className="space-y-1">
                              {battle.judge_votes.map((vote, idx) => (
                                <div 
                                  key={idx}
                                  className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30"
                                >
                                  <span className="text-muted-foreground">{vote.judgeName}</span>
                                  <Badge 
                                    variant={vote.votedFor === battle.winner_name ? "default" : "outline"}
                                    className={`text-xs ${
                                      vote.votedFor === battle.winner_name 
                                        ? "bg-green-500/20 text-green-600" 
                                        : ""
                                    }`}
                                  >
                                    <Check className="w-2 h-2 mr-1" />
                                    {vote.votedFor}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Connector lines between rounds (visual only) */}
                {roundIdx < roundsData.length - 1 && (
                  <div className="flex justify-center py-2">
                    <div className="w-px h-4 bg-border/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

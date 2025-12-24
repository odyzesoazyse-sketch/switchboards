import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Trophy, Calendar, Users, ChevronRight, Crown, 
  User, Check, X, Award
} from "lucide-react";

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

interface TournamentGroup {
  name: string;
  battles: TournamentBattle[];
  date?: string;
}

interface RankingTournamentViewProps {
  battles: TournamentBattle[];
  onSelectDancer?: (dancerName: string) => void;
}

export function RankingTournamentView({ battles, onSelectDancer }: RankingTournamentViewProps) {
  const [selectedTournament, setSelectedTournament] = useState<TournamentGroup | null>(null);
  const [selectedBattle, setSelectedBattle] = useState<TournamentBattle | null>(null);

  // Group battles by tournament
  const tournaments: TournamentGroup[] = [];
  const tournamentMap = new Map<string, TournamentBattle[]>();
  
  for (const battle of battles) {
    const name = battle.tournament_name || "Unknown Tournament";
    if (!tournamentMap.has(name)) {
      tournamentMap.set(name, []);
    }
    tournamentMap.get(name)!.push(battle);
  }
  
  tournamentMap.forEach((battlesInTournament, name) => {
    tournaments.push({ name, battles: battlesInTournament });
  });

  // Sort tournaments by date (newest first)
  tournaments.sort((a, b) => b.name.localeCompare(a.name));

  const getRoundOrder = (round?: string): number => {
    if (!round) return 99;
    if (round === "Final") return 1;
    if (round === "Semi-Final") return 2;
    if (round === "Quarter-Final") return 3;
    if (round === "Top 16") return 4;
    if (round === "Top 32") return 5;
    return 99;
  };

  const organizeByRounds = (battlesInTournament: TournamentBattle[]) => {
    const rounds = new Map<string, TournamentBattle[]>();
    
    for (const battle of battlesInTournament) {
      const round = battle.round || "Unknown";
      if (!rounds.has(round)) {
        rounds.set(round, []);
      }
      rounds.get(round)!.push(battle);
    }
    
    // Sort rounds
    return Array.from(rounds.entries()).sort((a, b) => getRoundOrder(a[0]) - getRoundOrder(b[0]));
  };

  const getUniqueJudges = (battlesInTournament: TournamentBattle[]): string[] => {
    const judges = new Set<string>();
    for (const battle of battlesInTournament) {
      if (battle.judge_votes) {
        for (const vote of battle.judge_votes) {
          judges.add(vote.judgeName);
        }
      }
    }
    return Array.from(judges);
  };

  const getWinner = (battlesInTournament: TournamentBattle[]): string | null => {
    // Find the final battle
    const finalBattle = battlesInTournament.find(b => b.round === "Final");
    return finalBattle?.winner_name || null;
  };

  return (
    <>
      <div className="space-y-3">
        {tournaments.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tournaments yet</p>
            <p className="text-sm">Generate demo data or add battles to see tournaments</p>
          </Card>
        ) : (
          tournaments.map((tournament) => {
            const winner = getWinner(tournament.battles);
            const judges = getUniqueJudges(tournament.battles);
            
            return (
              <Card 
                key={tournament.name}
                className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => setSelectedTournament(tournament)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{tournament.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {tournament.battles.length} battles
                        </span>
                        {judges.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {judges.length} judges
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {winner && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                        <Crown className="w-3 h-3 mr-1" />
                        {winner}
                      </Badge>
                    )}
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Tournament Detail Dialog */}
      <Dialog open={!!selectedTournament} onOpenChange={() => setSelectedTournament(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh]">
          {selectedTournament && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-primary" />
                  {selectedTournament.name}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Tournament details and bracket
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[65vh] pr-4">
                {/* Judges Panel */}
                {getUniqueJudges(selectedTournament.battles).length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Judges
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {getUniqueJudges(selectedTournament.battles).map(judge => (
                        <Badge key={judge} variant="secondary">
                          {judge}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bracket by Rounds */}
                <div className="space-y-6">
                  {organizeByRounds(selectedTournament.battles).map(([round, roundBattles]) => (
                    <div key={round}>
                      <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Badge variant={round === "Final" ? "default" : "outline"}>
                          {round}
                        </Badge>
                        <span className="text-muted-foreground">
                          {roundBattles.length} {roundBattles.length === 1 ? 'battle' : 'battles'}
                        </span>
                      </h4>
                      
                      <div className="grid gap-2">
                        {roundBattles.map((battle) => (
                          <Card 
                            key={battle.id}
                            className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => setSelectedBattle(battle)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-500 cursor-pointer hover:bg-green-500/20"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (battle.winner_name && onSelectDancer) {
                                        onSelectDancer(battle.winner_name);
                                      }
                                    }}
                                  >
                                    <Crown className="w-3 h-3" />
                                    <span className="font-medium">{battle.winner_name}</span>
                                  </div>
                                  <span className="text-muted-foreground">vs</span>
                                  <div 
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted cursor-pointer hover:bg-muted/80"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (battle.loser_name && onSelectDancer) {
                                        onSelectDancer(battle.loser_name);
                                      }
                                    }}
                                  >
                                    <span>{battle.loser_name}</span>
                                  </div>
                                </div>
                              </div>
                              {battle.judge_votes && battle.judge_votes.length > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  {battle.judge_votes.filter(v => v.votedFor === battle.winner_name).length}-
                                  {battle.judge_votes.filter(v => v.votedFor === battle.loser_name).length}
                                </Badge>
                              )}
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Battle Detail Dialog (Judge Votes) */}
      <Dialog open={!!selectedBattle} onOpenChange={() => setSelectedBattle(null)}>
        <DialogContent className="max-w-md">
          {selectedBattle && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-green-500">{selectedBattle.winner_name}</span>
                  <span className="text-muted-foreground">vs</span>
                  <span>{selectedBattle.loser_name}</span>
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Battle details and judge votes
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <Badge variant="outline">{selectedBattle.round}</Badge>
                  <span className="text-muted-foreground">
                    {selectedBattle.tournament_name}
                  </span>
                </div>

                {selectedBattle.judge_votes && selectedBattle.judge_votes.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      Judge Votes
                    </h4>
                    <div className="space-y-1">
                      {selectedBattle.judge_votes.map((vote, idx) => (
                        <div 
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{vote.judgeName}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {vote.votedFor === selectedBattle.winner_name ? (
                              <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30">
                                <Check className="w-3 h-3 mr-1" />
                                {vote.votedFor}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                {vote.votedFor}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Final Score</span>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-green-500">
                            {selectedBattle.judge_votes.filter(v => v.votedFor === selectedBattle.winner_name).length}
                          </Badge>
                          <span>-</span>
                          <Badge variant="outline">
                            {selectedBattle.judge_votes.filter(v => v.votedFor === selectedBattle.loser_name).length}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No judge vote data available
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

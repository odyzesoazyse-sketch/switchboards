import { Card } from "@/components/ui/card";

interface BracketMatch {
  id: string;
  round: string;
  position: number;
  dancer_left_id: string | null;
  dancer_right_id: string | null;
  winner_id: string | null;
}

interface Dancer {
  id: string;
  name: string;
  city: string | null;
}

interface TournamentBracketProps {
  matches: BracketMatch[];
  dancers: Dancer[];
}

export default function TournamentBracket({ matches, dancers }: TournamentBracketProps) {
  const getDancerName = (dancerId: string | null) => {
    if (!dancerId) return "TBD";
    const dancer = dancers.find(d => d.id === dancerId);
    return dancer ? dancer.name : "?";
  };

  const getMatchesByRound = (round: string) => {
    return matches
      .filter(m => m.round === round)
      .sort((a, b) => a.position - b.position);
  };

  const round16 = getMatchesByRound("round_of_16");
  const quarters = getMatchesByRound("quarterfinal");
  const semis = getMatchesByRound("semifinal");
  const finals = getMatchesByRound("final");

  const renderMatch = (match: BracketMatch, isWinner = false) => (
    <Card
      key={match.id}
      className={`p-3 text-center space-y-2 min-w-[140px] ${
        match.winner_id ? "border-primary" : "border-border"
      } ${isWinner ? "bg-primary/10" : ""}`}
    >
      <div
        className={`font-semibold text-sm ${
          match.winner_id === match.dancer_left_id ? "text-primary" : ""
        }`}
      >
        {getDancerName(match.dancer_left_id)}
      </div>
      <div className="text-xs text-muted-foreground">VS</div>
      <div
        className={`font-semibold text-sm ${
          match.winner_id === match.dancer_right_id ? "text-primary" : ""
        }`}
      >
        {getDancerName(match.dancer_right_id)}
      </div>
    </Card>
  );

  return (
    <div className="w-full overflow-x-auto py-8">
      <div className="min-w-[1200px] flex items-center justify-center gap-8">
        {/* Round of 16 - Left Side */}
        {round16.length > 0 && (
          <div className="flex flex-col gap-12 justify-center">
            <div className="text-center font-bold text-sm text-muted-foreground mb-2">
              ROUND OF 16
            </div>
            <div className="flex flex-col gap-12">
              {round16.slice(0, Math.ceil(round16.length / 2)).map(match => renderMatch(match))}
            </div>
          </div>
        )}

        {/* Quarterfinals - Left Side */}
        {quarters.length > 0 && (
          <div className="flex flex-col gap-24 justify-center">
            <div className="text-center font-bold text-sm text-muted-foreground mb-2">
              QUARTERFINAL
            </div>
            <div className="flex flex-col gap-24">
              {quarters.slice(0, Math.ceil(quarters.length / 2)).map(match => renderMatch(match))}
            </div>
          </div>
        )}

        {/* Semifinals - Left */}
        {semis.length > 0 && semis.length >= 1 && (
          <div className="flex flex-col justify-center">
            <div className="text-center font-bold text-sm text-muted-foreground mb-8">
              SEMIFINAL
            </div>
            <div className="flex flex-col gap-48">
              {semis.slice(0, 1).map(match => renderMatch(match))}
            </div>
          </div>
        )}

        {/* Finals */}
        {finals.length > 0 && (
          <div className="flex flex-col justify-center">
            <div className="text-center font-bold text-sm text-muted-foreground mb-8">
              FINAL
            </div>
            <div className="flex flex-col">
              {finals.map(match => renderMatch(match, true))}
            </div>
          </div>
        )}

        {/* Semifinals - Right */}
        {semis.length > 1 && (
          <div className="flex flex-col justify-center">
            <div className="h-8" />
            <div className="flex flex-col gap-48">
              {semis.slice(1, 2).map(match => renderMatch(match))}
            </div>
          </div>
        )}

        {/* Quarterfinals - Right Side */}
        {quarters.length > Math.ceil(quarters.length / 2) && (
          <div className="flex flex-col gap-24 justify-center">
            <div className="h-8" />
            <div className="flex flex-col gap-24">
              {quarters.slice(Math.ceil(quarters.length / 2)).map(match => renderMatch(match))}
            </div>
          </div>
        )}

        {/* Round of 16 - Right Side */}
        {round16.length > Math.ceil(round16.length / 2) && (
          <div className="flex flex-col gap-12 justify-center">
            <div className="h-8" />
            <div className="flex flex-col gap-12">
              {round16.slice(Math.ceil(round16.length / 2)).map(match => renderMatch(match))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

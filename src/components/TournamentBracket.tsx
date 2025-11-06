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

  const round16 = getMatchesByRound("1/8");
  const quarters = getMatchesByRound("1/4");
  const semis = getMatchesByRound("1/2");
  const finals = getMatchesByRound("final");

  const renderMatch = (match: BracketMatch, isWinner = false) => (
    <Card
      key={match.id}
      className={`p-3 text-center space-y-2 ${
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
          <div className="flex flex-col gap-12">
            <div className="text-center font-bold text-sm text-muted-foreground mb-2">
              1/8 ФИНАЛА
            </div>
            {round16.slice(0, Math.ceil(round16.length / 2)).map(match => renderMatch(match))}
          </div>
        )}

        {/* Quarterfinals - Left Side */}
        {quarters.length > 0 && (
          <div className="flex flex-col gap-24">
            <div className="text-center font-bold text-sm text-muted-foreground mb-2">
              1/4 ФИНАЛА
            </div>
            {quarters.slice(0, Math.ceil(quarters.length / 2)).map(match => renderMatch(match))}
          </div>
        )}

        {/* Semifinals */}
        {semis.length > 0 && (
          <div className="flex flex-col gap-48">
            <div className="text-center font-bold text-sm text-muted-foreground mb-2">
              ПОЛУФИНАЛ
            </div>
            {semis.map(match => renderMatch(match))}
          </div>
        )}

        {/* Finals */}
        {finals.length > 0 && (
          <div className="flex flex-col gap-96">
            <div className="text-center font-bold text-sm text-muted-foreground mb-2">
              ФИНАЛ
            </div>
            {finals.map(match => renderMatch(match, true))}
          </div>
        )}

        {/* Semifinals - Right */}
        {semis.length > 0 && (
          <div className="flex flex-col gap-48">
            <div className="h-8" />
            {/* Empty space for alignment */}
          </div>
        )}

        {/* Quarterfinals - Right Side */}
        {quarters.length > 0 && (
          <div className="flex flex-col gap-24">
            <div className="h-8" />
            {quarters.slice(Math.ceil(quarters.length / 2)).map(match => renderMatch(match))}
          </div>
        )}

        {/* Round of 16 - Right Side */}
        {round16.length > 0 && (
          <div className="flex flex-col gap-12">
            <div className="h-8" />
            {round16.slice(Math.ceil(round16.length / 2)).map(match => renderMatch(match))}
          </div>
        )}
      </div>
    </div>
  );
}

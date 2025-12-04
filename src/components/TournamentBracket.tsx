import { Card } from "@/components/ui/card";
import { Trophy, User } from "lucide-react";

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
  photo_url?: string | null;
}

interface TournamentBracketProps {
  matches: BracketMatch[];
  dancers: Dancer[];
  layout?: "symmetric" | "linear";
  activeMatchId?: string | null;
  isLightTheme?: boolean;
}

const ROUND_ORDER = ["round_of_16", "quarterfinal", "semifinal", "final"];
const ROUND_LABELS: Record<string, string> = {
  round_of_16: "1/8",
  quarterfinal: "1/4",
  semifinal: "1/2",
  final: "FINAL",
};

export default function TournamentBracket({ 
  matches, 
  dancers, 
  layout = "symmetric",
  activeMatchId,
  isLightTheme = false 
}: TournamentBracketProps) {
  const getDancer = (dancerId: string | null): Dancer | null => {
    if (!dancerId) return null;
    return dancers.find(d => d.id === dancerId) || null;
  };

  const getDancerName = (dancerId: string | null) => {
    const dancer = getDancer(dancerId);
    return dancer ? dancer.name : "TBD";
  };

  const getMatchesByRound = (round: string) => {
    return matches
      .filter(m => m.round === round)
      .sort((a, b) => a.position - b.position);
  };

  const roundsData = ROUND_ORDER.map(round => ({
    key: round,
    label: ROUND_LABELS[round],
    matches: getMatchesByRound(round),
  })).filter(r => r.matches.length > 0);

  const textColor = isLightTheme ? "text-gray-900" : "text-white";
  const mutedColor = isLightTheme ? "text-gray-500" : "text-white/50";
  const cardBg = isLightTheme ? "bg-white/90" : "bg-white/5";
  const cardBorder = isLightTheme ? "border-gray-200" : "border-white/10";
  const winnerBg = isLightTheme ? "bg-green-50" : "bg-green-500/20";

  const renderMatchCard = (match: BracketMatch, compact = false) => {
    const leftDancer = getDancer(match.dancer_left_id);
    const rightDancer = getDancer(match.dancer_right_id);
    const isActive = match.id === activeMatchId;
    const hasWinner = match.winner_id !== null;
    const leftWon = match.winner_id === match.dancer_left_id;
    const rightWon = match.winner_id === match.dancer_right_id;

    return (
      <Card
        key={match.id}
        className={`
          ${compact ? 'p-2' : 'p-3'} 
          ${cardBg} 
          ${isActive ? 'ring-2 ring-primary border-primary' : cardBorder}
          ${hasWinner ? winnerBg : ''}
          backdrop-blur transition-all
          ${compact ? 'min-w-[120px]' : 'min-w-[160px]'}
        `}
      >
        {/* Left/Top dancer */}
        <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-2'} ${leftWon ? 'opacity-100' : rightWon ? 'opacity-40' : ''}`}>
          <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-primary/20 flex items-center justify-center overflow-hidden shrink-0`}>
            {leftDancer?.photo_url ? (
              <img src={leftDancer.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-primary`} />
            )}
          </div>
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${textColor} truncate flex-1`}>
            {getDancerName(match.dancer_left_id)}
          </span>
          {leftWon && <Trophy className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-primary shrink-0`} />}
        </div>

        <div className={`border-t ${cardBorder} my-1`} />

        {/* Right/Bottom dancer */}
        <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-2'} ${rightWon ? 'opacity-100' : leftWon ? 'opacity-40' : ''}`}>
          <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-secondary/20 flex items-center justify-center overflow-hidden shrink-0`}>
            {rightDancer?.photo_url ? (
              <img src={rightDancer.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <User className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-secondary`} />
            )}
          </div>
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium ${textColor} truncate flex-1`}>
            {getDancerName(match.dancer_right_id)}
          </span>
          {rightWon && <Trophy className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-secondary shrink-0`} />}
        </div>
      </Card>
    );
  };

  // Linear layout: all rounds left to right
  if (layout === "linear") {
    return (
      <div className="w-full overflow-x-auto py-4">
        <div className="flex gap-4 md:gap-6 lg:gap-8 min-w-max items-start">
          {roundsData.map((round, roundIndex) => {
            // Calculate vertical spacing based on round
            const spacing = Math.pow(2, roundIndex) * 16;
            
            return (
              <div key={round.key} className="flex flex-col items-center">
                {/* Round label */}
                <div className={`text-xs font-bold ${mutedColor} mb-4 px-3 py-1 rounded-full ${isLightTheme ? 'bg-gray-100' : 'bg-white/10'}`}>
                  {round.label}
                </div>
                
                {/* Matches column */}
                <div 
                  className="flex flex-col justify-around h-full"
                  style={{ gap: `${spacing}px` }}
                >
                  {round.matches.map(match => (
                    <div key={match.id} className="relative">
                      {renderMatchCard(match, true)}
                      
                      {/* Connector line to next round */}
                      {roundIndex < roundsData.length - 1 && (
                        <div 
                          className={`absolute top-1/2 -right-4 md:-right-6 lg:-right-8 w-4 md:w-6 lg:w-8 h-0.5 ${isLightTheme ? 'bg-gray-300' : 'bg-white/20'}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Symmetric layout: left side -> final -> right side
  const halfPoint = Math.ceil(roundsData.length / 2);
  const leftRounds = roundsData.slice(0, halfPoint);
  const rightRounds = [...roundsData.slice(0, halfPoint - 1)].reverse();
  const finalRound = roundsData.find(r => r.key === "final");

  // Split matches for symmetric display
  const getHalfMatches = (matches: BracketMatch[], isLeft: boolean) => {
    const half = Math.ceil(matches.length / 2);
    return isLeft ? matches.slice(0, half) : matches.slice(half);
  };

  return (
    <div className="w-full overflow-x-auto py-4">
      <div className="flex items-center justify-center gap-2 md:gap-4 lg:gap-6 min-w-max">
        {/* Left side (first half of bracket) */}
        <div className="flex gap-2 md:gap-4 lg:gap-6 items-center">
          {leftRounds.filter(r => r.key !== "final").map((round, roundIndex) => {
            const leftMatches = getHalfMatches(round.matches, true);
            const spacing = Math.pow(2, roundIndex) * 20;
            
            return (
              <div key={`left-${round.key}`} className="flex flex-col items-center">
                <div className={`text-[10px] md:text-xs font-bold ${mutedColor} mb-3 px-2 py-0.5 rounded-full ${isLightTheme ? 'bg-gray-100' : 'bg-white/10'}`}>
                  {round.label}
                </div>
                <div 
                  className="flex flex-col justify-center"
                  style={{ gap: `${spacing}px` }}
                >
                  {leftMatches.map(match => (
                    <div key={match.id} className="relative">
                      {renderMatchCard(match, true)}
                      {/* Connector */}
                      <div className={`absolute top-1/2 -right-2 md:-right-4 lg:-right-6 w-2 md:w-4 lg:w-6 h-0.5 ${isLightTheme ? 'bg-gray-300' : 'bg-white/20'}`} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Finals (center) */}
        {finalRound && finalRound.matches.length > 0 && (
          <div className="flex flex-col items-center mx-2 md:mx-4">
            <div className={`text-xs md:text-sm font-bold text-primary mb-3 px-3 py-1 rounded-full bg-primary/20`}>
              {finalRound.label}
            </div>
            <div className="relative">
              {renderMatchCard(finalRound.matches[0], false)}
              
              {/* Winner highlight */}
              {finalRound.matches[0].winner_id && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right side (second half of bracket, mirrored) */}
        <div className="flex gap-2 md:gap-4 lg:gap-6 items-center">
          {rightRounds.map((round, roundIndex) => {
            const rightMatches = getHalfMatches(round.matches, false);
            const actualRoundIndex = rightRounds.length - 1 - roundIndex;
            const spacing = Math.pow(2, actualRoundIndex) * 20;
            
            if (rightMatches.length === 0) return null;
            
            return (
              <div key={`right-${round.key}`} className="flex flex-col items-center">
                <div className={`text-[10px] md:text-xs font-bold ${mutedColor} mb-3 px-2 py-0.5 rounded-full ${isLightTheme ? 'bg-gray-100' : 'bg-white/10'}`}>
                  {round.label}
                </div>
                <div 
                  className="flex flex-col justify-center"
                  style={{ gap: `${spacing}px` }}
                >
                  {rightMatches.map(match => (
                    <div key={match.id} className="relative">
                      {/* Connector */}
                      <div className={`absolute top-1/2 -left-2 md:-left-4 lg:-left-6 w-2 md:w-4 lg:w-6 h-0.5 ${isLightTheme ? 'bg-gray-300' : 'bg-white/20'}`} />
                      {renderMatchCard(match, true)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

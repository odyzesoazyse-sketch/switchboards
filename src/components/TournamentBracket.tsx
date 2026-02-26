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
  video_url?: string | null;
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

// Generate expected matches per round for a 16-dancer bracket
const EXPECTED_MATCHES: Record<string, number> = {
  round_of_16: 8,
  quarterfinal: 4,
  semifinal: 2,
  final: 1,
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
    return dancer ? dancer.name : "—";
  };

  const getMatchesByRound = (round: string) => {
    return matches
      .filter(m => m.round === round)
      .sort((a, b) => a.position - b.position);
  };

  // Create rounds with empty placeholder slots
  const createRoundsWithPlaceholders = () => {
    return ROUND_ORDER.map(round => {
      const existingMatches = getMatchesByRound(round);
      const expectedCount = EXPECTED_MATCHES[round];

      // Fill in placeholders for missing matches
      const allMatches: (BracketMatch | null)[] = [];
      for (let i = 1; i <= expectedCount; i++) {
        const existingMatch = existingMatches.find(m => m.position === i);
        allMatches.push(existingMatch || null);
      }

      return {
        key: round,
        label: ROUND_LABELS[round],
        matches: allMatches,
        hasMatches: existingMatches.length > 0,
      };
    });
  };

  const roundsData = createRoundsWithPlaceholders();

  // Check if we have any matches at all
  const hasAnyMatches = roundsData.some(r => r.hasMatches);

  const textColor = isLightTheme ? "text-gray-900" : "text-white";
  const mutedColor = isLightTheme ? "text-gray-500" : "text-white/50";
  const cardBg = isLightTheme ? "bg-white/90" : "bg-white/5";
  const cardBorder = isLightTheme ? "border-gray-200" : "border-white/10";
  const winnerBg = isLightTheme ? "bg-green-50" : "bg-green-500/20";
  const emptyBg = isLightTheme ? "bg-gray-50" : "bg-white/[0.02]";
  const emptyBorder = isLightTheme ? "border-dashed border-gray-300" : "border-dashed border-white/10";

  const renderMatchCard = (match: BracketMatch | null, compact = false) => {
    // Empty placeholder slot
    if (!match) {
      return (
        <Card
          className={`
            ${compact ? 'p-2' : 'p-3'} 
            ${emptyBg}
            ${emptyBorder}
            backdrop-blur transition-all
            ${compact ? 'min-w-[120px]' : 'min-w-[160px]'}
          `}
        >
          <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-2'} opacity-30`}>
            <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gray-500/20 flex items-center justify-center`}>
              <User className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-gray-500`} />
            </div>
            <span className={`${compact ? 'text-xs' : 'text-sm'} ${mutedColor}`}>TBD</span>
          </div>
          <div className={`border-t ${cardBorder} my-1 opacity-30`} />
          <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-2'} opacity-30`}>
            <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gray-500/20 flex items-center justify-center`}>
              <User className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-gray-500`} />
            </div>
            <span className={`${compact ? 'text-xs' : 'text-sm'} ${mutedColor}`}>TBD</span>
          </div>
        </Card>
      );
    }

    const leftDancer = getDancer(match.dancer_left_id);
    const rightDancer = getDancer(match.dancer_right_id);
    const isActive = match.id === activeMatchId;
    const hasWinner = match.winner_id !== null;
    const leftWon = match.winner_id === match.dancer_left_id;
    const rightWon = match.winner_id === match.dancer_right_id;
    const isEmpty = !match.dancer_left_id && !match.dancer_right_id;

    if (isEmpty) {
      return (
        <Card
          className={`
            ${compact ? 'p-2' : 'p-3'} 
            ${emptyBg}
            ${emptyBorder}
            backdrop-blur transition-all
            ${compact ? 'min-w-[120px]' : 'min-w-[160px]'}
          `}
        >
          <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-2'} opacity-40`}>
            <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-primary/10 flex items-center justify-center`}>
              <User className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-primary/50`} />
            </div>
            <span className={`${compact ? 'text-xs' : 'text-sm'} ${mutedColor}`}>Waiting...</span>
          </div>
          <div className={`border-t ${cardBorder} my-1 opacity-30`} />
          <div className={`flex items-center gap-2 ${compact ? 'py-1' : 'py-2'} opacity-40`}>
            <div className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-secondary/10 flex items-center justify-center`}>
              <User className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} text-secondary/50`} />
            </div>
            <span className={`${compact ? 'text-xs' : 'text-sm'} ${mutedColor}`}>Waiting...</span>
          </div>
        </Card>
      );
    }

    return (
      <Card
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
            {leftDancer?.video_url ? (
              <video src={leftDancer.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
            ) : leftDancer?.photo_url ? (
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
            {rightDancer?.video_url ? (
              <video src={rightDancer.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
            ) : rightDancer?.photo_url ? (
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

  // Linear layout: all rounds left to right with proper bracket alignment
  if (layout === "linear") {
    const baseMatchHeight = 80; // Height of one match card
    const baseGap = 8; // Base gap between matches in first round

    return (
      <div className="w-full overflow-x-auto py-4">
        <div className="flex gap-6 md:gap-8 lg:gap-12 min-w-max items-center">
          {roundsData.map((round, roundIndex) => {
            // Calculate spacing to center matches relative to previous round
            const matchCount = round.matches.length;
            const multiplier = Math.pow(2, roundIndex);
            const totalHeight = EXPECTED_MATCHES.round_of_16 * (baseMatchHeight + baseGap) - baseGap;
            const matchSpacing = matchCount > 1 ? (totalHeight - matchCount * baseMatchHeight) / (matchCount - 1) : 0;

            return (
              <div key={round.key} className="flex flex-col items-center">
                <div className={`text-xs font-bold ${round.hasMatches ? mutedColor : 'text-gray-400'} mb-4 px-3 py-1 rounded-full ${isLightTheme ? 'bg-gray-100' : 'bg-white/10'}`}>
                  {round.label}
                </div>

                <div
                  className="flex flex-col"
                  style={{
                    gap: `${matchSpacing}px`,
                    height: round.key === 'final' ? 'auto' : `${totalHeight}px`,
                    justifyContent: 'space-around'
                  }}
                >
                  {round.matches.map((match, idx) => (
                    <div key={match?.id || `empty-${round.key}-${idx}`} className="relative flex items-center">
                      {renderMatchCard(match, true)}

                      {/* Connector line to next round */}
                      {roundIndex < roundsData.length - 1 && (
                        <div
                          className={`absolute top-1/2 -right-6 md:-right-8 lg:-right-12 w-6 md:w-8 lg:w-12 h-0.5 ${isLightTheme ? 'bg-gray-300' : 'bg-white/20'}`}
                          style={{ transform: 'translateY(-50%)' }}
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
  // Split matches: odd positions go left, even positions go right
  const getSymmetricMatches = (allMatches: (BracketMatch | null)[], isLeft: boolean) => {
    return allMatches.filter((_, idx) => isLeft ? idx % 2 === 0 : idx % 2 === 1);
  };

  const round16 = roundsData.find(r => r.key === "round_of_16");
  const quarters = roundsData.find(r => r.key === "quarterfinal");
  const semis = roundsData.find(r => r.key === "semifinal");
  const finals = roundsData.find(r => r.key === "final");

  return (
    <div className="w-full overflow-x-auto py-4">
      <div className="flex items-center justify-center gap-2 md:gap-4 lg:gap-6 min-w-max">

        {/* Left 1/8 */}
        {round16 && (
          <div className="flex flex-col items-center">
            <div className={`text-[10px] md:text-xs font-bold ${mutedColor} mb-3 px-2 py-0.5 rounded-full ${isLightTheme ? 'bg-gray-100' : 'bg-white/10'}`}>
              1/8
            </div>
            <div className="flex flex-col gap-3">
              {getSymmetricMatches(round16.matches, true).map((match, idx) => (
                <div key={match?.id || `l16-left-${idx}`} className="relative">
                  {renderMatchCard(match, true)}
                  <div className={`absolute top-1/2 -right-2 md:-right-4 w-2 md:w-4 h-0.5 ${isLightTheme ? 'bg-gray-300' : 'bg-white/20'}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Left 1/4 */}
        {quarters && (
          <div className="flex flex-col items-center">
            <div className={`text-[10px] md:text-xs font-bold ${mutedColor} mb-3 px-2 py-0.5 rounded-full ${isLightTheme ? 'bg-gray-100' : 'bg-white/10'}`}>
              1/4
            </div>
            <div className="flex flex-col gap-[72px]">
              {getSymmetricMatches(quarters.matches, true).map((match, idx) => (
                <div key={match?.id || `qf-left-${idx}`} className="relative">
                  {renderMatchCard(match, true)}
                  <div className={`absolute top-1/2 -right-2 md:-right-4 w-2 md:w-4 h-0.5 ${isLightTheme ? 'bg-gray-300' : 'bg-white/20'}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Left 1/2 */}
        {semis && (
          <div className="flex flex-col items-center">
            <div className={`text-[10px] md:text-xs font-bold ${mutedColor} mb-3 px-2 py-0.5 rounded-full ${isLightTheme ? 'bg-gray-100' : 'bg-white/10'}`}>
              1/2
            </div>
            <div className="flex flex-col justify-center">
              {getSymmetricMatches(semis.matches, true).map((match, idx) => (
                <div key={match?.id || `sf-left-${idx}`} className="relative">
                  {renderMatchCard(match, true)}
                  <div className={`absolute top-1/2 -right-2 md:-right-4 w-2 md:w-4 h-0.5 ${isLightTheme ? 'bg-gray-300' : 'bg-white/20'}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FINAL (center) */}
        {finals && (
          <div className="flex flex-col items-center mx-2 md:mx-4">
            <div className={`text-xs md:text-sm font-bold text-primary mb-3 px-3 py-1 rounded-full bg-primary/20`}>
              FINAL
            </div>
            <div className="relative">
              {renderMatchCard(finals.matches[0], false)}

              {finals.matches[0]?.winner_id && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Trophy className="w-5 h-5 md:w-6 md:h-6 text-yellow-500" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right 1/2 */}
        {semis && (
          <div className="flex flex-col items-center">
            <div className={`text-[10px] md:text-xs font-bold ${mutedColor} mb-3 px-2 py-0.5 rounded-full ${isLightTheme ? 'bg-gray-100' : 'bg-white/10'}`}>
              1/2
            </div>
            <div className="flex flex-col justify-center">
              {getSymmetricMatches(semis.matches, false).map((match, idx) => (
                <div key={match?.id || `sf-right-${idx}`} className="relative">
                  <div className={`absolute top-1/2 -left-2 md:-left-4 w-2 md:w-4 h-0.5 ${isLightTheme ? 'bg-gray-300' : 'bg-white/20'}`} />
                  {renderMatchCard(match, true)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right 1/4 */}
        {quarters && (
          <div className="flex flex-col items-center">
            <div className={`text-[10px] md:text-xs font-bold ${mutedColor} mb-3 px-2 py-0.5 rounded-full ${isLightTheme ? 'bg-gray-100' : 'bg-white/10'}`}>
              1/4
            </div>
            <div className="flex flex-col gap-[72px]">
              {getSymmetricMatches(quarters.matches, false).map((match, idx) => (
                <div key={match?.id || `qf-right-${idx}`} className="relative">
                  <div className={`absolute top-1/2 -left-2 md:-left-4 w-2 md:w-4 h-0.5 ${isLightTheme ? 'bg-gray-300' : 'bg-white/20'}`} />
                  {renderMatchCard(match, true)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Right 1/8 */}
        {round16 && (
          <div className="flex flex-col items-center">
            <div className={`text-[10px] md:text-xs font-bold ${mutedColor} mb-3 px-2 py-0.5 rounded-full ${isLightTheme ? 'bg-gray-100' : 'bg-white/10'}`}>
              1/8
            </div>
            <div className="flex flex-col gap-3">
              {getSymmetricMatches(round16.matches, false).map((match, idx) => (
                <div key={match?.id || `l16-right-${idx}`} className="relative">
                  <div className={`absolute top-1/2 -left-2 md:-left-4 w-2 md:w-4 h-0.5 ${isLightTheme ? 'bg-gray-300' : 'bg-white/20'}`} />
                  {renderMatchCard(match, true)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

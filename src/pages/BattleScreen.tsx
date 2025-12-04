import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TournamentBracket from "@/components/TournamentBracket";
import { Trophy, User } from "lucide-react";

interface ScreenState {
  id: string;
  battle_id: string;
  nomination_id: string | null;
  current_match_id: string | null;
  current_round: number;
  show_judges: boolean;
  show_timer: boolean;
  timer_seconds: number;
  show_winner: boolean;
  show_score: boolean;
  rounds_to_win: number;
  match_status: string;
  votes_left: number;
  votes_right: number;
  show_bracket: boolean;
  // Customization fields
  background_type: string;
  background_color: string;
  background_gradient_from: string;
  background_gradient_to: string;
  background_image_url: string | null;
  font_size: string;
  custom_message: string | null;
  show_custom_message: boolean;
  animation_style: string;
  show_battle_name: boolean;
  show_round_info: boolean;
  timer_running: boolean;
  timer_end_time: string | null;
  theme_preset: string;
}

interface Dancer {
  id: string;
  name: string;
  city: string | null;
  photo_url: string | null;
}

interface Match {
  id: string;
  dancer_left_id: string | null;
  dancer_right_id: string | null;
  winner_id: string | null;
}

interface BracketMatch {
  id: string;
  round: string;
  position: number;
  dancer_left_id: string | null;
  dancer_right_id: string | null;
  winner_id: string | null;
}

interface Judge {
  id: string;
  full_name: string;
}

const FONT_SIZES = {
  small: { name: '0.8', score: '4rem', vs: '5rem' },
  normal: { name: '1', score: '5rem', vs: '6rem' },
  large: { name: '1.2', score: '6rem', vs: '7rem' },
  xlarge: { name: '1.4', score: '7rem', vs: '8rem' },
};

export default function BattleScreen() {
  const { id } = useParams();
  const [screenState, setScreenState] = useState<ScreenState | null>(null);
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [leftDancer, setLeftDancer] = useState<Dancer | null>(null);
  const [rightDancer, setRightDancer] = useState<Dancer | null>(null);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [battleName, setBattleName] = useState("");
  const [loading, setLoading] = useState(true);
  const [allMatches, setAllMatches] = useState<BracketMatch[]>([]);
  const [allDancers, setAllDancers] = useState<Dancer[]>([]);
  const [animationClass, setAnimationClass] = useState("");

  useEffect(() => {
    if (!id) return;
    loadScreenState();

    const channel = supabase
      .channel('screen-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screen_state',
          filter: `battle_id=eq.${id}`
        },
        () => loadScreenState()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Timer logic with server-synced end time
  useEffect(() => {
    if (!screenState?.timer_running || !screenState?.timer_end_time) {
      if (!screenState?.show_timer) setTimeLeft(0);
      return;
    }

    const updateTimer = () => {
      const endTime = new Date(screenState.timer_end_time!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [screenState?.timer_running, screenState?.timer_end_time, screenState?.show_timer]);

  // Fallback static timer
  useEffect(() => {
    if (screenState?.show_timer && !screenState?.timer_running && screenState.timer_seconds > 0) {
      setTimeLeft(screenState.timer_seconds);
    }
  }, [screenState?.timer_seconds, screenState?.show_timer, screenState?.timer_running]);

  const loadScreenState = async () => {
    try {
      setLoading(true);
      
      const { data: battleData } = await supabase
        .from("battles")
        .select("name")
        .eq("id", id)
        .single();
      
      if (battleData) setBattleName(battleData.name);
      
      const { data: existingState, error: stateError } = await supabase
        .from("screen_state")
        .select("*")
        .eq("battle_id", id)
        .maybeSingle();

      if (stateError) throw stateError;

      let stateData = existingState;

      if (!existingState) {
        const { data: newState, error: createError } = await supabase
          .from("screen_state")
          .insert({
            battle_id: id,
            show_judges: true,
            show_timer: false,
            timer_seconds: 120,
            show_winner: false,
            show_score: true,
            rounds_to_win: 2,
            current_round: 1,
            votes_left: 0,
            votes_right: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        stateData = newState;
      }

      // Trigger animation
      const animStyle = stateData.animation_style || 'fade';
      setAnimationClass(`animate-${animStyle}-in`);
      
      setScreenState(stateData as ScreenState);

      if (stateData.current_match_id) {
        const { data: matchData } = await supabase
          .from("matches")
          .select("*")
          .eq("id", stateData.current_match_id)
          .single();

        if (matchData) {
          setCurrentMatch(matchData);

          if (matchData.dancer_left_id) {
            const { data: leftData } = await supabase
              .from("dancers")
              .select("*")
              .eq("id", matchData.dancer_left_id)
              .single();
            setLeftDancer(leftData);
          }

          if (matchData.dancer_right_id) {
            const { data: rightData } = await supabase
              .from("dancers")
              .select("*")
              .eq("id", matchData.dancer_right_id)
              .single();
            setRightDancer(rightData);
          }
        }
      }

      if (stateData.nomination_id) {
        const { data: allMatchesData } = await supabase
          .from("matches")
          .select("*")
          .eq("nomination_id", stateData.nomination_id)
          .order("position", { ascending: true });

        const { data: allDancersData } = await supabase
          .from("dancers")
          .select("*")
          .eq("nomination_id", stateData.nomination_id);

        setAllMatches(allMatchesData || []);
        setAllDancers(allDancersData || []);
      }

      if (stateData.show_judges) {
        const { data: judgesData } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("battle_id", id)
          .eq("role", "judge");

        if (judgesData) {
          const judgeProfiles = await Promise.all(
            judgesData.map(async (j) => {
              const { data } = await supabase
                .from("profiles")
                .select("id, full_name")
                .eq("id", j.user_id)
                .single();
              return data;
            })
          );
          setJudges(judgeProfiles.filter(Boolean) as Judge[]);
        }
      }
    } catch (error) {
      console.error("Error loading screen state:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBackgroundStyle = () => {
    if (!screenState) return { background: '#1a1a2e' };
    
    const { background_type, background_color, background_gradient_from, background_gradient_to, background_image_url } = screenState;
    
    if (background_type === 'gradient') {
      return { background: `linear-gradient(135deg, ${background_gradient_from || '#1a1a2e'}, ${background_gradient_to || '#16213e'})` };
    }
    if (background_type === 'image' && background_image_url) {
      return { 
        backgroundImage: `url(${background_image_url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      };
    }
    return { background: background_color || '#1a1a2e' };
  };

  const getFontScale = () => {
    return FONT_SIZES[screenState?.font_size as keyof typeof FONT_SIZES] || FONT_SIZES.normal;
  };

  const fontScale = getFontScale();
  const isLightTheme = screenState?.theme_preset === 'light';
  const textColor = isLightTheme ? 'text-gray-900' : 'text-white';
  const mutedTextColor = isLightTheme ? 'text-gray-600' : 'text-white/60';

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={getBackgroundStyle()}>
        <div className="text-center">
          <div className={`w-16 h-16 border-4 ${isLightTheme ? 'border-gray-300 border-t-gray-900' : 'border-white/30 border-t-white'} rounded-full animate-spin mx-auto mb-4`} />
          <p className={`text-xl ${mutedTextColor}`}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!screenState) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={getBackgroundStyle()}>
        <div className="text-center">
          <div className={`w-16 h-16 border-4 ${isLightTheme ? 'border-gray-300 border-t-gray-900' : 'border-white/30 border-t-white'} rounded-full animate-spin mx-auto mb-4`} />
          <p className={`text-xl ${mutedTextColor}`}>Initializing...</p>
        </div>
      </div>
    );
  }

  // Custom message overlay
  if (screenState.show_custom_message && screenState.custom_message) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8" style={getBackgroundStyle()}>
        <div className={`text-center space-y-4 sm:space-y-6 md:space-y-8 animate-scale-in ${animationClass} w-full max-w-4xl`}>
          {screenState.show_battle_name && (
            <h1 className={`text-2xl sm:text-3xl md:text-4xl font-display font-bold ${textColor}`}>{battleName}</h1>
          )}
          <div className={`${isLightTheme ? 'bg-white/80' : 'bg-black/40'} backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12`}>
            <p 
              className={`font-display font-bold ${textColor} text-xl sm:text-2xl md:text-3xl lg:text-4xl`}
              style={{ fontSize: `calc(1.5rem * ${fontScale.name})` }}
            >
              {screenState.custom_message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Bracket view
  if (screenState.show_bracket) {
    return (
      <div className="min-h-screen p-4 sm:p-6 md:p-8" style={getBackgroundStyle()}>
        <div className={`max-w-[1600px] mx-auto space-y-4 sm:space-y-6 md:space-y-8 ${animationClass}`}>
          {screenState.show_battle_name && (
            <div className="text-center">
              <h1 
                className={`font-display font-bold ${textColor} mb-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl`}
                style={{ fontSize: `calc(1.75rem * ${fontScale.name})` }}
              >
                {battleName}
              </h1>
              <p className={`text-base sm:text-lg md:text-xl ${mutedTextColor}`}>Tournament Bracket</p>
            </div>
          )}
          <Card className={`p-4 sm:p-6 md:p-8 ${isLightTheme ? 'bg-gray-100/80' : 'bg-white/5'} border-white/10 backdrop-blur overflow-x-auto`}>
            <TournamentBracket matches={allMatches} dancers={allDancers} />
          </Card>
        </div>
      </div>
    );
  }

  // Waiting for match
  if (!currentMatch && !screenState.show_winner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8" style={getBackgroundStyle()}>
        <div className={`text-center space-y-4 sm:space-y-6 md:space-y-8 max-w-2xl w-full ${animationClass}`}>
          {screenState.show_battle_name && (
            <h1 
              className={`font-display font-bold ${textColor} text-2xl sm:text-3xl md:text-4xl lg:text-5xl`}
              style={{ fontSize: `calc(2rem * ${fontScale.name})` }}
            >
              {battleName}
            </h1>
          )}
          <div className={`${isLightTheme ? 'bg-white/80' : 'bg-black/40'} backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12`}>
            <div className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto rounded-xl sm:rounded-2xl ${isLightTheme ? 'bg-gray-200' : 'bg-white/10'} flex items-center justify-center mb-4 sm:mb-6`}>
              <Trophy className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 ${mutedTextColor}`} />
            </div>
            <p 
              className={`${isLightTheme ? 'text-gray-800' : 'text-white/80'} font-display text-xl sm:text-2xl md:text-3xl`}
              style={{ fontSize: `calc(1.25rem * ${fontScale.name})` }}
            >
              Waiting for next battle...
            </p>
            <p className={`text-sm sm:text-base md:text-lg ${mutedTextColor} mt-2`}>The operator will select the match soon</p>
          </div>
        </div>
      </div>
    );
  }

  // Winner screen
  if (screenState.show_winner && currentMatch?.winner_id) {
    const winner = currentMatch.winner_id === leftDancer?.id ? leftDancer : rightDancer;
    const isRed = currentMatch.winner_id === leftDancer?.id;
    
    return (
      <div 
        className={`min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-8`}
        style={{ 
          background: isRed 
            ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.8))' 
            : 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--secondary)/0.8))'
        }}
      >
        <div className={`text-center space-y-4 sm:space-y-6 md:space-y-8 animate-scale-in ${animationClass} w-full max-w-lg`}>
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-white">
            <Trophy className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16" />
            <h1 
              className="font-display font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl"
              style={{ fontSize: `calc(2.5rem * ${fontScale.name})` }}
            >
              WINNER
            </h1>
            <Trophy className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16" />
          </div>
          
          <div className="bg-black/30 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 mx-auto">
            <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 mx-auto rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center mb-4 sm:mb-6 overflow-hidden">
              {winner?.photo_url ? (
                <img src={winner.photo_url} alt={winner.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-white" />
              )}
            </div>
            <h2 
              className="font-display font-bold text-white mb-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl"
              style={{ fontSize: `calc(1.75rem * ${fontScale.name})` }}
            >
              {winner?.name}
            </h2>
            {winner?.city && (
              <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/70">{winner.city}</p>
            )}
          </div>
          
          {screenState.show_score && (
            <div 
              className="font-display font-bold text-white/90 text-2xl sm:text-3xl md:text-4xl"
              style={{ fontSize: `calc(1.75rem * ${fontScale.name})` }}
            >
              {screenState.votes_left} — {screenState.votes_right}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active match view
  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8" style={getBackgroundStyle()}>
      <div className={`max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 ${animationClass}`}>
        {/* Battle name */}
        {screenState.show_battle_name && (
          <div className="text-center">
            <h1 
              className={`font-display font-bold ${textColor} text-2xl sm:text-3xl md:text-4xl lg:text-5xl`}
              style={{ fontSize: `calc(1.75rem * ${fontScale.name})` }}
            >
              {battleName}
            </h1>
          </div>
        )}

        {/* Timer */}
        {screenState.show_timer && (
          <div className="text-center">
            <div className={`inline-block ${isLightTheme ? 'bg-white/80' : 'bg-black/40'} backdrop-blur-xl rounded-xl sm:rounded-2xl px-6 py-3 sm:px-8 sm:py-4 md:px-12 md:py-6`}>
              <div 
                className={`font-display font-bold ${textColor} tabular-nums text-3xl sm:text-4xl md:text-5xl lg:text-6xl ${screenState.timer_running && timeLeft <= 10 ? 'text-red-500 animate-pulse' : ''}`}
                style={{ fontSize: `calc(2.5rem * ${fontScale.name})` }}
              >
                {formatTime(timeLeft)}
              </div>
            </div>
          </div>
        )}

        {/* Main battle display - responsive grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 items-center">
          {/* Left dancer - Red */}
          <Card className={`p-4 sm:p-6 md:p-8 ${isLightTheme ? 'bg-white/80' : 'bg-primary/10'} border-2 border-primary/30 backdrop-blur order-1 md:order-1`}>
            <div className="text-center space-y-3 sm:space-y-4 md:space-y-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 mx-auto rounded-2xl md:rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 overflow-hidden">
                {leftDancer?.photo_url ? (
                  <img src={leftDancer.photo_url} alt={leftDancer.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-primary" />
                )}
              </div>
              <div>
                <h2 
                  className="font-display font-bold text-primary text-xl sm:text-2xl md:text-3xl lg:text-4xl"
                  style={{ fontSize: `calc(1.5rem * ${fontScale.name})` }}
                >
                  {leftDancer?.name || "Waiting"}
                </h2>
                {leftDancer?.city && (
                  <p className={`text-sm sm:text-base md:text-lg lg:text-xl ${mutedTextColor} mt-1 sm:mt-2`}>{leftDancer.city}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Center - VS and score */}
          <div className="text-center space-y-4 sm:space-y-6 md:space-y-8 order-3 md:order-2 py-4 md:py-0">
            <div 
              className={`font-display font-bold ${isLightTheme ? 'text-gray-300' : 'text-white/20'} text-4xl sm:text-5xl md:text-6xl lg:text-7xl`}
              style={{ fontSize: `calc(3rem * ${fontScale.name})` }}
            >
              VS
            </div>
            
            {screenState.show_score && (
              <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8">
                <div 
                  className="font-display font-bold text-primary text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
                  style={{ fontSize: `calc(3rem * ${fontScale.name})`, textShadow: '0 0 30px hsl(var(--primary)/0.5)' }}
                >
                  {screenState.votes_left}
                </div>
                <div className={`text-2xl sm:text-3xl md:text-4xl ${isLightTheme ? 'text-gray-400' : 'text-white/30'}`}>—</div>
                <div 
                  className="font-display font-bold text-secondary text-4xl sm:text-5xl md:text-6xl lg:text-7xl"
                  style={{ fontSize: `calc(3rem * ${fontScale.name})`, textShadow: '0 0 30px hsl(var(--secondary)/0.5)' }}
                >
                  {screenState.votes_right}
                </div>
              </div>
            )}
            
            {screenState.show_round_info && (
              <div className="space-y-2 sm:space-y-4">
                <Badge 
                  className={`px-4 py-2 sm:px-6 sm:py-3 text-base sm:text-lg md:text-xl ${isLightTheme ? 'bg-gray-200 text-gray-900' : 'bg-white/10 text-white'} border-white/20`}
                  style={{ fontSize: `calc(1rem * ${fontScale.name})` }}
                >
                  Round {screenState.current_round}
                </Badge>
                
                <div className={`text-sm sm:text-base md:text-lg ${mutedTextColor}`}>
                  First to {screenState.rounds_to_win} rounds wins
                </div>
              </div>
            )}
          </div>

          {/* Right dancer - Blue */}
          <Card className={`p-4 sm:p-6 md:p-8 ${isLightTheme ? 'bg-white/80' : 'bg-secondary/10'} border-2 border-secondary/30 backdrop-blur order-2 md:order-3`}>
            <div className="text-center space-y-3 sm:space-y-4 md:space-y-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 mx-auto rounded-2xl md:rounded-3xl bg-secondary/10 flex items-center justify-center border-2 border-secondary/20 overflow-hidden">
                {rightDancer?.photo_url ? (
                  <img src={rightDancer.photo_url} alt={rightDancer.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-secondary" />
                )}
              </div>
              <div>
                <h2 
                  className="font-display font-bold text-secondary text-xl sm:text-2xl md:text-3xl lg:text-4xl"
                  style={{ fontSize: `calc(1.5rem * ${fontScale.name})` }}
                >
                  {rightDancer?.name || "Waiting"}
                </h2>
                {rightDancer?.city && (
                  <p className={`text-sm sm:text-base md:text-lg lg:text-xl ${mutedTextColor} mt-1 sm:mt-2`}>{rightDancer.city}</p>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Judges */}
        {screenState.show_judges && judges.length > 0 && (
          <Card className={`p-4 sm:p-6 ${isLightTheme ? 'bg-white/80' : 'bg-white/5'} border-white/10 backdrop-blur`}>
            <h3 className={`text-base sm:text-lg md:text-xl font-display font-bold mb-3 sm:mb-4 text-center ${mutedTextColor}`}>Judges</h3>
            <div className="flex justify-center gap-2 sm:gap-3 md:gap-4 flex-wrap">
              {judges.map((judge) => (
                <Badge 
                  key={judge.id} 
                  className={`text-sm sm:text-base md:text-lg px-3 py-1.5 sm:px-4 sm:py-2 ${isLightTheme ? 'bg-gray-200 text-gray-900' : 'bg-white/10 text-white'} border-white/20`}
                >
                  {judge.full_name || "Judge"}
                </Badge>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import TournamentBracket from "@/components/TournamentBracket";
import { Trophy, User } from "lucide-react";
import { useRef } from "react";

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
  bracket_layout: "symmetric" | "linear";
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
  bracket_style: string;
  font_family: string;
  primary_color: string | null;
  secondary_color: string | null;
  next_match_id?: string | null;
  active_selection_dancers?: string[] | null;
  next_selection_dancers?: string[] | null;
}

interface Dancer {
  id: string;
  name: string;
  city: string | null;
  photo_url: string | null;
  video_url: string | null;
  wins_count?: number | null;
  battles_count?: number | null;
  average_score?: number | null;
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

interface JudgeVote {
  id: string;
  judge_id: string;
  vote_for: string | null;
  round_number: number;
}

const FONT_SIZES = {
  small: { name: '0.8', score: '4rem', vs: '5rem' },
  normal: { name: '1', score: '5rem', vs: '6rem' },
  large: { name: '1.2', score: '6rem', vs: '7rem' },
  xlarge: { name: '1.4', score: '7rem', vs: '8rem' },
};

const ScreenWrapper = ({ children, screenState, dynamicStyles, isObs }: any) => {
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isObs || !screenState || !screenState.aspect_ratio || screenState.aspect_ratio === 'auto') {
    return <div className="min-h-screen relative w-full" style={dynamicStyles}>{children}</div>;
  }

  let targetW = 1920; let targetH = 1080;
  if (screenState.aspect_ratio === '4:3') { targetW = 1440; }
  else if (screenState.aspect_ratio === '1:1') { targetW = 1080; }
  else if (screenState.aspect_ratio === '9:16') { targetW = 1080; targetH = 1920; }

  const scaleX = windowSize.w / targetW;
  const scaleY = windowSize.h / targetH;
  const scale = Math.min(scaleX, scaleY);

  return (
    <div className="w-screen h-screen overflow-hidden flex items-center justify-center bg-black">
      <div
        style={{
          ...dynamicStyles,
          width: `${targetW}px`,
          height: `${targetH}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          flexShrink: 0
        }}
        className="relative overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
};

export default function BattleScreen({ isObs = false }: { isObs?: boolean }) {
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
  const [matchVotes, setMatchVotes] = useState<JudgeVote[]>([]);
  const [currentNomination, setCurrentNomination] = useState<any>(null);

  const currentMatchIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentMatchIdRef.current = screenState?.current_match_id || null;
  }, [screenState?.current_match_id]);

  // Next Up / Heat States
  const [nextMatch, setNextMatch] = useState<Match | null>(null);
  const [nextLeftDancer, setNextLeftDancer] = useState<Dancer | null>(null);
  const [nextRightDancer, setNextRightDancer] = useState<Dancer | null>(null);
  const [activeHeatDancers, setActiveHeatDancers] = useState<Dancer[]>([]);
  const [nextHeatDancers, setNextHeatDancers] = useState<Dancer[]>([]);

  useEffect(() => {
    if (!id) return;
    loadScreenState();

    const channelId = Math.random().toString(36).substring(7);

    const channel = supabase
      .channel(`screen-updates-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screen_state'
        },
        () => loadScreenState()
      );

    const matchVotesChannel = supabase
      .channel(`public-match-votes-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_votes'
        },
        () => loadVotes()
      );

    const dancersChannel = supabase
      .channel(`public-dancers-updates-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dancers'
        },
        () => loadScreenState()
      );

    const matchesChannel = supabase
      .channel(`public-matches-updates-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        () => loadScreenState()
      );

    channel.subscribe();
    matchVotesChannel.subscribe();
    dancersChannel.subscribe();
    matchesChannel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(matchVotesChannel);
      supabase.removeChannel(dancersChannel);
      supabase.removeChannel(matchesChannel);
    };
  }, [id, screenState?.current_match_id]);

  const loadVotes = async () => {
    const matchId = currentMatchIdRef.current;
    if (!matchId) return;

    try {
      const { data: votes } = await supabase
        .from("match_votes")
        .select("*")
        .eq("match_id", matchId);

      if (votes) {
        setMatchVotes(votes);
      }
    } catch (error) {
      console.error("Error loading votes:", error);
    }
  };

  useEffect(() => {
    if (screenState?.current_match_id) {
      loadVotes();
    }
  }, [screenState?.current_match_id]);

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

      const { data: existingStates, error: stateError } = await supabase
        .from("screen_state")
        .select("*")
        .eq("battle_id", id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (stateError) throw stateError;

      let existingState = existingStates && existingStates.length > 0 ? existingStates[0] as any : null;

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

      setScreenState(stateData as unknown as ScreenState);

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
      } else {
        setCurrentMatch(null);
        setLeftDancer(null);
        setRightDancer(null);
      }

      // Load Next Match
      if (stateData.next_match_id) {
        const { data: nextMatchData } = await supabase
          .from("matches")
          .select("*")
          .eq("id", stateData.next_match_id)
          .single();
        if (nextMatchData) {
          setNextMatch(nextMatchData);
          if (nextMatchData.dancer_left_id) {
            const { data } = await supabase.from("dancers").select("*").eq("id", nextMatchData.dancer_left_id).single();
            setNextLeftDancer(data);
          } else { setNextLeftDancer(null); }
          if (nextMatchData.dancer_right_id) {
            const { data } = await supabase.from("dancers").select("*").eq("id", nextMatchData.dancer_right_id).single();
            setNextRightDancer(data);
          } else { setNextRightDancer(null); }
        }
      } else {
        setNextMatch(null); setNextLeftDancer(null); setNextRightDancer(null);
      }

      // Load Active Heat Dancers
      if (stateData.active_selection_dancers && stateData.active_selection_dancers.length > 0) {
        const { data: dancers } = await supabase.from("dancers").select("*").in("id", stateData.active_selection_dancers);
        // Preserve order
        const ordered = stateData.active_selection_dancers.map((id: string) => dancers?.find(d => d.id === id)).filter(Boolean);
        setActiveHeatDancers(ordered as Dancer[]);
      } else {
        setActiveHeatDancers([]);
      }

      // Load Next Heat Dancers
      if (stateData.next_selection_dancers && stateData.next_selection_dancers.length > 0) {
        const { data: dancers } = await supabase.from("dancers").select("*").in("id", stateData.next_selection_dancers);
        const ordered = stateData.next_selection_dancers.map((id: string) => dancers?.find(d => d.id === id)).filter(Boolean);
        setNextHeatDancers(ordered as Dancer[]);
      } else {
        setNextHeatDancers([]);
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

        const { data: nominationData } = await supabase
          .from("nominations")
          .select("*")
          .eq("id", stateData.nomination_id)
          .single();

        setAllMatches(allMatchesData || []);
        setAllDancers(allDancersData || []);
        setCurrentNomination(nominationData);
      } else {
        setCurrentNomination(null);
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
    if (isObs) return { background: '#00FF00' };
    if (!screenState) return { background: '#1a1a2e' };

    const { background_type, background_color, background_gradient_from, background_gradient_to, background_image_url } = screenState;

    // Base styles
    const style: React.CSSProperties = {};

    if (background_type === 'gradient') {
      style.background = `linear-gradient(135deg, ${background_gradient_from || '#1a1a2e'}, ${background_gradient_to || '#16213e'})`;
      return style;
    }
    if (background_type === 'image' && background_image_url) {
      style.backgroundImage = `url(${background_image_url})`;
      style.backgroundSize = 'cover';
      style.backgroundPosition = 'center';
      return style;
    }

    style.background = background_color || '#1a1a2e';
    return style;
  };

  const getFontScale = () => {
    return FONT_SIZES[screenState?.font_size as keyof typeof FONT_SIZES] || FONT_SIZES.normal;
  };

  const fontScale = getFontScale();
  const isLightTheme = screenState?.theme_preset === 'light' && !isObs; // Force dark text visibility on green if needed? No, let's just stick to dark theme on OBS
  const themeToUse = isObs ? 'dark' : (screenState?.theme_preset || 'dark');
  const textColor = themeToUse === 'light' ? 'text-gray-900' : 'text-white';
  const mutedTextColor = themeToUse === 'light' ? 'text-gray-600' : 'text-white/60';
  const isLight = themeToUse === 'light';

  const blurClass = isObs ? '' : 'backdrop-blur-xl';
  const blurClassSmall = isObs ? '' : 'backdrop-blur';

  // Loading
  if (loading) {
    return (
      <ScreenWrapper screenState={screenState} dynamicStyles={getBackgroundStyle()} isObs={isObs}>
        <div className="h-full w-full flex items-center justify-center" style={getBackgroundStyle()}>
          <div className="text-center">
            <div className={`w-16 h-16 border-4 ${isLight ? 'border-gray-300 border-t-gray-900' : 'border-white/30 border-t-white'} rounded-full animate-spin mx-auto mb-4`} />
            <p className={`text-xl ${mutedTextColor}`}>Loading...</p>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (!screenState) {
    return (
      <ScreenWrapper screenState={screenState} dynamicStyles={getBackgroundStyle()} isObs={isObs}>
        <div className="h-full w-full flex items-center justify-center" style={getBackgroundStyle()}>
          <div className="text-center">
            <div className={`w-16 h-16 border-4 ${isLight ? 'border-gray-300 border-t-gray-900' : 'border-white/30 border-t-white'} rounded-full animate-spin mx-auto mb-4`} />
            <p className={`text-xl ${mutedTextColor}`}>Initializing...</p>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // Safe fallbacks for unmigrated databases
  const safeFontFamily = screenState.font_family || 'display';
  const safeBracketStyle = screenState.bracket_style || 'solid';

  // Typography mapping
  const fontClass = safeFontFamily === 'sans'
    ? 'font-sans'
    : safeFontFamily === 'mono'
      ? 'font-mono'
      : 'font-display';

  // Dynamic Backgrounds for Bracket Cards
  const bracketCardBgClass = safeBracketStyle === 'glass'
    ? (isLight ? 'bg-white/40 backdrop-blur-xl border-white/80 text-black' : 'bg-black/30 backdrop-blur-xl border-white/10 text-white')
    : safeBracketStyle === 'neon'
      ? 'bg-black/90 border border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.3)] text-white'
      : (isLight ? 'bg-gray-100/80 border-gray-200 text-black' : 'bg-white/5 border-white/10 text-white');

  const mainCardBgClassLeft = safeBracketStyle === 'glass'
    ? (isLight ? 'bg-white/60 backdrop-blur-2xl border-white' : 'bg-black/40 backdrop-blur-2xl border-white/20')
    : safeBracketStyle === 'neon'
      ? 'bg-black border-2 border-primary shadow-[0_0_30px_rgba(255,0,0,0.5)]'
      : (isLight ? 'bg-white/90 border-primary/30' : 'bg-primary/20 border-primary/30');

  const mainCardBgClassRight = safeBracketStyle === 'glass'
    ? (isLight ? 'bg-white/60 backdrop-blur-2xl border-white' : 'bg-black/40 backdrop-blur-2xl border-white/20')
    : safeBracketStyle === 'neon'
      ? 'bg-black border-2 border-secondary shadow-[0_0_30px_rgba(0,0,255,0.5)]'
      : (isLight ? 'bg-white/90 border-secondary/30' : 'bg-secondary/20 border-secondary/30');

  // Hex to HSL for dynamic CSS variables
  const hexToHSL = (hex: string): string => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt("0x" + hex[1] + hex[1]);
      g = parseInt("0x" + hex[2] + hex[2]);
      b = parseInt("0x" + hex[3] + hex[3]);
    } else if (hex.length === 7) {
      r = parseInt("0x" + hex[1] + hex[2]);
      g = parseInt("0x" + hex[3] + hex[4]);
      b = parseInt("0x" + hex[5] + hex[6]);
    }
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
  };

  const dynamicStyles: React.CSSProperties = {
    ...getBackgroundStyle(),
  } as React.CSSProperties;

  if (screenState.primary_color) {
    dynamicStyles['--primary'] = hexToHSL(screenState.primary_color);
  }
  if (screenState.secondary_color) {
    dynamicStyles['--secondary'] = hexToHSL(screenState.secondary_color);
  }

  // Custom message overlay
  if (screenState.show_custom_message && screenState.custom_message) {
    return (
      <ScreenWrapper screenState={screenState} dynamicStyles={dynamicStyles} isObs={isObs}>
        <div className="h-full w-full flex items-center justify-center p-4 sm:p-6 md:p-8" style={dynamicStyles}>
          <div className={`text-center space-y-4 sm:space-y-6 md:space-y-8 animate-scale-in ${animationClass} w-full max-w-4xl`}>
            {screenState.show_battle_name && (
              <h1 className={`text-2xl sm:text-3xl md:text-4xl ${fontClass} font-bold ${textColor}`}>{battleName}</h1>
            )}
            <div className={`${isLight ? 'bg-white/80' : 'bg-black/60'} ${blurClass} rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12`}>
              <p
                className={`${fontClass} font-bold ${textColor} text-xl sm:text-2xl md:text-3xl lg:text-4xl`}
                style={{ fontSize: `calc(1.5rem * ${fontScale.name})` }}
              >
                {screenState.custom_message}
              </p>
            </div>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // Bracket view
  if (screenState.show_bracket) {
    return (
      <ScreenWrapper screenState={screenState} dynamicStyles={dynamicStyles} isObs={isObs}>
        <div className="h-full w-full p-4 sm:p-6 md:p-8" style={dynamicStyles}>
          <div className={`max-w-[1600px] mx-auto space-y-4 sm:space-y-6 md:space-y-8 ${animationClass}`}>
            {screenState.show_battle_name && (
              <div className="text-center">
                <h1
                  className={`${fontClass} font-bold ${textColor} mb-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl`}
                  style={{ fontSize: `calc(1.75rem * ${fontScale.name})` }}
                >
                  {battleName}
                </h1>
                <p className={`text-base sm:text-lg md:text-xl ${mutedTextColor}`}>Tournament Bracket</p>
              </div>
            )}
            <Card className={`p-4 sm:p-6 md:p-8 ${bracketCardBgClass} overflow-x-auto`}>
              <TournamentBracket
                matches={allMatches}
                dancers={allDancers}
                layout={screenState.bracket_layout || "symmetric"}
                activeMatchId={screenState.current_match_id}
                isLightTheme={isLight}
              />
            </Card>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // Waiting for match
  if (!currentMatch && !screenState.show_winner && (!screenState.active_selection_dancers || screenState.active_selection_dancers.length === 0)) {
    return (
      <ScreenWrapper screenState={screenState} dynamicStyles={dynamicStyles} isObs={isObs}>
        <div className="h-full w-full flex items-center justify-center p-4 sm:p-6 md:p-8" style={dynamicStyles}>
          <div className={`text-center space-y-4 sm:space-y-6 md:space-y-8 max-w-2xl w-full ${animationClass}`}>
            {screenState.show_battle_name && (
              <h1
                className={`${fontClass} font-bold ${textColor} text-2xl sm:text-3xl md:text-4xl lg:text-5xl`}
                style={{ fontSize: `calc(2rem * ${fontScale.name})` }}
              >
                {battleName}
              </h1>
            )}
            <div className={`${isLight ? 'bg-white/80' : 'bg-black/60'} ${blurClass} rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12`}>
              <div className={`w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 mx-auto rounded-xl sm:rounded-2xl ${isLight ? 'bg-gray-200' : 'bg-white/10'} flex items-center justify-center mb-4 sm:mb-6`}>
                <Trophy className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 ${mutedTextColor}`} />
              </div>
              <p
                className={`${isLight ? 'text-gray-800' : 'text-white/80'} ${fontClass} text-xl sm:text-2xl md:text-3xl`}
                style={{ fontSize: `calc(1.25rem * ${fontScale.name})` }}
              >
                Waiting for next battle...
              </p>
              <p className={`text-sm sm:text-base md:text-lg ${mutedTextColor} mt-2`}>The operator will select the match soon</p>
            </div>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  const renderVoteBreakdown = () => {
    if (!screenState.show_judges || judges.length === 0 || matchVotes.length === 0) return null;

    const maxRoundVoted = Math.max(...matchVotes.map(v => v.round_number), screenState.current_round, 1);
    const rounds = Array.from({ length: maxRoundVoted }, (_, i) => i + 1);

    return (
      <div className={`mt-10 ${blurClassSmall} w-full max-w-5xl mx-auto p-4 sm:p-8 rounded-3xl border border-white/10 shadow-3xl bg-black/30 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className={`text-left pb-4 font-display text-[10px] sm:text-xs uppercase tracking-[0.2em] font-black ${mutedTextColor}`}>Judge</th>
                {rounds.map(r => (
                  <th key={r} className={`pb-4 font-display text-[10px] sm:text-xs uppercase tracking-[0.2em] font-black ${mutedTextColor}`}>Round {r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {judges.map(judge => (
                <tr key={judge.id} className="border-t border-white/5 group hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 pr-4">
                    <div className="flex flex-col">
                      <span className="font-display font-black text-white text-xs sm:text-sm uppercase tracking-wider truncate max-w-[120px] sm:max-w-[180px]" title={judge.full_name}>
                        {judge.full_name}
                      </span>
                    </div>
                  </td>
                  {rounds.map(r => {
                    const vote = matchVotes.find(v => v.judge_id === judge.id && v.round_number === r);

                    if (!vote) {
                      return (
                        <td key={r} className="py-4 text-center">
                          <div className="inline-block w-20 h-2 bg-white/5 rounded-full animate-pulse" />
                        </td>
                      );
                    }

                    let voteStyle = "bg-muted-foreground/20 text-muted-foreground/60 border-muted-foreground/20";
                    let label = "TIE BREAKER";

                    if (vote.vote_for === leftDancer?.id) {
                      voteStyle = "bg-primary/20 text-primary border-primary/40 shadow-[0_0_15px_rgba(var(--primary),0.2)]";
                      label = leftDancer?.name?.toUpperCase() || "RED";
                    } else if (vote.vote_for === rightDancer?.id) {
                      voteStyle = "bg-secondary/20 text-secondary border-secondary/40 shadow-[0_0_15px_rgba(var(--secondary),0.2)]";
                      label = rightDancer?.name?.toUpperCase() || "BLUE";
                    }

                    return (
                      <td key={r} className="py-4 px-2 text-center">
                        <div className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter border-2 ${voteStyle} transition-all duration-500 scale-100 group-hover:scale-105`}>
                          {label}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Winner screen
  if (screenState.show_winner && currentMatch?.winner_id) {
    const winner = currentMatch.winner_id === leftDancer?.id ? leftDancer : rightDancer;
    const isRed = currentMatch.winner_id === leftDancer?.id;

    return (
      <ScreenWrapper
        screenState={screenState}
        dynamicStyles={{
          background: isRed
            ? 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary)/0.8))'
            : 'linear-gradient(135deg, hsl(var(--secondary)), hsl(var(--secondary)/0.8))'
        }}
        isObs={isObs}
      >
        <div className={`h-full w-full flex items-center justify-center p-4 sm:p-6 md:p-8`}>
          <div className={`text-center space-y-4 sm:space-y-6 md:space-y-8 animate-scale-in ${animationClass} w-full max-w-lg`}>
            <div className="flex items-center justify-center gap-2 sm:gap-4 text-white">
              <Trophy className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16" />
              <h1
                className={`${fontClass} font-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl`}
                style={{ fontSize: `calc(2.5rem * ${fontScale.name})` }}
              >
                WINNER
              </h1>
              <Trophy className="w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16" />
            </div>

            <div className={`bg-black/60 ${blurClass} rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 mx-auto`}>
              <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 mx-auto rounded-xl sm:rounded-2xl bg-white/10 flex items-center justify-center mb-4 sm:mb-6 overflow-hidden">
                {winner?.video_url ? (
                  <video src={winner.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                ) : winner?.photo_url ? (
                  <img src={winner.photo_url} alt={winner.name} className="w-full h-full object- cover" />
                ) : (
                  <User className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-white" />
                )}
              </div>
              <h2
                className={`${fontClass} font-bold text-white mb-2 text-xl sm:text-2xl md:text-3xl lg:text-4xl`}
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
                className={`${fontClass} font-bold text-white/90 text-2xl sm:text-3xl md:text-4xl`}
                style={{ fontSize: `calc(1.75rem * ${fontScale.name})` }}
              >
                {screenState.votes_left} — {screenState.votes_right}
              </div>
            )}

            {renderVoteBreakdown()}
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  const renderNextUp = () => {
    if (screenState?.show_winner || screenState?.show_bracket) return null;

    if (screenState?.active_selection_dancers && screenState.active_selection_dancers.length > 0) {
      if (!nextHeatDancers.length) return null;
      return (
        <div className={`fixed bottom-8 right-8 ${isLight ? 'bg-white/90 border-gray-200' : 'bg-black/80 border-white/20'} ${blurClassSmall} p-4 rounded-2xl border shadow-2xl z-50 animate-slide-up max-w-md backdrop-blur-3xl`}>
          <div className={`text-xs uppercase tracking-widest font-bold mb-3 ${isLight ? 'text-gray-500' : 'text-white/50'}`}>On Deck • Next Heat</div>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
            {nextHeatDancers.map(d => (
              <div key={d.id} className="flex flex-col items-center gap-2 min-w-[70px]">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-primary/20 border-2 border-primary/30 shrink-0">
                  {d.photo_url ? (
                    <img src={d.photo_url} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-6 h-6 m-auto mt-3 text-primary/50" />
                  )}
                </div>
                <span className={`text-xs font-bold truncate w-full text-center ${textColor}`}>{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (nextMatch && nextLeftDancer && nextRightDancer) {
      return (
        <div className={`fixed bottom-8 right-8 ${isLight ? 'bg-white/90 border-gray-200' : 'bg-black/80 border-white/20'} ${blurClassSmall} p-5 rounded-2xl border shadow-2xl z-50 animate-slide-up flex flex-col gap-2 backdrop-blur-3xl`}>
          <div className={`text-[10px] uppercase tracking-widest font-bold ${isLight ? 'text-gray-500' : 'text-white/50'}`}>Next Match</div>
          <div className="flex items-center gap-4">
            <span className="font-bold text-primary truncate max-w-[120px] text-lg">{nextLeftDancer.name}</span>
            <span className={`text-xs italic ${isLight ? 'text-gray-400' : 'text-white/40'}`}>vs</span>
            <span className="font-bold text-secondary truncate max-w-[120px] text-lg">{nextRightDancer.name}</span>
          </div>
        </div>
      );
    }

    return null;
  };

  // Active Heat View (Selection Mode)
  if (screenState.active_selection_dancers && screenState.active_selection_dancers.length > 0 && activeHeatDancers.length > 0) {
    return (
      <ScreenWrapper screenState={screenState} dynamicStyles={dynamicStyles} isObs={isObs}>
        <div className="h-full w-full p-4 sm:p-6 md:p-8 flex flex-col items-center justify-center relative overflow-hidden" style={dynamicStyles}>
          {screenState.show_battle_name && (
            <div className="text-center mb-8 sm:mb-16 animate-fade-in relative z-10">
              <h1
                className={`${fontClass} font-bold ${textColor} text-3xl sm:text-4xl md:text-5xl lg:text-6xl drop-shadow-xl`}
                style={{ fontSize: `calc(2rem * ${fontScale.name})` }}
              >
                {battleName}
              </h1>
              <Badge className={`mt-6 px-6 py-2 text-xl tracking-wider uppercase font-bold ${isLight ? 'bg-primary/10 text-primary border-primary/20' : 'bg-primary/20 text-primary border-primary/50'} backdrop-blur-md`}>
                Selection Heat
              </Badge>
            </div>
          )}

          <div className="flex w-full max-w-[1600px] relative z-10 px-4 gap-8">
            {(() => {
              const circles = currentNomination?.concurrent_circles || 1;
              const dancersPerCircle = Math.ceil(activeHeatDancers.length / circles);

              return Array.from({ length: circles }).map((_, circleIndex) => {
                const circleDancers = activeHeatDancers.slice(
                  circleIndex * dancersPerCircle,
                  (circleIndex + 1) * dancersPerCircle
                );

                return (
                  <div key={circleIndex} className="flex-1 flex flex-col items-center gap-6">
                    {circles > 1 && (
                      <div className={`text-2xl font-black uppercase tracking-widest ${isLight ? 'text-primary' : 'text-primary/80'} bg-primary/10 px-8 py-2 rounded-full border border-primary/20`}>
                        Circle {String.fromCharCode(65 + circleIndex)}
                      </div>
                    )}
                    <div className="flex flex-wrap justify-center gap-6 w-full">
                      {circleDancers.map((dancer, idx) => (
                        <Card
                          key={dancer.id}
                          className={`p-6 sm:p-8 md:p-10 ${isLight ? 'bg-white/70 border-white text-gray-900' : 'bg-black/40 border-primary/30 text-white'} backdrop-blur-2xl flex-1 min-w-[250px] max-w-[350px] text-center animate-slide-up shadow-2xl`}
                          style={{ animationDelay: `${(circleIndex * dancersPerCircle + idx) * 150}ms` }}
                        >
                          <div className={`w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 mx-auto rounded-[2rem] bg-primary/10 border-4 border-primary/20 overflow-hidden mb-8 shadow-inner`}>
                            {dancer.photo_url ? (
                              <img src={dancer.photo_url} className="w-full h-full object-cover" />
                            ) : dancer.video_url ? (
                              <video src={dancer.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                            ) : (
                              <User className="w-16 h-16 sm:w-20 sm:h-20 text-primary/60 m-auto mt-8 sm:mt-12" />
                            )}
                          </div>
                          <h2 className={`${fontClass} font-black text-3xl sm:text-4xl md:text-5xl truncate tracking-tight`} style={{ fontSize: `calc(1.8rem * ${fontScale.name})` }}>{dancer.name}</h2>
                          {dancer.city && <p className={`text-xl mt-3 ${isLight ? 'text-gray-500' : 'text-white/60'} font-medium`}>{dancer.city}</p>}
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {renderNextUp()}
        </div>
      </ScreenWrapper>
    );
  }

  // Active match view
  return (
    <ScreenWrapper screenState={screenState} dynamicStyles={dynamicStyles} isObs={isObs}>
      <div className="h-full w-full p-4 sm:p-6 md:p-8" style={dynamicStyles}>
        <div className={`max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8 ${animationClass}`}>
          {/* Battle name */}
          {screenState.show_battle_name && (
            <div className="text-center">
              <h1
                className={`${fontClass} font-bold ${textColor} text-2xl sm:text-3xl md:text-4xl lg:text-5xl`}
                style={{ fontSize: `calc(1.75rem * ${fontScale.name})` }}
              >
                {battleName}
              </h1>
            </div>
          )}

          {/* Timer */}
          {screenState.show_timer && (
            <div className="text-center">
              <div className={`inline-block ${isLight ? 'bg-white/80' : 'bg-black/60'} ${blurClass} rounded-xl sm:rounded-2xl px-6 py-3 sm:px-8 sm:py-4 md:px-12 md:py-6`}>
                <div
                  className={`${fontClass} font-bold ${textColor} tabular-nums text-3xl sm:text-4xl md:text-5xl lg:text-6xl ${screenState.timer_running && timeLeft <= 10 ? 'text-red-500 animate-pulse' : ''}`}
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
            <Card className={`p-4 sm:p-6 md:p-8 ${mainCardBgClassLeft} ${blurClassSmall} order-1 md:order-1`}>
              <div className="text-center space-y-3 sm:space-y-4 md:space-y-6">
                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 mx-auto rounded-2xl md:rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 overflow-hidden">
                  {leftDancer?.video_url ? (
                    <video src={leftDancer.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                  ) : leftDancer?.photo_url ? (
                    <img src={leftDancer.photo_url} alt={leftDancer.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-primary" />
                  )}
                </div>
                <div>
                  <h2
                    className={`${fontClass} font-bold text-primary text-xl sm:text-2xl md:text-3xl lg:text-4xl`}
                    style={{ fontSize: `calc(1.5rem * ${fontScale.name})` }}
                  >
                    {leftDancer?.name || "Waiting"}
                  </h2>
                  {leftDancer?.city && (
                    <p className={`text-sm sm:text-base md:text-lg lg:text-xl ${mutedTextColor} mt-1 sm:mt-2`}>{leftDancer.city}</p>
                  )}
                </div>

                {/* Left Dancer Stats (Player Card Overlay) */}
                {leftDancer && (leftDancer.wins_count != null || leftDancer.battles_count != null) && (
                  <div className={`mt-4 grid grid-cols-2 gap-2 text-sm sm:text-base ${isLight ? 'bg-white/50' : 'bg-black/30'} rounded-xl p-3 backdrop-blur-sm`}>
                    <div className="flex flex-col items-center border-r border-primary/20">
                      <span className={`text-xs uppercase tracking-wider ${mutedTextColor}`}>Wins</span>
                      <span className={`font-bold text-primary ${fontClass}`}>{leftDancer.wins_count || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className={`text-xs uppercase tracking-wider ${mutedTextColor}`}>Winrate</span>
                      <span className={`font-bold text-primary ${fontClass}`}>
                        {leftDancer.battles_count ? Math.round(((leftDancer.wins_count || 0) / leftDancer.battles_count) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Center - VS and score */}
            <div className="text-center space-y-4 sm:space-y-6 md:space-y-8 order-3 md:order-2 py-4 md:py-0">
              <div
                className={`${fontClass} font-bold ${isLight ? 'text-gray-300' : 'text-white/30'} text-4xl sm:text-5xl md:text-6xl lg:text-7xl`}
                style={{ fontSize: `calc(3rem * ${fontScale.name})` }}
              >
                VS
              </div>

              {screenState.show_score && (
                <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8">
                  <div
                    className={`${fontClass} font-bold text-primary text-4xl sm:text-5xl md:text-6xl lg:text-7xl`}
                    style={{ fontSize: `calc(3rem * ${fontScale.name})`, textShadow: '0 0 30px hsl(var(--primary)/0.5)' }}
                  >
                    {screenState.votes_left}
                  </div>
                  <div className={`text-2xl sm:text-3xl md:text-4xl ${isLight ? 'text-gray-400' : 'text-white/50'}`}>—</div>
                  <div
                    className={`${fontClass} font-bold text-secondary text-4xl sm:text-5xl md:text-6xl lg:text-7xl`}
                    style={{ fontSize: `calc(3rem * ${fontScale.name})`, textShadow: '0 0 30px hsl(var(--secondary)/0.5)' }}
                  >
                    {screenState.votes_right}
                  </div>
                </div>
              )}

              {screenState.show_round_info && (
                <div className="space-y-2 sm:space-y-4">
                  <Badge
                    className={`px-4 py-2 sm:px-6 sm:py-3 text-base sm:text-lg md:text-xl ${isLight ? 'bg-gray-200 text-gray-900' : 'bg-black/60 text-white'} border-transparent`}
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
            <Card className={`p-4 sm:p-6 md:p-8 ${mainCardBgClassRight} ${blurClassSmall} order-2 md:order-3`}>
              <div className="text-center space-y-3 sm:space-y-4 md:space-y-6">
                <div className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 mx-auto rounded-2xl md:rounded-3xl bg-secondary/10 flex items-center justify-center border-2 border-secondary/20 overflow-hidden">
                  {rightDancer?.video_url ? (
                    <video src={rightDancer.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
                  ) : rightDancer?.photo_url ? (
                    <img src={rightDancer.photo_url} alt={rightDancer.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-secondary" />
                  )}
                </div>
                <div>
                  <h2
                    className={`${fontClass} font-bold text-secondary text-xl sm:text-2xl md:text-3xl lg:text-4xl`}
                    style={{ fontSize: `calc(1.5rem * ${fontScale.name})` }}
                  >
                    {rightDancer?.name || "Waiting"}
                  </h2>
                  {rightDancer?.city && (
                    <p className={`text-sm sm:text-base md:text-lg lg:text-xl ${mutedTextColor} mt-1 sm:mt-2`}>{rightDancer.city}</p>
                  )}
                </div>

                {/* Right Dancer Stats (Player Card Overlay) */}
                {rightDancer && (rightDancer.wins_count != null || rightDancer.battles_count != null) && (
                  <div className={`mt-4 grid grid-cols-2 gap-2 text-sm sm:text-base ${isLight ? 'bg-white/50' : 'bg-black/30'} rounded-xl p-3 backdrop-blur-sm`}>
                    <div className="flex flex-col items-center border-r border-secondary/20">
                      <span className={`text-xs uppercase tracking-wider ${mutedTextColor}`}>Wins</span>
                      <span className={`font-bold text-secondary ${fontClass}`}>{rightDancer.wins_count || 0}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className={`text-xs uppercase tracking-wider ${mutedTextColor}`}>Winrate</span>
                      <span className={`font-bold text-secondary ${fontClass}`}>
                        {rightDancer.battles_count ? Math.round(((rightDancer.wins_count || 0) / rightDancer.battles_count) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Voting Breakdown Table */}
          {renderVoteBreakdown()}

          {/* Next Up Overlay */}
          {renderNextUp()}
        </div>
      </div>
    </ScreenWrapper>
  );
}
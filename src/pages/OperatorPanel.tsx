import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Monitor, Play, RotateCcw, Trophy, Eye,
  Palette, MessageSquare, Timer,
  PlayCircle, PauseCircle, SkipForward, Volume2, VolumeX,
  Keyboard, Layout, Settings, Users, ChevronLeft, ChevronRight, X
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SliderVoting from "@/components/SliderVoting";
import ScreenTemplates from "@/components/ScreenTemplates";
import JudgeAssignmentsModal from "@/components/JudgeAssignmentsModal";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useKeyboardShortcuts, SHORTCUT_HINTS } from "@/hooks/useKeyboardShortcuts";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";
import BracketSetup from "@/components/BracketSetup";

interface Match {
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

interface Judge {
  id: string;
  name: string;
}

interface JudgeVote {
  id: string;
  judge_id: string;
  vote_for: string | null;
  slider_technique: number | null;
  slider_musicality: number | null;
  slider_performance: number | null;
}

interface ScreenState {
  id: string;
  current_match_id: string | null;
  nomination_id: string | null;
  current_round: number;
  show_judges: boolean;
  show_timer: boolean;
  timer_seconds: number;
  show_winner: boolean;
  show_score: boolean;
  rounds_to_win: number;
  votes_left: number;
  votes_right: number;
  show_bracket: boolean;
  bracket_layout: "symmetric" | "linear";
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
  sound_enabled: boolean;
  show_template: boolean;
  active_template_id: string | null;
  bracket_style: string;
  font_family: string;
  primary_color: string | null;
  secondary_color: string | null;
  active_selection_dancers?: string[] | null;
  next_selection_dancers?: string[] | null;
  next_match_id?: string | null;
}

const THEME_PRESETS = {
  dark: { bg: '#1a1a2e', gradientFrom: '#1a1a2e', gradientTo: '#16213e' },
  light: { bg: '#f8fafc', gradientFrom: '#f8fafc', gradientTo: '#e2e8f0' },
  neon: { bg: '#0a0a0a', gradientFrom: '#1a0a2e', gradientTo: '#0a1a2e' },
  classic: { bg: '#1f2937', gradientFrom: '#1f2937', gradientTo: '#111827' },
  fire: { bg: '#1a0a0a', gradientFrom: '#2d1a1a', gradientTo: '#1a0a0a' },
  ocean: { bg: '#0a1a2e', gradientFrom: '#0a2e3d', gradientTo: '#0a1a2e' },
};

export default function OperatorPanel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [screenState, setScreenState] = useState<ScreenState | null>(null);
  const [nominations, setNominations] = useState<any[]>([]);
  const [selectedNomination, setSelectedNomination] = useState<string>("");

  const currentNomination = nominations.find((n) => n.id === selectedNomination);
  const currentNominationIndex = nominations.findIndex((n) => n.id === selectedNomination);

  // Screen settings
  const [showJudges, setShowJudges] = useState(true);
  const [showTimer, setShowTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(2);
  const [showWinner, setShowWinner] = useState(false);
  const [showScore, setShowScore] = useState(true);
  const [roundsToWin, setRoundsToWin] = useState(2);
  const [currentRound, setCurrentRound] = useState(1);
  const [votesLeft, setVotesLeft] = useState(0);
  const [votesRight, setVotesRight] = useState(0);
  const [showBracket, setShowBracket] = useState(false);
  const [bracketLayout, setBracketLayout] = useState<"symmetric" | "linear">("symmetric");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [judgingMode, setJudgingMode] = useState<string>("simple");
  const [voteCount, setVoteCount] = useState(0);
  const [totalJudges, setTotalJudges] = useState(0);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [judgeVotes, setJudgeVotes] = useState<JudgeVote[]>([]);
  const [selectionScores, setSelectionScores] = useState<any[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Customization settings
  const [aspectRatio, setAspectRatio] = useState("auto");
  const [backgroundType, setBackgroundType] = useState("solid");
  const [backgroundColor, setBackgroundColor] = useState("#1a1a2e");
  const [gradientFrom, setGradientFrom] = useState("#1a1a2e");
  const [gradientTo, setGradientTo] = useState("#16213e");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [fontSize, setFontSize] = useState("normal");
  const [customMessage, setCustomMessage] = useState("");
  const [showCustomMessage, setShowCustomMessage] = useState(false);
  const [animationStyle, setAnimationStyle] = useState("fade");
  const [showBattleName, setShowBattleName] = useState(true);
  const [showRoundInfo, setShowRoundInfo] = useState(true);
  const [timerRunning, setTimerRunning] = useState(false);
  const [themePreset, setThemePreset] = useState("dark");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // New Engine settings
  const [bracketStyle, setBracketStyle] = useState("solid");
  const [fontFamily, setFontFamily] = useState("display");
  const [primaryColor, setPrimaryColor] = useState("");
  const [secondaryColor, setSecondaryColor] = useState("");
  const [showLivePreview, setShowLivePreview] = useState(false);
  const [showAudienceQR, setShowAudienceQR] = useState(true);
  const [autoAdvanceOnTimer, setAutoAdvanceOnTimer] = useState(false);
  const timerEndRef = useRef<string | null>(null);
  const { playSound, preloadAll } = useSoundEffects(soundEnabled);

  useEffect(() => {
    preloadAll();
  }, [preloadAll]);

  // Auto-advance when timer ends
  useEffect(() => {
    if (!autoAdvanceOnTimer || !screenState?.timer_running || !screenState?.timer_end_time) {
      timerEndRef.current = null;
      return;
    }

    timerEndRef.current = screenState.timer_end_time;

    const checkTimer = () => {
      if (!timerEndRef.current) return;
      const endTime = new Date(timerEndRef.current).getTime();
      const now = Date.now();
      if (now >= endTime) {
        // Timer ended - auto advance
        playSound("timerEnd");
        toast({ title: "⏱️ Timer ended!", description: "Auto-advancing to next round..." });
        nextRound();
        stopTimer();
      }
    };

    const interval = setInterval(checkTimer, 1000);
    return () => clearInterval(interval);
  }, [autoAdvanceOnTimer, screenState?.timer_running, screenState?.timer_end_time]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const channelId = Math.random().toString(36).substring(7);
    const screenChannel = supabase
      .channel(`operator-screen-updates-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'screen_state'
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(screenChannel);
    };
  }, [id]);

  useEffect(() => {
    if (selectedNomination) {
      loadMatches();
    }
  }, [selectedNomination]);

  useEffect(() => {
    if (!selectedNomination) return;

    const channelId = Math.random().toString(36).substring(7);
    const nominationDataChannel = supabase
      .channel(`operator-nomination-updates-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches'
        },
        () => loadMatches()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dancers'
        },
        () => loadMatches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(nominationDataChannel);
    };
  }, [selectedNomination]);

  // Real-time vote subscription
  useEffect(() => {
    if (!screenState?.current_match_id) {
      setVoteCount(0);
      setJudgeVotes([]);
      return;
    }

    const loadVotes = async () => {
      if (!screenState?.current_match_id) return;
      const { data: votes } = await supabase
        .from("match_votes")
        .select("*")
        .eq("match_id", screenState.current_match_id)
        .eq("round_number", currentRound);

      if (votes) {
        setVoteCount(votes.length);
        setJudgeVotes(votes);
      } else {
        setVoteCount(0);
        setJudgeVotes([]);
      }
    };

    const loadJudges = async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("battle_id", id)
        .eq("role", "judge");

      if (roles) {
        setTotalJudges(roles.length);
        const judgeProfiles = await Promise.all(
          roles.map(async (r) => {
            const { data } = await supabase
              .from("profiles")
              .select("id, full_name")
              .eq("id", r.user_id)
              .maybeSingle();
            return { id: r.user_id, name: data?.full_name || "Unknown Judge" };
          })
        );
        setJudges(judgeProfiles);
      } else {
        setTotalJudges(0);
        setJudges([]);
      }
    };

    loadVotes();
    loadJudges();

    const channelId = Math.random().toString(36).substring(7);
    const voteChannel = supabase
      .channel(`operator-vote-updates-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_votes'
        },
        () => loadVotes()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(voteChannel);
    };
  }, [screenState?.current_match_id, currentRound, id]);

  // Real-time selection scores subscription
  useEffect(() => {
    if (currentNomination?.phase !== 'selection' || !screenState?.active_selection_dancers || screenState.active_selection_dancers.length === 0) {
      setSelectionScores([]);
      return;
    }

    const loadSelectionScores = async () => {
      if (!screenState?.active_selection_dancers || screenState.active_selection_dancers.length === 0) return;

      // Load judges for this battle if not already loaded (handles case where matches haven't loaded them yet)
      if (judges.length === 0) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("battle_id", id)
          .eq("role", "judge");

        if (roles) {
          setTotalJudges(roles.length);
          const judgeProfiles = await Promise.all(
            roles.map(async (r) => {
              const { data } = await supabase.from("profiles").select("id, full_name").eq("id", r.user_id).maybeSingle();
              return { id: r.user_id, name: data?.full_name || "Unknown Judge" };
            })
          );
          setJudges(judgeProfiles);
        }
      }

      const { data: scores } = await supabase
        .from("selection_scores")
        .select("*")
        .eq("nomination_id", selectedNomination)
        .in("dancer_id", screenState.active_selection_dancers);

      setSelectionScores(scores || []);
    };

    loadSelectionScores();

    const channelId = Math.random().toString(36).substring(7);
    const scoreChannel = supabase
      .channel(`operator-selection-scores-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'selection_scores'
        },
        () => loadSelectionScores()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(scoreChannel);
    };
  }, [currentNomination?.phase, screenState?.active_selection_dancers, selectedNomination, id]);

  const loadData = async () => {
    try {
      const { data: nominationsData } = await supabase
        .from("nominations")
        .select("*")
        .eq("battle_id", id);

      setNominations(nominationsData || []);
      if (nominationsData && nominationsData.length > 0) {
        setSelectedNomination(nominationsData[0].id);
      }

      const { data: stateDataArray } = await supabase
        .from("screen_state")
        .select("*")
        .eq("battle_id", id)
        .order("created_at", { ascending: false })
        .limit(1);

      const stateData = stateDataArray && stateDataArray.length > 0 ? stateDataArray[0] : null;

      if (stateData) {
        setScreenState(stateData as unknown as ScreenState);
        setShowJudges(stateData.show_judges);
        setShowTimer(stateData.show_timer);
        setTimerMinutes(Math.floor(stateData.timer_seconds / 60));
        setShowWinner(stateData.show_winner);
        setShowScore(stateData.show_score);
        setRoundsToWin(stateData.rounds_to_win);
        setCurrentRound(stateData.current_round);
        setVotesLeft(stateData.votes_left);
        setVotesRight(stateData.votes_right);
        setShowBracket(stateData.show_bracket || false);
        setBracketLayout((stateData as any).bracket_layout || "symmetric");
        setAspectRatio((stateData as any).aspect_ratio || "auto");
        setBackgroundType(stateData.background_type || "solid");
        setBackgroundColor(stateData.background_color || "#1a1a2e");
        setGradientFrom(stateData.background_gradient_from || "#1a1a2e");
        setGradientTo(stateData.background_gradient_to || "#16213e");
        setBackgroundImageUrl(stateData.background_image_url || "");
        setFontSize(stateData.font_size || "normal");
        setCustomMessage(stateData.custom_message || "");
        setShowCustomMessage(stateData.show_custom_message || false);
        setAnimationStyle(stateData.animation_style || "fade");
        setShowBattleName(stateData.show_battle_name !== false);
        setShowRoundInfo(stateData.show_round_info !== false);
        setTimerRunning(stateData.timer_running || false);
        setThemePreset(stateData.theme_preset || "dark");
        setBracketStyle((stateData as any).bracket_style || "solid");
        setFontFamily((stateData as any).font_family || "display");
        setPrimaryColor((stateData as any).primary_color || "");
        setSecondaryColor((stateData as any).secondary_color || "");
      } else {
        await createScreenState();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadMatches = async () => {
    try {
      const { data: matchesData } = await supabase
        .from("matches")
        .select("*")
        .eq("nomination_id", selectedNomination)
        .order("position", { ascending: true });

      setMatches(matchesData || []);

      const { data: dancersData } = await supabase
        .from("dancers")
        .select("*")
        .eq("nomination_id", selectedNomination);

      setDancers(dancersData || []);

      const { data: nominationData } = await supabase
        .from("nominations")
        .select("judging_mode")
        .eq("id", selectedNomination)
        .single();

      if (nominationData) {
        setJudgingMode(nominationData.judging_mode || "simple");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const createScreenState = async () => {
    try {
      const { data, error } = await supabase
        .from("screen_state")
        .insert({
          battle_id: id,
          nomination_id: selectedNomination || null,
          show_judges: true,
          show_timer: false,
          timer_seconds: 120,
          show_winner: false,
          show_score: true,
          rounds_to_win: 2,
          current_round: 1,
          votes_left: 0,
          votes_right: 0,
          // Removed bracket_style & font_family from initial insert to prevent crash (unmigrated DBs)
        })
        .select()
        .single();

      if (error) throw error;
      setScreenState(data as unknown as ScreenState);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateScreenState = async (updates: Partial<ScreenState>) => {
    if (!screenState) return;

    try {
      // Optimistically update the UI to prevent unmigrated DB lag or realtime broadcast drops
      setScreenState(prev => prev ? { ...prev, ...updates } : null);

      // Filter out experimental design columns to prevent crashing unmigrated databases
      const safeUpdates = { ...updates } as any;
      delete safeUpdates.bracket_style;
      delete safeUpdates.font_family;
      delete safeUpdates.primary_color;
      delete safeUpdates.secondary_color;
      // theme_preset is a valid DB column — do NOT delete it

      const { error } = await supabase
        .from("screen_state")
        .update(safeUpdates)
        .eq("id", screenState.id);

      if (error) {
        // Log the error to console and throw
        console.error("SUPABASE UPDATE ERROR:", error);
        loadData();
        throw error;
      }
    } catch (error: any) {
      alert(`DB ERROR: ${error.message} \n ${JSON.stringify(error)}`);
      toast({
        title: "Error updating screen",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const showMatch = async (matchId: string) => {
    if (!screenState) {
      toast({
        title: "Error",
        description: "Screen state not initialized",
        variant: "destructive",
      });
      return;
    }

    // Force local React state immediately so UI drops the bracket instantly
    setShowBracket(false);
    setCurrentRound(1);
    setVotesLeft(0);
    setVotesRight(0);
    setShowCustomMessage(false);

    const matchIndex = matches.findIndex(m => m.id === matchId);
    const nextMatchId = matchIndex >= 0 && matchIndex < matches.length - 1 ? matches[matchIndex + 1].id : null;

    await updateScreenState({
      current_match_id: matchId,
      next_match_id: nextMatchId,
      nomination_id: selectedNomination || null,
      show_winner: false,
      show_bracket: false,
      show_custom_message: false,
      current_round: 1,
      votes_left: 0,
      votes_right: 0,
    });

    toast({
      title: "Match started",
      description: "Match is now live",
    });
  };

  const applySettings = async () => {
    await updateScreenState({
      show_judges: showJudges,
      show_timer: showTimer,
      timer_seconds: timerMinutes * 60,
      show_score: showScore,
      rounds_to_win: roundsToWin,
      show_battle_name: showBattleName,
      show_round_info: showRoundInfo,
      aspect_ratio: aspectRatio,
    } as any);
    toast({ title: "Settings applied" });
  };

  const applyDesign = async () => {
    await updateScreenState({
      background_type: backgroundType,
      background_color: backgroundColor,
      background_gradient_from: gradientFrom,
      background_gradient_to: gradientTo,
      background_image_url: backgroundImageUrl || null,
      font_size: fontSize,
      animation_style: animationStyle,
      theme_preset: themePreset,
      bracket_style: bracketStyle,
      font_family: fontFamily,
      primary_color: primaryColor || null,
      secondary_color: secondaryColor || null,
    } as any);
    toast({ title: "Design applied" });
  };

  const applyThemePreset = (preset: string) => {
    setThemePreset(preset);
    const theme = THEME_PRESETS[preset as keyof typeof THEME_PRESETS];
    if (theme) {
      setBackgroundColor(theme.bg);
      setGradientFrom(theme.gradientFrom);
      setGradientTo(theme.gradientTo);
    }
  };

  const sendCustomMessage = async () => {
    await updateScreenState({
      custom_message: customMessage,
      show_custom_message: showCustomMessage,
    });
    toast({ title: "Message sent" });
  };

  const resetMatch = async () => {
    setCurrentRound(1);
    setVotesLeft(0);
    setVotesRight(0);
    await updateScreenState({
      current_round: 1,
      votes_left: 0,
      votes_right: 0,
      show_winner: false,
    });
  };

  const toggleBracket = async (layout?: "symmetric" | "linear") => {
    if (layout) {
      if (showBracket && bracketLayout === layout) {
        setShowBracket(false);
        await updateScreenState({ show_bracket: false } as any);
      } else {
        setShowBracket(true);
        setBracketLayout(layout);
        await updateScreenState({
          show_bracket: true,
          bracket_layout: layout,
        } as any);
      }
    } else {
      const newValue = !showBracket;
      setShowBracket(newValue);
      await updateScreenState({
        show_bracket: newValue,
        bracket_layout: bracketLayout,
      } as any);
    }
  };

  const clearScreen = async () => {
    setShowBracket(false);
    setShowCustomMessage(false);
    await updateScreenState({
      current_match_id: null,
      next_match_id: null,
      show_bracket: false,
      show_winner: false,
      show_custom_message: false,
      active_selection_dancers: [],
      next_selection_dancers: [],
    });
    toast({ title: "Screen cleared" });
  };

  const startTimer = async () => {
    const endTime = new Date(Date.now() + timerMinutes * 60 * 1000).toISOString();
    setTimerRunning(true);
    playSound("timerStart");
    await updateScreenState({
      timer_running: true,
      timer_end_time: endTime,
      show_timer: true,
    });
  };

  const stopTimer = async () => {
    setTimerRunning(false);
    playSound("timerEnd");
    await updateScreenState({
      timer_running: false,
      timer_end_time: null,
    });
  };

  const nextRound = async () => {
    const maxRounds = currentNomination?.rounds_to_win ? currentNomination.rounds_to_win + 2 : 5;
    if (currentRound >= maxRounds) {
      toast({ title: "Maximum rounds reached", description: "This battle has hit the round limit based on its settings.", variant: "destructive" });
      return;
    }
    const newRound = currentRound + 1;
    setCurrentRound(newRound);
    playSound("roundStart");
    await updateScreenState({
      current_round: newRound,
    });
  };

  const addScore = async (side: 'left' | 'right') => {
    playSound("vote");
    if (side === 'left') {
      const newScore = votesLeft + 1;
      setVotesLeft(newScore);
      await updateScreenState({ votes_left: newScore });
    } else {
      const newScore = votesRight + 1;
      setVotesRight(newScore);
      await updateScreenState({ votes_right: newScore });
    }
  };

  const declareWinner = async () => {
    playSound("winner");
    await updateScreenState({ show_winner: true });
  };

  const triggerTieBreaker = async () => {
    playSound("timerStart"); // A loud sound
    await updateScreenState({
      custom_message: "TIE BREAKER!\nONE MORE ROUND",
      show_custom_message: true,
      animation_style: "scale", // A poppy animation
      theme_preset: "neon", // Switch to neon for a sick look
    });

    // Optional: auto-revert after 6 seconds
    setTimeout(async () => {
      await updateScreenState({
        show_custom_message: false,
      });
    }, 6000);
  };

  const setJudgeVote = async (judgeId: string, voteFor: string | null) => {
    if (!currentMatch) return;
    if (!window.confirm("Are you sure you want to manually set this judge's vote?")) return;

    try {
      const { error } = await supabase
        .from("match_votes")
        .upsert({
          match_id: currentMatch.id,
          judge_id: judgeId,
          round_number: currentRound,
          vote_for: voteFor,
        }, {
          onConflict: 'match_id,judge_id,round_number'
        });

      if (error) throw error;
      toast({ title: "Vote Overridden", description: "Successfully updated judge's vote." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const clearJudgeVote = async (judgeId: string) => {
    if (!currentMatch) return;
    if (!window.confirm("Are you sure you want to clear this judge's vote?")) return;

    try {
      const { error } = await supabase
        .from("match_votes")
        .delete()
        .eq("match_id", currentMatch.id)
        .eq("judge_id", judgeId)
        .eq("round_number", currentRound);

      if (error) throw error;
      toast({ title: "Vote Cleared", description: "Judge's vote has been deleted." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const showTemplate = async (template: any) => {
    await updateScreenState({
      show_template: true,
      active_template_id: template.id,
      custom_message: template.title,
      show_custom_message: true,
    });
  };

  const hideTemplate = async () => {
    await updateScreenState({
      show_template: false,
      active_template_id: null,
      show_custom_message: false,
    });
  };

  const openScreen = () => {
    window.open(`/battle/${id}/screen`, '_blank');
  };

  useKeyboardShortcuts({
    onStartTimer: () => !timerRunning && startTimer(),
    onStopTimer: stopTimer,
    onNextRound: nextRound,
    onAddScoreLeft: () => addScore('left'),
    onAddScoreRight: () => addScore('right'),
    onShowWinner: declareWinner,
    onToggleBracket: toggleBracket,
    onResetMatch: resetMatch,
    onOpenScreen: openScreen,
  });

  const getDancerName = (dancerId: string | null) => {
    if (!dancerId) return "TBD";
    const dancer = dancers.find(d => d.id === dancerId);
    return dancer ? dancer.name : "?";
  };

  const getCurrentMatch = () => {
    if (!screenState?.current_match_id) return null;
    return matches.find(m => m.id === screenState.current_match_id);
  };

  const currentMatch = getCurrentMatch();

  const goToNextNomination = useCallback(() => {
    if (nominations.length <= 1) return;
    const nextIndex = (currentNominationIndex + 1) % nominations.length;
    const nextNomId = nominations[nextIndex].id;
    setSelectedNomination(nextNomId);
    updateScreenState({ nomination_id: nextNomId });
  }, [nominations, currentNominationIndex]);

  const goToPrevNomination = useCallback(() => {
    if (nominations.length <= 1) return;
    const prevIndex = currentNominationIndex <= 0 ? nominations.length - 1 : currentNominationIndex - 1;
    const prevNomId = nominations[prevIndex].id;
    setSelectedNomination(prevNomId);
    updateScreenState({ nomination_id: prevNomId });
  }, [nominations, currentNominationIndex]);

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNextNomination,
    onSwipeRight: goToPrevNomination,
  });

  const selectionFormat = currentNomination?.selection_format || 1;
  const concurrentCircles = currentNomination?.concurrent_circles || 1;
  const totalDancersPerHeat = selectionFormat * concurrentCircles;

  const heats = [];
  if (currentNomination?.phase === 'selection') {
    for (let i = 0; i < dancers.length; i += totalDancersPerHeat) {
      heats.push(dancers.slice(i, i + totalDancersPerHeat));
    }
  }

  const startHeat = async (heatIndex: number) => {
    const heatDancers = heats[heatIndex].map(d => d.id);
    const nextHeatDancers = heats[heatIndex + 1]?.map(d => d.id) || [];

    await updateScreenState({
      current_match_id: null,
      active_selection_dancers: heatDancers,
      next_selection_dancers: nextHeatDancers,
      show_custom_message: false,
      show_bracket: false,
      timer_running: false,
      timer_end_time: null,
    });

    toast({ title: "Heat Live", description: `Heat ${heatIndex + 1} is now on stage.` });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="flex items-center justify-between px-3 py-2 gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/battle/${id}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant={showLivePreview ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowLivePreview(!showLivePreview)}
              className="text-primary hover:text-primary hover:bg-primary/10"
              title="Toggle Live Preview"
            >
              <Monitor className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSoundEnabled(!soundEnabled)}
            >
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="hidden sm:flex">
                  <Keyboard className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Shortcuts</h4>
                  {SHORTCUT_HINTS.map((hint) => (
                    <div key={hint.key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{hint.action}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{hint.key}</Badge>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Preview</DialogTitle>
                </DialogHeader>
                {currentMatch ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-muted-foreground">Round {currentRound}</p>
                    </div>
                    {judgingMode === "simple" ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <Card className="p-4 md:p-6 text-center border-primary/50">
                          <div className="space-y-3">
                            <div className="text-xl md:text-2xl font-bold text-primary">
                              {getDancerName(currentMatch.dancer_left_id)}
                            </div>
                            <Button disabled className="w-full bg-primary">
                              <Trophy className="mr-2 h-4 w-4" />
                              Vote
                            </Button>
                          </div>
                        </Card>
                        <div className="text-center text-2xl md:text-3xl font-bold text-muted-foreground">VS</div>
                        <Card className="p-4 md:p-6 text-center border-secondary/50">
                          <div className="space-y-3">
                            <div className="text-xl md:text-2xl font-bold text-secondary">
                              {getDancerName(currentMatch.dancer_right_id)}
                            </div>
                            <Button disabled className="w-full bg-secondary">
                              <Trophy className="mr-2 h-4 w-4" />
                              Vote
                            </Button>
                          </div>
                        </Card>
                      </div>
                    ) : (
                      <SliderVoting
                        matchId={currentMatch.id}
                        dancerLeft={{ name: getDancerName(currentMatch.dancer_left_id), city: null }}
                        dancerRight={{ name: getDancerName(currentMatch.dancer_right_id), city: null }}
                        currentRound={currentRound}
                        onSubmit={() => { }}
                        disabled
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a match to preview
                  </div>
                )}
              </DialogContent>
            </Dialog>

            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  {/* Display Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Display
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Show Battle Name</Label>
                        <Switch checked={showBattleName} onCheckedChange={setShowBattleName} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Show Judges</Label>
                        <Switch checked={showJudges} onCheckedChange={setShowJudges} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Show Timer</Label>
                        <Switch checked={showTimer} onCheckedChange={setShowTimer} />
                      </div>
                      {showTimer && (
                        <div className="flex items-center justify-between">
                          <Label>Timer (min)</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={timerMinutes}
                            onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 1)}
                            className="w-20"
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <Label>Show Score</Label>
                        <Switch checked={showScore} onCheckedChange={setShowScore} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Audience QR on Screen</Label>
                        <Switch checked={showAudienceQR} onCheckedChange={setShowAudienceQR} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Auto-advance on timer end</Label>
                        <Switch checked={autoAdvanceOnTimer} onCheckedChange={setAutoAdvanceOnTimer} />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Rounds to Win</Label>
                        <Input
                          type="number"
                          min="1"
                          max="5"
                          value={roundsToWin}
                          onChange={(e) => setRoundsToWin(parseInt(e.target.value) || 2)}
                          className="w-20"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Aspect Ratio</Label>
                        <Select value={aspectRatio} onValueChange={setAspectRatio}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">Auto (Fill)</SelectItem>
                            <SelectItem value="16:9">16:9 (TV)</SelectItem>
                            <SelectItem value="4:3">4:3 (Old TV)</SelectItem>
                            <SelectItem value="1:1">1:1 (Square)</SelectItem>
                            <SelectItem value="9:16">9:16 (Vertical)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={applySettings} size="sm" className="w-full">Apply Display</Button>
                    </div>
                  </div>

                  {/* Design Settings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Theme
                    </h3>
                    <div className="space-y-3">
                      <Select value={themePreset} onValueChange={applyThemePreset}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="neon">Neon</SelectItem>
                          <SelectItem value="classic">Classic</SelectItem>
                          <SelectItem value="fire">Fire</SelectItem>
                          <SelectItem value="ocean">Ocean</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={backgroundType} onValueChange={setBackgroundType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Background type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid</SelectItem>
                          <SelectItem value="gradient">Gradient</SelectItem>
                          <SelectItem value="image">Image</SelectItem>
                        </SelectContent>
                      </Select>
                      {backgroundType === "solid" && (
                        <div className="flex gap-2">
                          <Input type="color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="w-12 h-9 p-1" />
                          <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="flex-1" />
                        </div>
                      )}
                      {backgroundType === "gradient" && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <Input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="w-12 h-9 p-1" />
                            <Input value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="flex-1" />
                          </div>
                          <div className="flex gap-2">
                            <Input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="w-12 h-9 p-1" />
                            <Input value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="flex-1" />
                          </div>
                        </div>
                      )}
                      {backgroundType === "image" && (
                        <Input placeholder="Image URL" value={backgroundImageUrl} onChange={(e) => setBackgroundImageUrl(e.target.value)} />
                      )}

                      {/* Advanced Styling */}
                      <Select value={bracketStyle} onValueChange={setBracketStyle}>
                        <SelectTrigger>
                          <SelectValue placeholder="Bracket Style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solid">Solid Base</SelectItem>
                          <SelectItem value="glass">Glassmorphism</SelectItem>
                          <SelectItem value="neon">Neon Wireframe</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={fontFamily} onValueChange={setFontFamily}>
                        <SelectTrigger>
                          <SelectValue placeholder="Typography" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="display">Display (Modern)</SelectItem>
                          <SelectItem value="sans">Sans (Clean)</SelectItem>
                          <SelectItem value="mono">Mono (Tech)</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex gap-2">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Left Color</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={primaryColor || "#ff0000"} onChange={(e) => setPrimaryColor(e.target.value)} className="w-10 h-8 p-1" />
                          </div>
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Right Color</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={secondaryColor || "#0000ff"} onChange={(e) => setSecondaryColor(e.target.value)} className="w-10 h-8 p-1" />
                          </div>
                        </div>
                      </div>

                      <Button onClick={applyDesign} size="sm" className="w-full mt-2">Apply Theme & Styles</Button>
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Message
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Show Message</Label>
                        <Switch checked={showCustomMessage} onCheckedChange={setShowCustomMessage} />
                      </div>
                      <Textarea
                        placeholder="Message to display..."
                        value={customMessage}
                        onChange={(e) => setCustomMessage(e.target.value)}
                        rows={2}
                      />
                      <Button onClick={sendCustomMessage} size="sm" className="w-full">Send Message</Button>
                    </div>
                  </div>

                  {/* Templates */}
                  <div className="space-y-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Layout className="h-4 w-4" />
                      Templates
                    </h3>
                    <ScreenTemplates battleId={id!} onShowTemplate={showTemplate} />
                    {screenState?.show_template && (
                      <Button variant="outline" onClick={hideTemplate} size="sm" className="w-full">
                        Hide Template
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <JudgeAssignmentsModal battleId={id!} />

            <Button onClick={openScreen} size="sm" className="gap-1">
              <Monitor className="h-4 w-4" />
              <span className="hidden sm:inline">Screen</span>
            </Button>
          </div>
        </div>
      </div>

      <div
        className="px-3 py-4 space-y-4 max-w-4xl mx-auto"
        {...swipeHandlers}
      >
        {/* Nomination Tabs with swipe hint */}
        {nominations.length > 1 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                onClick={goToPrevNomination}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex-1 overflow-x-auto mx-2">
                <div className="flex gap-2 justify-center min-w-max">
                  {nominations.map((nom, index) => (
                    <Button
                      key={nom.id}
                      variant={selectedNomination === nom.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedNomination(nom.id);
                        updateScreenState({ nomination_id: nom.id });
                      }}
                      className="shrink-0"
                    >
                      {nom.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={goToNextNomination}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Swipe indicator */}
            <div className="flex justify-center gap-1">
              {nominations.map((nom, index) => (
                <div
                  key={nom.id}
                  className={`w-2 h-2 rounded-full transition-all ${selectedNomination === nom.id ? 'bg-primary w-4' : 'bg-muted-foreground/30'
                    }`}
                />
              ))}
            </div>
          </div>
        )}

        {nominations.length === 1 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {currentNomination?.name}
            </Badge>
          </div>
        )}

        {/* Quick Phase Switch */}
        {currentNomination && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold uppercase tracking-wider">Phase:</span>
            {(["registration", "selection", "bracket", "completed"] as const).map((phase) => {
              const isCurrent = currentNomination.phase === phase;
              const labels: Record<string, string> = { registration: "Reg", selection: "Select", bracket: "Bracket", completed: "Done" };
              return (
                <Button
                  key={phase}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  className={`text-[10px] sm:text-xs h-6 sm:h-7 px-1.5 sm:px-2 ${isCurrent ? "" : "opacity-60"}`}
                  onClick={async () => {
                    if (isCurrent) return;
                    try {
                      const { error } = await supabase
                        .from("nominations")
                        .update({ phase })
                        .eq("id", selectedNomination);
                      if (error) throw error;

                      if (phase === "bracket") {
                        // Clear selection dancers from screen when switching to bracket
                        await updateScreenState({
                          active_selection_dancers: [],
                          next_selection_dancers: [],
                        });
                      }

                      if (phase === "selection") {
                        // Clear match when switching to selection
                        await updateScreenState({
                          current_match_id: null,
                          next_match_id: null,
                        });
                      }

                      toast({ title: "Phase changed", description: `Now in ${labels[phase]} mode` });
                      await loadData();
                      await loadMatches();
                    } catch (error: any) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    }
                  }}
                >
                  {labels[phase]}
                </Button>
              );
            })}
          </div>
        )}

        {/* Active Selection Heat Control */}
        {currentNomination?.phase === 'selection' && screenState?.active_selection_dancers && screenState.active_selection_dancers.length > 0 && (
          <Card className="p-4 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 border-primary/30">
            <div className="space-y-3 text-center">
              <Badge className="bg-primary mb-2">LIVE HEAT</Badge>
              <div className="flex flex-wrap justify-center items-center gap-4">
                {screenState.active_selection_dancers.map((dId, index) => (
                  <div key={dId} className="flex items-center">
                    <span className="text-xl sm:text-2xl font-bold">{getDancerName(dId)}</span>
                    {index < (screenState.active_selection_dancers?.length || 0) - 1 && <span className="mx-4 text-muted-foreground">•</span>}
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" onClick={() => updateScreenState({ active_selection_dancers: [], next_selection_dancers: [] })} className="text-destructive border-destructive/50 hover:bg-destructive/10">
                  Stop Heat
                </Button>
              </div>

              {/* Judge Status for Heat */}
              {screenState.show_judges && judges.length > 0 && (
                <div className="pt-4 border-t border-border/50 text-left mt-4">
                  <div className="text-sm font-semibold mb-2">Judges Status</div>
                  <div className="space-y-1">
                    {judges.map(judge => {
                      const scoresByThisJudge = selectionScores.filter(s => s.judge_id === judge.id);
                      const scoredCount = scoresByThisJudge.length;
                      const totalNeeded = screenState.active_selection_dancers!.length;
                      const isDone = scoredCount === totalNeeded;

                      return (
                        <div key={judge.id} className="flex flex-col p-2 bg-background/50 rounded border text-sm">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-medium">{judge.name}</span>
                            <Badge variant={isDone ? "default" : "secondary"} className={isDone ? "bg-primary hover:bg-primary/90" : ""}>
                              {isDone ? "Done" : `${scoredCount} / ${totalNeeded} scored`}
                            </Badge>
                          </div>
                          {scoresByThisJudge.length > 0 && (
                            <div className="flex gap-2 text-[10px] text-muted-foreground flex-wrap">
                              {screenState.active_selection_dancers!.map(dId => {
                                const s = scoresByThisJudge.find(score => score.dancer_id === dId);
                                if (!s) return null;
                                const totalScore = (s.score_technique || 0) + (s.score_musicality || 0) + (s.score_performance || 0);
                                return (
                                  <span key={dId} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                    {getDancerName(dId).substring(0, 8)}: {totalScore}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Active Match Control */}
        {currentNomination?.phase !== 'selection' && currentMatch && (
          <Card className="p-4 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 border-primary/30">
            <div className="space-y-3">
              {/* Match info */}
              <div className="flex items-center justify-center gap-3 text-center">
                <div className="flex-1 text-right">
                  <div className="text-lg sm:text-xl font-bold text-primary truncate">
                    {getDancerName(currentMatch.dancer_left_id)}
                  </div>
                </div>
                <div className="text-2xl sm:text-3xl font-bold shrink-0">
                  {votesLeft} : {votesRight}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-lg sm:text-xl font-bold text-secondary truncate">
                    {getDancerName(currentMatch.dancer_right_id)}
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-center gap-3 text-sm">
                <Badge variant="outline">Round {currentRound}</Badge>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${voteCount === totalJudges && totalJudges > 0 ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.4)]'} animate-pulse`} />
                  <span className={`font-bold ${voteCount === totalJudges && totalJudges > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>{voteCount}/{totalJudges} votes</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant="outline"
                  onClick={() => addScore('left')}
                  className="border-primary/50 text-primary h-12 flex-col gap-0.5"
                >
                  <span className="text-lg font-bold">+1</span>
                  <span className="text-[10px] uppercase">Red</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => addScore('right')}
                  className="border-secondary/50 text-secondary h-12 flex-col gap-0.5"
                >
                  <span className="text-lg font-bold">+1</span>
                  <span className="text-[10px] uppercase">Blue</span>
                </Button>
                {!timerRunning ? (
                  <Button onClick={startTimer} className="h-12 flex-col gap-0.5">
                    <PlayCircle className="h-5 w-5" />
                    <span className="text-[10px] uppercase">Timer</span>
                  </Button>
                ) : (
                  <Button variant="destructive" onClick={stopTimer} className="h-12 flex-col gap-0.5">
                    <PauseCircle className="h-5 w-5" />
                    <span className="text-[10px] uppercase">Stop</span>
                  </Button>
                )}
                <Button
                  onClick={nextRound}
                  variant="outline"
                  className="h-12 flex-col gap-0.5"
                  disabled={currentRound >= (currentNomination?.rounds_to_win ? currentNomination.rounds_to_win + 2 : 5)}
                >
                  <SkipForward className="h-5 w-5" />
                  <span className="text-[10px] uppercase">Next</span>
                </Button>
              </div>

              {/* Judges Status List */}
              {judges.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Judges Status</h4>
                  <div className="space-y-2">
                    {judges.map(judge => {
                      const vote = judgeVotes.find(v => v.judge_id === judge.id);
                      let voteDisplay = "Thinking...";
                      let voteColor = "text-muted-foreground";

                      if (vote) {
                        if (vote.vote_for === currentMatch.dancer_left_id) {
                          voteDisplay = `Voted ${getDancerName(currentMatch.dancer_left_id)}`;
                          voteColor = "text-primary font-medium";
                        } else if (vote.vote_for === currentMatch.dancer_right_id) {
                          voteDisplay = `Voted ${getDancerName(currentMatch.dancer_right_id)}`;
                          voteColor = "text-secondary font-medium";
                        } else {
                          voteDisplay = "Voted Tie/Skip";
                          voteColor = "text-foreground font-medium";
                        }
                      }

                      return (
                        <div key={judge.id} className={`flex items-center justify-between p-2.5 rounded-lg border text-sm transition-all ${vote ? 'bg-background/50 border-border/50' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${vote ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`} />
                            <span className="font-medium">{judge.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={voteColor}>{voteDisplay}</span>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Settings className="h-3 w-3" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-48 p-2" align="end">
                                <div className="space-y-1">
                                  <div className="text-xs font-semibold mb-2 px-2 text-muted-foreground">Override Vote</div>
                                  <Button variant="ghost" className="w-full justify-start h-8 text-primary font-bold" onClick={() => setJudgeVote(judge.id, currentMatch.dancer_left_id)}>Set: Red</Button>
                                  <Button variant="ghost" className="w-full justify-start h-8 text-secondary font-bold" onClick={() => setJudgeVote(judge.id, currentMatch.dancer_right_id)}>Set: Blue</Button>
                                  <Button variant="ghost" className="w-full justify-start h-8" onClick={() => setJudgeVote(judge.id, null)}>Set: Tie/Skip</Button>
                                  <div className="border-t border-border/50 my-1" />
                                  <Button variant="ghost" className="w-full justify-start h-8 text-destructive" onClick={() => clearJudgeVote(judge.id)}>Clear Vote</Button>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button variant="outline" onClick={resetMatch} className="gap-1 flex-col h-14">
                  <RotateCcw className="h-4 w-4" />
                  <span className="text-[10px] uppercase">Reset</span>
                </Button>
                <Button variant="destructive" onClick={triggerTieBreaker} className="gap-1 flex-col h-14 animate-pulse-soft">
                  <span className="text-xl font-bold">X</span>
                  <span className="text-[10px] uppercase">Tie Break</span>
                </Button>
                <Button onClick={declareWinner} className="gap-1 flex-col h-14 bg-gradient-to-r from-primary to-secondary">
                  <Trophy className="h-4 w-4" />
                  <span className="text-[10px] uppercase">Winner</span>
                </Button>
                <div className="flex flex-col gap-1 h-14 justify-center">
                  <Button
                    variant={showBracket && bracketLayout === "symmetric" ? "default" : "outline"}
                    onClick={() => toggleBracket("symmetric")}
                    className="flex-1 min-h-0 py-0 text-[10px]"
                  >
                    ←|→
                  </Button>
                  <Button
                    variant={showBracket && bracketLayout === "linear" ? "default" : "outline"}
                    onClick={() => toggleBracket("linear")}
                    className="flex-1 min-h-0 py-0 text-[10px]"
                  >
                    →→→
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Matches / Heats List */}
        <div className="space-y-2">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Users className="h-4 w-4" />
            {currentNomination?.phase === 'selection' ? "Selection Heats" : "Matches"}
          </h2>

          {currentNomination?.phase === 'selection' ? (
            heats.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                No dancers registered for this category yet.
              </Card>
            ) : (
              <div className="space-y-2">
                {heats.map((heat, index) => {
                  const isActive = screenState?.active_selection_dancers?.length &&
                    screenState.active_selection_dancers.length > 0 &&
                    screenState.active_selection_dancers[0] === heat[0].id;

                  return (
                    <Card
                      key={`heat-${index}`}
                      className={`p-3 cursor-pointer transition-all ${isActive ? 'ring-2 ring-primary bg-primary/5' : 'hover:border-primary/50'}`}
                      onClick={() => startHeat(index)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="shrink-0 text-xs text-muted-foreground w-16 text-center">
                          Heat {index + 1}
                        </Badge>
                        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0 px-2">
                          {heat.map((d, i) => (
                            <div key={d.id} className="flex items-center">
                              <span className="font-medium truncate">{d.name}</span>
                              {i < heat.length - 1 && <span className="mx-2 text-muted-foreground text-xs opacity-50">•</span>}
                            </div>
                          ))}
                        </div>
                        {isActive ? (
                          <Badge className="shrink-0 bg-primary">LIVE</Badge>
                        ) : (
                          <Button size="sm" variant="ghost" className="shrink-0 gap-1">
                            <Play className="h-3 w-3" />
                            Start
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          ) : (
            matches.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">
                <BracketSetup
                  nominationId={selectedNomination}
                  dancers={dancers}
                  topCount={currentNomination?.top_count || 16}
                  onBracketCreated={loadMatches}
                />
              </Card>
            ) : (
              <div className="space-y-2">
                {matches.map((match) => {
                  const isActive = screenState?.current_match_id === match.id;
                  const hasWinner = match.winner_id !== null;

                  return (
                    <Card
                      key={match.id}
                      className={`p-3 cursor-pointer transition-all ${isActive
                        ? 'ring-2 ring-primary bg-primary/5'
                        : hasWinner
                          ? 'opacity-60'
                          : 'hover:border-primary/50'
                        }`}
                      onClick={() => showMatch(match.id)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="shrink-0 text-xs">
                          {match.round}
                        </Badge>

                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className={`font-medium truncate ${match.winner_id === match.dancer_left_id ? 'text-primary' : ''}`}>
                            {getDancerName(match.dancer_left_id)}
                          </span>
                          <span className="text-muted-foreground shrink-0">vs</span>
                          <span className={`font-medium truncate ${match.winner_id === match.dancer_right_id ? 'text-secondary' : ''}`}>
                            {getDancerName(match.dancer_right_id)}
                          </span>
                        </div>

                        {isActive && (
                          <Badge className="shrink-0 bg-primary">LIVE</Badge>
                        )}
                        {hasWinner && !isActive && (
                          <Badge variant="secondary" className="shrink-0">Done</Badge>
                        )}
                        {!isActive && !hasWinner && (
                          <Button size="sm" variant="ghost" className="shrink-0 gap-1">
                            <Play className="h-3 w-3" />
                            Start
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

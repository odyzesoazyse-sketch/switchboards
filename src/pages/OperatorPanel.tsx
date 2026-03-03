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
  Keyboard, Layout, Settings, Users, ChevronLeft, ChevronRight, X, Mic, Zap,
  ChevronDown, ExternalLink
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
import AiTimekeeper from "@/components/AiTimekeeper";
import LlmPostGenerator from "@/components/LlmPostGenerator";
import NfcCheckin from "@/components/NfcCheckin";
import CyberRoulette from "@/components/CyberRoulette";
import LivePrizePool from "@/components/LivePrizePool";
import SpiderChart from "@/components/SpiderChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// ── Types ──
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
  const [showRoulette, setShowRoulette] = useState(false);
  const [battleData, setBattleData] = useState<any>(null);
  const { playSound, preloadAll } = useSoundEffects(soundEnabled);

  // UI state for progressive disclosure
  const [judgesExpanded, setJudgesExpanded] = useState(false);

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
        { event: '*', schema: 'public', table: 'screen_state' },
        () => { loadData(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(screenChannel); };
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadMatches())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dancers' }, () => loadMatches())
      .subscribe();

    return () => { supabase.removeChannel(nominationDataChannel); };
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_votes' }, () => loadVotes())
      .subscribe();

    return () => { supabase.removeChannel(voteChannel); };
  }, [screenState?.current_match_id, currentRound, id]);

  // Real-time selection scores subscription
  useEffect(() => {
    if (currentNomination?.phase !== 'selection' || !screenState?.active_selection_dancers || screenState.active_selection_dancers.length === 0) {
      setSelectionScores([]);
      return;
    }

    const loadSelectionScores = async () => {
      if (!screenState?.active_selection_dancers || screenState.active_selection_dancers.length === 0) return;

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'selection_scores' }, () => loadSelectionScores())
      .subscribe();

    return () => { supabase.removeChannel(scoreChannel); };
  }, [currentNomination?.phase, screenState?.active_selection_dancers, selectedNomination, id]);

  // ── Data Loaders ──
  const loadData = async () => {
    try {
      const { data: battleInfo } = await supabase.from("battles").select("*").eq("id", id).single();
      if (battleInfo) setBattleData(battleInfo);

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
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // ── Actions (ALL PRESERVED) ──
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
        })
        .select()
        .single();

      if (error) throw error;
      setScreenState(data as unknown as ScreenState);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateScreenState = async (updates: Partial<ScreenState>) => {
    if (!screenState) return;

    try {
      setScreenState(prev => prev ? { ...prev, ...updates } : null);

      const safeUpdates = { ...updates } as any;
      delete safeUpdates.bracket_style;
      delete safeUpdates.font_family;
      delete safeUpdates.primary_color;
      delete safeUpdates.secondary_color;

      const { error } = await supabase
        .from("screen_state")
        .update(safeUpdates)
        .eq("id", screenState.id);

      if (error) {
        console.error("SUPABASE UPDATE ERROR:", error);
        loadData();
        throw error;
      }
    } catch (error: any) {
      console.error(`DB ERROR: ${error.message}`, error);
      toast({ title: "Error updating screen", description: error.message, variant: "destructive" });
    }
  };

  const showMatch = async (matchId: string) => {
    if (!screenState) {
      toast({ title: "Error", description: "Screen state not initialized", variant: "destructive" });
      return;
    }

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

    toast({ title: "Match started", description: "Match is now live" });
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
    await updateScreenState({ custom_message: customMessage, show_custom_message: showCustomMessage });
    toast({ title: "Message sent" });
  };

  const resetMatch = async () => {
    setCurrentRound(1);
    setVotesLeft(0);
    setVotesRight(0);
    await updateScreenState({ current_round: 1, votes_left: 0, votes_right: 0, show_winner: false });
  };

  const toggleBracket = async (layout?: "symmetric" | "linear") => {
    if (layout) {
      if (showBracket && bracketLayout === layout) {
        setShowBracket(false);
        await updateScreenState({ show_bracket: false } as any);
      } else {
        setShowBracket(true);
        setBracketLayout(layout);
        await updateScreenState({ show_bracket: true, bracket_layout: layout } as any);
      }
    } else {
      const newValue = !showBracket;
      setShowBracket(newValue);
      await updateScreenState({ show_bracket: newValue, bracket_layout: bracketLayout } as any);
    }
  };

  const clearScreen = async () => {
    setShowBracket(false);
    setShowCustomMessage(false);
    await updateScreenState({
      current_match_id: null, next_match_id: null, show_bracket: false,
      show_winner: false, show_custom_message: false,
      active_selection_dancers: [], next_selection_dancers: [],
    });
    toast({ title: "Screen cleared" });
  };

  const startTimer = async () => {
    const endTime = new Date(Date.now() + timerMinutes * 60 * 1000).toISOString();
    setTimerRunning(true);
    playSound("timerStart");
    await updateScreenState({ timer_running: true, timer_end_time: endTime, show_timer: true });
  };

  const stopTimer = async () => {
    setTimerRunning(false);
    playSound("timerEnd");
    await updateScreenState({ timer_running: false, timer_end_time: null });
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
    await updateScreenState({ current_round: newRound });
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
    if (!currentMatch) return;

    const winnerId = votesLeft > votesRight
      ? currentMatch.dancer_left_id
      : votesRight > votesLeft
        ? currentMatch.dancer_right_id
        : null;

    if (!winnerId) {
      toast({ title: "Tie!", description: "Scores are equal — use Tie Break first.", variant: "destructive" });
      return;
    }

    const winnerName = getDancerName(winnerId);
    if (!window.confirm(`Confirm winner: ${winnerName}?\n\nScore: ${votesLeft} : ${votesRight}`)) return;

    try {
      const { error: matchError } = await supabase
        .from("matches")
        .update({ winner_id: winnerId, is_completed: true, votes_left: votesLeft, votes_right: votesRight })
        .eq("id", currentMatch.id);

      if (matchError) throw matchError;

      const { error: advanceError } = await supabase.rpc("advance_winner_to_next_match", {
        p_match_id: currentMatch.id,
        p_winner_id: winnerId,
      });

      if (advanceError) {
        console.warn("advance_winner_to_next_match failed (may not exist):", advanceError);
      }

      playSound("winner");
      await updateScreenState({ show_winner: true });

      toast({ title: "🏆 Winner!", description: `${getDancerName(winnerId)} wins!` });

      await loadMatches();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const triggerTieBreaker = async () => {
    playSound("timerStart");
    await updateScreenState({
      custom_message: "TIE BREAKER!\nONE MORE ROUND",
      show_custom_message: true,
      animation_style: "scale",
      theme_preset: "neon",
    });
    setTimeout(async () => {
      await updateScreenState({ show_custom_message: false });
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
        }, { onConflict: 'match_id,judge_id,round_number' });

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
    await updateScreenState({ show_template: true, active_template_id: template.id, custom_message: template.title, show_custom_message: true });
  };

  const hideTemplate = async () => {
    await updateScreenState({ show_template: false, active_template_id: null, show_custom_message: false });
  };

  const openScreen = () => { window.open(`/battle/${id}/screen`, '_blank'); };

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

  const formatRound = (round: string) => {
    const labels: Record<string, string> = {
      round_of_16: "1/8", quarterfinal: "1/4", semifinal: "1/2", final: "Final",
    };
    return labels[round] || round;
  };

  const isMatchReady = (match: Match) => {
    return match.dancer_left_id !== null && match.dancer_right_id !== null;
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

  const heats: Dancer[][] = [];
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

  // ════════════════════════════════════════════════
  // ═══ RENDER ═══
  // ════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-background" {...swipeHandlers}>
      {/* ── Minimal Header ── */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/battle/${id}`)} className="h-9 w-9 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-base font-display font-bold tracking-tight truncate">{battleData?.name || "Operator"}</h1>
              {currentNomination && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{currentNomination.name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {screenState?.current_match_id && currentMatch && (
              <Badge className="gap-1.5 text-[10px] hidden sm:flex bg-neon/15 text-neon border-neon/30 font-bold">
                <div className="live-dot" />
                LIVE
              </Badge>
            )}

            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setSoundEnabled(!soundEnabled)}>
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>

            <Button onClick={openScreen} size="sm" variant="outline" className="h-9 gap-2 text-xs rounded-xl border-border/50">
              <Monitor className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Screen</span>
            </Button>
          </div>
        </div>

        {/* Nomination pills */}
        {nominations.length > 1 && (
          <div className="flex items-center gap-1.5 px-5 pb-3 overflow-x-auto">
            {nominations.map((nom) => (
              <button
                key={nom.id}
                onClick={() => {
                  setSelectedNomination(nom.id);
                  updateScreenState({ nomination_id: nom.id });
                }}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedNomination === nom.id
                    ? 'bg-primary text-primary-foreground shadow-glow-red'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                {nom.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Main Content: 3-tab layout ── */}
      <div className="max-w-4xl mx-auto pb-8">
        <Tabs defaultValue="live" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border/30 bg-transparent h-auto p-0 gap-0">
            <TabsTrigger value="live" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-neon data-[state=active]:text-neon data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3.5 text-xs font-bold uppercase tracking-[0.1em]">
              Live Control
            </TabsTrigger>
            <TabsTrigger value="bracket" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3.5 text-xs font-bold uppercase tracking-[0.1em]">
              Bracket
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-muted-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3.5 text-xs font-bold uppercase tracking-[0.1em]">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* ═══════ TAB 1: LIVE CONTROL ═══════ */}
          <TabsContent value="live" className="px-5 py-8 space-y-8 mt-0">
            {/* Phase indicator - minimal */}
            {currentNomination && (
              <div className="flex items-center gap-2">
                {(["registration", "selection", "bracket", "completed"] as const).map((phase) => {
                  const isCurrent = currentNomination.phase === phase;
                  const labels: Record<string, string> = { registration: "Reg", selection: "Select", bracket: "Bracket", completed: "Done" };
                  return (
                    <button
                      key={phase}
                      onClick={async () => {
                        if (isCurrent) return;
                        try {
                          const { error } = await supabase.from("nominations").update({ phase }).eq("id", selectedNomination);
                          if (error) throw error;
                          if (phase === "bracket") await updateScreenState({ active_selection_dancers: [], next_selection_dancers: [] });
                          if (phase === "selection") await updateScreenState({ current_match_id: null, next_match_id: null });
                          toast({ title: "Phase changed", description: `Now in ${labels[phase]} mode` });
                          await loadData();
                          await loadMatches();
                        } catch (error: any) {
                          toast({ title: "Error", description: error.message, variant: "destructive" });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wide transition-all ${
                        isCurrent
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {labels[phase]}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── Active Selection Heat Control ── */}
            {currentNomination?.phase === 'selection' && screenState?.active_selection_dancers && screenState.active_selection_dancers.length > 0 && (
              <Card className="p-5 border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">LIVE HEAT</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => updateScreenState({ active_selection_dancers: [], next_selection_dancers: [] })} className="text-destructive text-xs h-7">
                    Stop Heat
                  </Button>
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {screenState.active_selection_dancers.map((dId) => (
                    <span key={dId} className="text-lg font-bold">{getDancerName(dId)}</span>
                  ))}
                </div>

                {/* Judges Status - collapsible */}
                {judges.length > 0 && (
                  <Collapsible open={judgesExpanded} onOpenChange={setJudgesExpanded} className="mt-4">
                    <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full">
                      <ChevronDown className={`h-3 w-3 transition-transform ${judgesExpanded ? 'rotate-180' : ''}`} />
                      Judges ({selectionScores.length} scores)
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-1.5">
                      {judges.map(judge => {
                        const scoresByThisJudge = selectionScores.filter(s => s.judge_id === judge.id);
                        const scoredCount = scoresByThisJudge.length;
                        const totalNeeded = screenState.active_selection_dancers!.length;
                        const isDone = scoredCount === totalNeeded;
                        return (
                          <div key={judge.id} className="flex items-center justify-between p-2 bg-background/50 rounded-lg border border-border/30 text-sm">
                            <span className="font-medium">{judge.name}</span>
                            <Badge variant={isDone ? "default" : "secondary"} className={`text-[10px] ${isDone ? "bg-primary" : ""}`}>
                              {isDone ? "Done" : `${scoredCount}/${totalNeeded}`}
                            </Badge>
                          </div>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </Card>
            )}

            {/* ── Active Match Control ── */}
            {currentNomination?.phase !== 'selection' && currentMatch && (
              <div className="space-y-5">
                {/* Score display - the hero element */}
                <div className="text-center space-y-2">
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-right flex-1 min-w-0">
                      <div className="text-xl sm:text-2xl font-display font-black text-primary truncate">
                        {getDancerName(currentMatch.dancer_left_id)}
                      </div>
                    </div>
                    <div className="text-4xl sm:text-5xl font-display font-black tabular-nums tracking-tight shrink-0">
                      {votesLeft}<span className="text-muted-foreground/30 mx-1">:</span>{votesRight}
                    </div>
                    <div className="text-left flex-1 min-w-0">
                      <div className="text-xl sm:text-2xl font-display font-black text-secondary truncate">
                        {getDancerName(currentMatch.dancer_right_id)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3">
                    <Badge variant="outline" className="text-[10px]">Round {currentRound}</Badge>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-2 h-2 rounded-full ${voteCount === totalJudges && totalJudges > 0 ? 'bg-success' : 'bg-yellow-500'} animate-pulse`} />
                      <span className="text-xs text-muted-foreground font-medium">{voteCount}/{totalJudges}</span>
                    </div>
                  </div>
                </div>

                {/* Action buttons - big & clear */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => addScore('left')}
                    className="h-16 border-primary/30 hover:border-primary hover:bg-primary/5 text-primary text-xl font-bold"
                  >
                    +1 Red
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => addScore('right')}
                    className="h-16 border-secondary/30 hover:border-secondary hover:bg-secondary/5 text-secondary text-xl font-bold"
                  >
                    +1 Blue
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {!timerRunning ? (
                    <Button onClick={startTimer} variant="outline" className="h-12 gap-1.5">
                      <PlayCircle className="h-4 w-4" />
                      Timer
                    </Button>
                  ) : (
                    <Button variant="destructive" onClick={stopTimer} className="h-12 gap-1.5">
                      <PauseCircle className="h-4 w-4" />
                      Stop
                    </Button>
                  )}
                  <Button onClick={nextRound} variant="outline" className="h-12 gap-1.5"
                    disabled={currentRound >= (currentNomination?.rounds_to_win ? currentNomination.rounds_to_win + 2 : 5)}>
                    <SkipForward className="h-4 w-4" />
                    Next
                  </Button>
                  <Button onClick={declareWinner} className="h-12 gap-1.5 bg-gradient-to-r from-primary to-secondary text-white">
                    <Trophy className="h-4 w-4" />
                    Winner
                  </Button>
                </div>

                {/* Secondary actions */}
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={resetMatch} className="text-xs flex-1 h-9">
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reset
                  </Button>
                  <Button variant="ghost" size="sm" onClick={triggerTieBreaker} className="text-xs flex-1 h-9 text-destructive">
                    Tie Break
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearScreen} className="text-xs flex-1 h-9">
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                </div>

                {/* Judges — hidden by default */}
                {judges.length > 0 && (
                  <Collapsible open={judgesExpanded} onOpenChange={setJudgesExpanded}>
                    <CollapsibleTrigger className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-full py-2">
                      <ChevronDown className={`h-3 w-3 transition-transform ${judgesExpanded ? 'rotate-180' : ''}`} />
                      Judges ({voteCount}/{totalJudges} voted)
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-1.5 mt-2">
                      {judges.map(judge => {
                        const vote = judgeVotes.find(v => v.judge_id === judge.id);
                        let voteDisplay = "…";
                        let voteColor = "text-muted-foreground";

                        if (vote) {
                          if (vote.vote_for === currentMatch.dancer_left_id) {
                            voteDisplay = getDancerName(currentMatch.dancer_left_id);
                            voteColor = "text-primary font-medium";
                          } else if (vote.vote_for === currentMatch.dancer_right_id) {
                            voteDisplay = getDancerName(currentMatch.dancer_right_id);
                            voteColor = "text-secondary font-medium";
                          } else {
                            voteDisplay = "Tie";
                            voteColor = "text-foreground";
                          }
                        }

                        return (
                          <div key={judge.id} className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${vote ? 'bg-background/50 border-border/30' : 'bg-yellow-500/5 border-yellow-500/20'}`}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${vote ? 'bg-success' : 'bg-yellow-500 animate-pulse'}`} />
                              <span className="font-medium">{judge.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className={voteColor}>{voteDisplay}</span>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6"><Settings className="h-3 w-3" /></Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-44 p-2" align="end">
                                  <div className="space-y-1 text-xs">
                                    <Button variant="ghost" className="w-full justify-start h-7 text-primary" onClick={() => setJudgeVote(judge.id, currentMatch.dancer_left_id)}>Set: Red</Button>
                                    <Button variant="ghost" className="w-full justify-start h-7 text-secondary" onClick={() => setJudgeVote(judge.id, currentMatch.dancer_right_id)}>Set: Blue</Button>
                                    <Button variant="ghost" className="w-full justify-start h-7" onClick={() => setJudgeVote(judge.id, null)}>Set: Tie</Button>
                                    <div className="border-t border-border/50 my-1" />
                                    <Button variant="ghost" className="w-full justify-start h-7 text-destructive" onClick={() => clearJudgeVote(judge.id)}>Clear</Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        );
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            )}

            {/* No active match state */}
            {!currentMatch && (!screenState?.active_selection_dancers || screenState.active_selection_dancers.length === 0) && currentNomination?.phase !== 'selection' && (
              <div className="text-center py-16 text-muted-foreground space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                  <Play className="h-6 w-6" />
                </div>
                <p className="text-sm">Select a match from the <strong>Bracket</strong> tab to go live</p>
              </div>
            )}

            {/* Selection heats list (when in selection phase but no active heat) */}
            {currentNomination?.phase === 'selection' && (!screenState?.active_selection_dancers || screenState.active_selection_dancers.length === 0) && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Selection Heats</h3>
                {heats.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No dancers registered yet.</p>
                ) : (
                  heats.map((heat, index) => (
                    <Card
                      key={`heat-${index}`}
                      className="p-4 cursor-pointer hover:border-primary/50 transition-all active:scale-[0.98]"
                      onClick={() => startHeat(index)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <Badge variant="outline" className="shrink-0 text-[10px]">Heat {index + 1}</Badge>
                          <span className="text-sm truncate">{heat.map(d => d.name).join(' • ')}</span>
                        </div>
                        <Play className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}

            {/* Live Preview */}
            {showLivePreview && (
              <div className="rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                  <iframe
                    src={`/battle/${id}/screen`}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    title="Live Screen Preview"
                    style={{ border: 'none' }}
                  />
                </div>
                <div className="flex items-center justify-center gap-1 py-1.5 bg-muted/30">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[10px] text-muted-foreground font-medium tracking-wider uppercase">Live Preview</span>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ═══════ TAB 2: BRACKET / PARTICIPANTS ═══════ */}
          <TabsContent value="bracket" className="px-4 py-6 space-y-6 mt-0">
            {/* Screen output control */}
            <div className="flex items-center gap-2 flex-wrap">
              {currentNomination?.phase === 'bracket' && matches.length > 0 && (
                <>
                  <Button
                    variant={showBracket && bracketLayout === "symmetric" ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleBracket("symmetric")}
                    className="h-8 text-xs gap-1"
                  >
                    Show ←|→
                  </Button>
                  <Button
                    variant={showBracket && bracketLayout === "linear" ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleBracket("linear")}
                    className="h-8 text-xs gap-1"
                  >
                    Show →→→
                  </Button>
                </>
              )}
              <div className="flex-1" />
              <Button variant="ghost" size="sm" onClick={clearScreen} className="h-8 text-xs text-destructive">
                <X className="h-3 w-3 mr-1" />Clear
              </Button>
            </div>

            {/* Matches list */}
            {currentNomination?.phase === 'selection' ? (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Participants ({dancers.length})</h3>
                {dancers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No dancers registered yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {dancers.map(d => (
                      <Card key={d.id} className="p-3">
                        <span className="font-medium text-sm">{d.name}</span>
                        {d.city && <span className="text-xs text-muted-foreground ml-2">{d.city}</span>}
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            ) : matches.length === 0 ? (
              <div className="py-8">
                <BracketSetup
                  nominationId={selectedNomination}
                  dancers={dancers}
                  topCount={currentNomination?.top_count || 16}
                  onBracketCreated={loadMatches}
                />
              </div>
            ) : (
              <div className="space-y-5">
                {["round_of_16", "quarterfinal", "semifinal", "final"].map((round) => {
                  const roundMatches = matches.filter(m => m.round === round);
                  if (roundMatches.length === 0) return null;

                  return (
                    <div key={round} className="space-y-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{formatRound(round)}</h3>
                      {roundMatches.map((match) => {
                        const isActive = screenState?.current_match_id === match.id;
                        const hasWinner = match.winner_id !== null;
                        const ready = isMatchReady(match);

                        return (
                          <Card
                            key={match.id}
                            className={`p-3.5 transition-all ${
                              !ready ? 'opacity-40' : isActive ? 'ring-2 ring-primary bg-primary/5 cursor-pointer' : hasWinner ? 'opacity-60 cursor-pointer' : 'hover:border-primary/40 cursor-pointer'
                            }`}
                            onClick={() => {
                              if (!ready) return;
                              if (hasWinner && !window.confirm("This match already has a winner. Restart it?")) return;
                              showMatch(match.id);
                            }}
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className={`font-medium text-sm truncate ${match.winner_id === match.dancer_left_id ? 'text-primary' : ''}`}>
                                  {ready ? getDancerName(match.dancer_left_id) : "—"}
                                </span>
                                <span className="text-muted-foreground/50 text-xs">vs</span>
                                <span className={`font-medium text-sm truncate ${match.winner_id === match.dancer_right_id ? 'text-secondary' : ''}`}>
                                  {ready ? getDancerName(match.dancer_right_id) : "—"}
                                </span>
                              </div>
                              {isActive && <Badge className="shrink-0 bg-primary text-[10px]">LIVE</Badge>}
                              {hasWinner && !isActive && <Badge variant="secondary" className="shrink-0 text-[10px]">✓</Badge>}
                              {!isActive && !hasWinner && ready && <Play className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ═══════ TAB 3: SETTINGS ═══════ */}
          <TabsContent value="settings" className="px-4 py-6 space-y-6 mt-0">
            {/* Quick Actions Row */}
            <div className="flex gap-2 flex-wrap">
              <Button onClick={openScreen} variant="outline" size="sm" className="gap-1.5 text-xs h-9">
                <Monitor className="h-3.5 w-3.5" />Screen
              </Button>
              <Button onClick={() => window.open(`/battle/${id}/mc`, '_blank')} variant="outline" size="sm" className="gap-1.5 text-xs h-9">
                <Mic className="h-3.5 w-3.5" />MC
              </Button>
              <Button onClick={() => window.open(`/battle/${id}/obs-overlay`, '_blank')} variant="outline" size="sm" className="gap-1.5 text-xs h-9">
                <ExternalLink className="h-3.5 w-3.5" />OBS
              </Button>
              <Button onClick={() => window.open(`/battle/${id}/obs-overlay?hype=1`, '_blank')} variant="outline" size="sm" className="gap-1.5 text-xs h-9">
                🎤 Hype
              </Button>
              <Button onClick={() => setShowLivePreview(!showLivePreview)} variant={showLivePreview ? "default" : "outline"} size="sm" className="gap-1.5 text-xs h-9">
                <Eye className="h-3.5 w-3.5" />Preview
              </Button>
              <JudgeAssignmentsModal battleId={id!} />
            </div>

            {/* Display Settings */}
            <Collapsible defaultOpen>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Monitor className="h-3.5 w-3.5" />Display
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="p-4 mt-2 space-y-3">
                  <div className="flex items-center justify-between"><Label className="text-sm">Show Battle Name</Label><Switch checked={showBattleName} onCheckedChange={setShowBattleName} /></div>
                  <div className="flex items-center justify-between"><Label className="text-sm">Show Judges</Label><Switch checked={showJudges} onCheckedChange={setShowJudges} /></div>
                  <div className="flex items-center justify-between"><Label className="text-sm">Show Timer</Label><Switch checked={showTimer} onCheckedChange={setShowTimer} /></div>
                  {showTimer && (
                    <div className="flex items-center justify-between"><Label className="text-sm">Timer (min)</Label><Input type="number" min="1" max="10" value={timerMinutes} onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 1)} className="w-20 h-8" /></div>
                  )}
                  <div className="flex items-center justify-between"><Label className="text-sm">Show Score</Label><Switch checked={showScore} onCheckedChange={setShowScore} /></div>
                  <div className="flex items-center justify-between"><Label className="text-sm">Audience QR</Label><Switch checked={showAudienceQR} onCheckedChange={setShowAudienceQR} /></div>
                  <div className="flex items-center justify-between"><Label className="text-sm">Auto-advance</Label><Switch checked={autoAdvanceOnTimer} onCheckedChange={setAutoAdvanceOnTimer} /></div>
                  <div className="flex items-center justify-between"><Label className="text-sm">Rounds to Win</Label><Input type="number" min="1" max="5" value={roundsToWin} onChange={(e) => setRoundsToWin(parseInt(e.target.value) || 2)} className="w-20 h-8" /></div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="w-[100px] h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="4:3">4:3</SelectItem>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={applySettings} size="sm" className="w-full mt-2">Apply Display</Button>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Theme & Design */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5" />Theme & Design
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="p-4 mt-2 space-y-3">
                  <Select value={themePreset} onValueChange={applyThemePreset}>
                    <SelectTrigger><SelectValue placeholder="Theme" /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Background" /></SelectTrigger>
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
                      <div className="flex gap-2"><Input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="w-12 h-9 p-1" /><Input value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="flex-1" /></div>
                      <div className="flex gap-2"><Input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="w-12 h-9 p-1" /><Input value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="flex-1" /></div>
                    </div>
                  )}
                  {backgroundType === "image" && (
                    <Input placeholder="Image URL" value={backgroundImageUrl} onChange={(e) => setBackgroundImageUrl(e.target.value)} />
                  )}
                  <Select value={bracketStyle} onValueChange={setBracketStyle}>
                    <SelectTrigger><SelectValue placeholder="Bracket Style" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="glass">Glass</SelectItem>
                      <SelectItem value="neon">Neon</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={fontFamily} onValueChange={setFontFamily}>
                    <SelectTrigger><SelectValue placeholder="Font" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="display">Display</SelectItem>
                      <SelectItem value="sans">Sans</SelectItem>
                      <SelectItem value="mono">Mono</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1"><Label className="text-xs">Left Color</Label><Input type="color" value={primaryColor || "#ff0000"} onChange={(e) => setPrimaryColor(e.target.value)} className="w-full h-8 p-1" /></div>
                    <div className="flex-1 space-y-1"><Label className="text-xs">Right Color</Label><Input type="color" value={secondaryColor || "#0000ff"} onChange={(e) => setSecondaryColor(e.target.value)} className="w-full h-8 p-1" /></div>
                  </div>
                  <Button onClick={applyDesign} size="sm" className="w-full">Apply Theme</Button>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Messages */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />Messages
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="p-4 mt-2 space-y-3">
                  <div className="flex items-center justify-between"><Label className="text-sm">Show Message</Label><Switch checked={showCustomMessage} onCheckedChange={setShowCustomMessage} /></div>
                  <Textarea placeholder="Message to display..." value={customMessage} onChange={(e) => setCustomMessage(e.target.value)} rows={2} />
                  <Button onClick={sendCustomMessage} size="sm" className="w-full">Send Message</Button>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Templates */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Layout className="h-3.5 w-3.5" />Templates
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="p-4 mt-2">
                  <ScreenTemplates battleId={id!} onShowTemplate={showTemplate} />
                  {screenState?.show_template && (
                    <Button variant="outline" onClick={hideTemplate} size="sm" className="w-full mt-3">Hide Template</Button>
                  )}
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* Keyboard shortcuts */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Keyboard className="h-3.5 w-3.5" />Shortcuts
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="p-4 mt-2 space-y-1.5">
                  {SHORTCUT_HINTS.map((hint) => (
                    <div key={hint.key} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{hint.action}</span>
                      <Badge variant="outline" className="font-mono text-[10px]">{hint.key}</Badge>
                    </div>
                  ))}
                </Card>
              </CollapsibleContent>
            </Collapsible>

            {/* ═══ Event OS Tools ═══ */}
            <Collapsible>
              <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-primary" />Event OS
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Tabs defaultValue="tools" className="mt-2">
                  <TabsList className="grid w-full grid-cols-4 h-8">
                    <TabsTrigger value="tools" className="text-[10px]">Tools</TabsTrigger>
                    <TabsTrigger value="draw" className="text-[10px]">Draw</TabsTrigger>
                    <TabsTrigger value="social" className="text-[10px]">Social</TabsTrigger>
                    <TabsTrigger value="checkin" className="text-[10px]">Check-in</TabsTrigger>
                  </TabsList>

                  <TabsContent value="tools" className="space-y-3 mt-3">
                    {battleData && (
                      <AiTimekeeper eventStartTime={battleData.date} totalMatchesPlanned={matches.length || 8} matchesCompleted={matches.filter(m => m.winner_id).length} eventEndTime={undefined} />
                    )}
                    <LivePrizePool battleId={id!} initialAmount={0} currency="₽" />
                    {currentMatch && (
                      <Card className="p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">VAR Comparison</h4>
                        <SpiderChart
                          labels={["Technique", "Musicality", "Performance", "Originality", "Energy"]}
                          dataA={(() => { const lv = judgeVotes.filter(v => v.vote_for === currentMatch.dancer_left_id); return [lv.reduce((s,v) => s + (v.slider_technique||5),0)/(lv.length||1), lv.reduce((s,v) => s + (v.slider_musicality||5),0)/(lv.length||1), lv.reduce((s,v) => s + (v.slider_performance||5),0)/(lv.length||1), 5, 5]; })()}
                          dataB={(() => { const rv = judgeVotes.filter(v => v.vote_for === currentMatch.dancer_right_id); return [rv.reduce((s,v) => s + (v.slider_technique||5),0)/(rv.length||1), rv.reduce((s,v) => s + (v.slider_musicality||5),0)/(rv.length||1), rv.reduce((s,v) => s + (v.slider_performance||5),0)/(rv.length||1), 5, 5]; })()}
                          nameA={getDancerName(currentMatch.dancer_left_id)}
                          nameB={getDancerName(currentMatch.dancer_right_id)}
                          size={200}
                        />
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="draw" className="space-y-3 mt-3">
                    <Card className="p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cyber Roulette</h4>
                      {dancers.length >= 2 ? (
                        <>
                          <Button onClick={() => setShowRoulette(!showRoulette)} className="w-full gap-2 mb-3" variant={showRoulette ? "destructive" : "default"} size="sm">
                            <Zap className="h-3.5 w-3.5" />{showRoulette ? "Stop" : "Start Roulette"}
                          </Button>
                          <CyberRoulette
                            dancers={dancers.map(d => ({ id: d.id, name: d.name, photo_url: null }))}
                            onResult={(left, right) => { setShowRoulette(false); toast({ title: "🎰 Match Drawn!", description: `${left.name} vs ${right.name}` }); }}
                            isActive={showRoulette}
                          />
                        </>
                      ) : <p className="text-sm text-muted-foreground">Need at least 2 dancers</p>}
                    </Card>
                    {currentNomination?.phase === 'selection' && selectedNomination && (
                      <Card className="p-4">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cypher Swipe</h4>
                        <Button onClick={() => window.open(`/cypher-swipe/${selectedNomination}`, '_blank')} variant="outline" className="w-full gap-2" size="sm">
                          Open Cypher Swipe
                        </Button>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="social" className="space-y-3 mt-3">
                    <Card className="p-4">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Post Generator</h4>
                      <LlmPostGenerator
                        battleName={battleData?.name || "Battle"}
                        nominationName={currentNomination?.name || ""}
                        matches={matches.map(m => ({ round: m.round, position: m.position, dancer_left_name: getDancerName(m.dancer_left_id), dancer_right_name: getDancerName(m.dancer_right_id), winner_name: m.winner_id ? getDancerName(m.winner_id) : null }))}
                        date={battleData?.date ? new Date(battleData.date).toLocaleDateString() : ""}
                      />
                    </Card>
                  </TabsContent>

                  <TabsContent value="checkin" className="mt-3">
                    <NfcCheckin
                      onCheckin={(code) => {
                        const dancer = dancers.find(d => d.name.toLowerCase().includes(code.toLowerCase()) || d.id === code);
                        if (dancer) toast({ title: "✅ Checked In", description: `${dancer.name} is ready` });
                        else toast({ title: "⚠️ Not Found", description: `No dancer matching "${code}"`, variant: "destructive" });
                      }}
                    />
                  </TabsContent>
                </Tabs>
              </CollapsibleContent>
            </Collapsible>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

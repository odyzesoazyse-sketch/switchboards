import { useEffect, useState, useCallback } from "react";
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
  Keyboard, Layout, Settings, Users, ChevronLeft, ChevronRight
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import SliderVoting from "@/components/SliderVoting";
import ScreenTemplates from "@/components/ScreenTemplates";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useKeyboardShortcuts, SHORTCUT_HINTS } from "@/hooks/useKeyboardShortcuts";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

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
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Customization settings
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

  const { playSound, preloadAll } = useSoundEffects(soundEnabled);

  useEffect(() => {
    preloadAll();
  }, [preloadAll]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  useEffect(() => {
    if (selectedNomination) {
      loadMatches();
    }
  }, [selectedNomination]);

  // Real-time vote subscription
  useEffect(() => {
    if (!screenState?.current_match_id) {
      setVoteCount(0);
      return;
    }

    const loadVoteCount = async () => {
      const { count } = await supabase
        .from("match_votes")
        .select("*", { count: "exact", head: true })
        .eq("match_id", screenState.current_match_id)
        .eq("round_number", currentRound);
      
      setVoteCount(count || 0);
    };

    const loadJudgeCount = async () => {
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("battle_id", id)
        .eq("role", "judge");
      
      setTotalJudges(count || 0);
    };

    loadVoteCount();
    loadJudgeCount();

    const channel = supabase
      .channel('vote-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_votes',
          filter: `match_id=eq.${screenState.current_match_id}`
        },
        () => loadVoteCount()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [screenState?.current_match_id, currentRound, id]);

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

      const { data: stateData } = await supabase
        .from("screen_state")
        .select("*")
        .eq("battle_id", id)
        .maybeSingle();

      if (stateData) {
        setScreenState(stateData as ScreenState);
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
        })
        .select()
        .single();

      if (error) throw error;
      setScreenState(data as ScreenState);
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
      const { error } = await supabase
        .from("screen_state")
        .update(updates)
        .eq("id", screenState.id);

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: "Error",
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

    try {
      const { error } = await supabase
        .from("screen_state")
        .update({
          current_match_id: matchId,
          nomination_id: selectedNomination || null,
          show_winner: false,
          current_round: 1,
          votes_left: 0,
          votes_right: 0,
        })
        .eq("id", screenState.id);

      if (error) throw error;
      
      setCurrentRound(1);
      setVotesLeft(0);
      setVotesRight(0);
      
      toast({
        title: "Match started",
        description: "Match is now live",
      });
      
      await loadData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
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
    });
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
    });
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
      // If clicking same layout that's already showing, hide it
      if (showBracket && bracketLayout === layout) {
        setShowBracket(false);
        await updateScreenState({
          show_bracket: false,
        } as any);
      } else {
        // Show bracket with selected layout
        setShowBracket(true);
        setBracketLayout(layout);
        await updateScreenState({
          show_bracket: true,
          bracket_layout: layout,
          current_match_id: null,
        } as any);
      }
    } else {
      const newValue = !showBracket;
      setShowBracket(newValue);
      await updateScreenState({
        show_bracket: newValue,
        bracket_layout: bracketLayout,
        current_match_id: newValue ? null : screenState?.current_match_id,
      } as any);
    }
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
  const currentNomination = nominations.find(n => n.id === selectedNomination);
  const currentNominationIndex = nominations.findIndex(n => n.id === selectedNomination);

  const goToNextNomination = useCallback(() => {
    if (nominations.length <= 1) return;
    const nextIndex = (currentNominationIndex + 1) % nominations.length;
    setSelectedNomination(nominations[nextIndex].id);
  }, [nominations, currentNominationIndex]);

  const goToPrevNomination = useCallback(() => {
    if (nominations.length <= 1) return;
    const prevIndex = currentNominationIndex <= 0 ? nominations.length - 1 : currentNominationIndex - 1;
    setSelectedNomination(nominations[prevIndex].id);
  }, [nominations, currentNominationIndex]);

  const swipeHandlers = useSwipeGesture({
    onSwipeLeft: goToNextNomination,
    onSwipeRight: goToPrevNomination,
  });

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
                        onSubmit={() => {}}
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
                      <Button onClick={applyDesign} size="sm" className="w-full">Apply Theme</Button>
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
                      onClick={() => setSelectedNomination(nom.id)}
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
                  className={`w-2 h-2 rounded-full transition-all ${
                    selectedNomination === nom.id ? 'bg-primary w-4' : 'bg-muted-foreground/30'
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

        {/* Active Match Control */}
        {currentMatch && (
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
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${voteCount === totalJudges && totalJudges > 0 ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                  <span className="text-muted-foreground">{voteCount}/{totalJudges} votes</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-4 gap-2">
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
                <Button onClick={nextRound} variant="outline" className="h-12 flex-col gap-0.5">
                  <SkipForward className="h-5 w-5" />
                  <span className="text-[10px] uppercase">Next</span>
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={resetMatch} className="gap-1">
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
                <Button onClick={declareWinner} className="gap-1 bg-gradient-to-r from-primary to-secondary">
                  <Trophy className="h-4 w-4" />
                  Winner
                </Button>
                <div className="flex gap-1">
                  <Button 
                    variant={showBracket && bracketLayout === "symmetric" ? "default" : "outline"} 
                    onClick={() => toggleBracket("symmetric")}
                    className="gap-1 flex-1"
                    size="sm"
                  >
                    <Layout className="h-3 w-3" />
                    <span className="text-[10px]">←|→</span>
                  </Button>
                  <Button 
                    variant={showBracket && bracketLayout === "linear" ? "default" : "outline"} 
                    onClick={() => toggleBracket("linear")}
                    className="gap-1 flex-1"
                    size="sm"
                  >
                    <Layout className="h-3 w-3" />
                    <span className="text-[10px]">→→→</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Matches List */}
        <div className="space-y-2">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Users className="h-4 w-4" />
            Matches
          </h2>
          
          {matches.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No matches yet
            </Card>
          ) : (
            <div className="space-y-2">
              {matches.map((match) => {
                const isActive = screenState?.current_match_id === match.id;
                const hasWinner = match.winner_id !== null;
                
                return (
                  <Card
                    key={match.id}
                    className={`p-3 cursor-pointer transition-all ${
                      isActive 
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
                        <Badge className="shrink-0 bg-green-500">LIVE</Badge>
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
          )}
        </div>
      </div>
    </div>
  );
}

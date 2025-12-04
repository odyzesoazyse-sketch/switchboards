import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Monitor, Play, RotateCcw, Trophy, Eye, 
  Palette, Type, MessageSquare, Sparkles, Timer, 
  PlayCircle, PauseCircle, SkipForward, Volume2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SliderVoting from "@/components/SliderVoting";

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
  // New customization fields
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
  const [previewOpen, setPreviewOpen] = useState(false);
  const [judgingMode, setJudgingMode] = useState<string>("simple");
  const [voteCount, setVoteCount] = useState(0);
  const [totalJudges, setTotalJudges] = useState(0);

  // New customization settings
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
        // Load customization settings
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

      toast({
        title: "Updated",
        description: "Screen state updated",
      });
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
          current_round: currentRound,
          votes_left: votesLeft,
          votes_right: votesRight,
        })
        .eq("id", screenState.id);

      if (error) throw error;

      toast({
        title: "Match selected",
        description: "Match is displayed on screen",
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

  const showWinnerScreen = async () => {
    await updateScreenState({
      show_winner: true,
    });
  };

  const toggleBracket = async () => {
    const newValue = !showBracket;
    setShowBracket(newValue);
    await updateScreenState({
      show_bracket: newValue,
      current_match_id: newValue ? null : screenState?.current_match_id,
    });
  };

  const startTimer = async () => {
    const endTime = new Date(Date.now() + timerMinutes * 60 * 1000).toISOString();
    setTimerRunning(true);
    await updateScreenState({
      timer_running: true,
      timer_end_time: endTime,
      show_timer: true,
    });
  };

  const stopTimer = async () => {
    setTimerRunning(false);
    await updateScreenState({
      timer_running: false,
      timer_end_time: null,
    });
  };

  const nextRound = async () => {
    const newRound = currentRound + 1;
    setCurrentRound(newRound);
    await updateScreenState({
      current_round: newRound,
    });
  };

  const addScore = async (side: 'left' | 'right') => {
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

  const getDancerName = (dancerId: string | null) => {
    if (!dancerId) return "Waiting";
    const dancer = dancers.find(d => d.id === dancerId);
    return dancer ? dancer.name : "?";
  };

  const openScreen = () => {
    window.open(`/battle/${id}/screen`, '_blank');
  };

  const getCurrentMatch = () => {
    if (!screenState?.current_match_id) return null;
    return matches.find(m => m.id === screenState.current_match_id);
  };

  const currentMatch = getCurrentMatch();

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <Button variant="ghost" onClick={() => navigate(`/battle/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Judge Screen Preview</DialogTitle>
                </DialogHeader>
                {currentMatch ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-muted-foreground">Round {currentRound}</p>
                    </div>
                    {judgingMode === "simple" ? (
                      <div className="grid md:grid-cols-3 gap-4 items-center">
                        <Card className="p-6 text-center border-primary/50">
                          <div className="space-y-3">
                            <div className="text-2xl font-bold text-primary">
                              {getDancerName(currentMatch.dancer_left_id)}
                            </div>
                            <Button disabled className="w-full bg-primary hover:bg-primary/90">
                              <Trophy className="mr-2 h-4 w-4" />
                              Vote
                            </Button>
                          </div>
                        </Card>
                        <div className="text-center text-3xl font-bold text-muted-foreground">VS</div>
                        <Card className="p-6 text-center border-secondary/50">
                          <div className="space-y-3">
                            <div className="text-2xl font-bold text-secondary">
                              {getDancerName(currentMatch.dancer_right_id)}
                            </div>
                            <Button disabled className="w-full bg-secondary hover:bg-secondary/90">
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
                    No active match. Select a match to preview.
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Button onClick={openScreen} className="gap-2">
              <Monitor className="h-4 w-4" />
              Open Screen
            </Button>
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold">Operator Panel</h1>

        {/* Quick Actions Bar */}
        {currentMatch && (
          <Card className="p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="text-lg font-semibold text-primary">{getDancerName(currentMatch.dancer_left_id)}</div>
                <div className="text-2xl font-bold">{votesLeft} — {votesRight}</div>
                <div className="text-lg font-semibold text-secondary">{getDancerName(currentMatch.dancer_right_id)}</div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => addScore('left')} className="border-primary/50 text-primary">
                  +1 Red
                </Button>
                <Button size="sm" variant="outline" onClick={() => addScore('right')} className="border-secondary/50 text-secondary">
                  +1 Blue
                </Button>
                <Button size="sm" variant="outline" onClick={nextRound} className="gap-1">
                  <SkipForward className="h-3 w-3" />
                  Next Round
                </Button>
                {!timerRunning ? (
                  <Button size="sm" onClick={startTimer} className="gap-1">
                    <PlayCircle className="h-3 w-3" />
                    Start Timer
                  </Button>
                ) : (
                  <Button size="sm" variant="destructive" onClick={stopTimer} className="gap-1">
                    <PauseCircle className="h-3 w-3" />
                    Stop
                  </Button>
                )}
                <Button size="sm" onClick={showWinnerScreen} className="gap-1 bg-gradient-to-r from-primary to-secondary">
                  <Trophy className="h-3 w-3" />
                  Winner
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <div className={`w-2 h-2 rounded-full ${voteCount === totalJudges && totalJudges > 0 ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
              <span className="text-sm">Votes: {voteCount}/{totalJudges} judges</span>
              <span className="text-sm text-muted-foreground">• Round {currentRound}</span>
            </div>
          </Card>
        )}

        <Tabs defaultValue="controls" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="controls" className="gap-2">
              <Play className="h-4 w-4" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="design" className="gap-2">
              <Palette className="h-4 w-4" />
              Design
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-2">
              <Trophy className="h-4 w-4" />
              Matches
            </TabsTrigger>
          </TabsList>

          {/* Controls Tab */}
          <TabsContent value="controls" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Display Settings
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-battle-name">Show Battle Name</Label>
                    <Switch id="show-battle-name" checked={showBattleName} onCheckedChange={setShowBattleName} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-judges">Show Judges</Label>
                    <Switch id="show-judges" checked={showJudges} onCheckedChange={setShowJudges} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-timer">Show Timer</Label>
                    <Switch id="show-timer" checked={showTimer} onCheckedChange={setShowTimer} />
                  </div>
                  {showTimer && (
                    <div>
                      <Label htmlFor="timer-minutes">Timer (minutes)</Label>
                      <Input
                        id="timer-minutes"
                        type="number"
                        min="1"
                        max="10"
                        value={timerMinutes}
                        onChange={(e) => setTimerMinutes(parseInt(e.target.value) || 1)}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-score">Show Score</Label>
                    <Switch id="show-score" checked={showScore} onCheckedChange={setShowScore} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-round-info">Show Round Info</Label>
                    <Switch id="show-round-info" checked={showRoundInfo} onCheckedChange={setShowRoundInfo} />
                  </div>
                  <div>
                    <Label htmlFor="rounds-to-win">Rounds to Win</Label>
                    <Input
                      id="rounds-to-win"
                      type="number"
                      min="1"
                      max="5"
                      value={roundsToWin}
                      onChange={(e) => setRoundsToWin(parseInt(e.target.value) || 2)}
                    />
                  </div>
                  <Button onClick={applySettings} className="w-full">Apply Display Settings</Button>
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Timer className="h-5 w-5" />
                  Match Control
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="current-round">Current Round</Label>
                    <Input
                      id="current-round"
                      type="number"
                      min="1"
                      value={currentRound}
                      onChange={(e) => setCurrentRound(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="votes-left" className="text-primary">Score Red</Label>
                      <Input
                        id="votes-left"
                        type="number"
                        min="0"
                        value={votesLeft}
                        onChange={(e) => setVotesLeft(parseInt(e.target.value) || 0)}
                        className="border-primary/30"
                      />
                    </div>
                    <div>
                      <Label htmlFor="votes-right" className="text-secondary">Score Blue</Label>
                      <Input
                        id="votes-right"
                        type="number"
                        min="0"
                        value={votesRight}
                        onChange={(e) => setVotesRight(parseInt(e.target.value) || 0)}
                        className="border-secondary/30"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={resetMatch} variant="outline" className="gap-2">
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                    <Button onClick={showWinnerScreen} className="gap-2">
                      <Trophy className="h-4 w-4" />
                      Show Winner
                    </Button>
                  </div>
                  <Button 
                    onClick={toggleBracket} 
                    variant={showBracket ? "default" : "outline"}
                    className="w-full gap-2"
                  >
                    <Trophy className="h-4 w-4" />
                    {showBracket ? "Hide Bracket" : "Show Bracket"}
                  </Button>
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Design Tab */}
          <TabsContent value="design" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="p-6 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Theme & Colors
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label>Theme Preset</Label>
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
                  </div>
                  <div>
                    <Label>Background Type</Label>
                    <Select value={backgroundType} onValueChange={setBackgroundType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solid">Solid Color</SelectItem>
                        <SelectItem value="gradient">Gradient</SelectItem>
                        <SelectItem value="image">Image URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {backgroundType === "solid" && (
                    <div>
                      <Label htmlFor="bg-color">Background Color</Label>
                      <div className="flex gap-2">
                        <Input
                          id="bg-color"
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-16 h-10 p-1"
                        />
                        <Input
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="flex-1"
                        />
                      </div>
                    </div>
                  )}
                  {backgroundType === "gradient" && (
                    <>
                      <div>
                        <Label>Gradient From</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="w-16 h-10 p-1" />
                          <Input value={gradientFrom} onChange={(e) => setGradientFrom(e.target.value)} className="flex-1" />
                        </div>
                      </div>
                      <div>
                        <Label>Gradient To</Label>
                        <div className="flex gap-2">
                          <Input type="color" value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="w-16 h-10 p-1" />
                          <Input value={gradientTo} onChange={(e) => setGradientTo(e.target.value)} className="flex-1" />
                        </div>
                      </div>
                    </>
                  )}
                  {backgroundType === "image" && (
                    <div>
                      <Label htmlFor="bg-image">Background Image URL</Label>
                      <Input
                        id="bg-image"
                        placeholder="https://example.com/image.jpg"
                        value={backgroundImageUrl}
                        onChange={(e) => setBackgroundImageUrl(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6 space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Typography & Effects
                </h2>
                <div className="space-y-4">
                  <div>
                    <Label>Font Size</Label>
                    <Select value={fontSize} onValueChange={setFontSize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">Small</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="large">Large</SelectItem>
                        <SelectItem value="xlarge">Extra Large</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Animation Style</Label>
                    <Select value={animationStyle} onValueChange={setAnimationStyle}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select animation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="fade">Fade</SelectItem>
                        <SelectItem value="slide">Slide</SelectItem>
                        <SelectItem value="scale">Scale</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={applyDesign} className="w-full">Apply Design</Button>
                </div>
                {/* Preview */}
                <div 
                  className="h-32 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{
                    background: backgroundType === 'gradient' 
                      ? `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`
                      : backgroundType === 'image' && backgroundImageUrl
                        ? `url(${backgroundImageUrl}) center/cover`
                        : backgroundColor
                  }}
                >
                  Preview
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages" className="space-y-6">
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Custom Screen Message
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-message">Show Message on Screen</Label>
                  <Switch id="show-message" checked={showCustomMessage} onCheckedChange={setShowCustomMessage} />
                </div>
                <div>
                  <Label htmlFor="custom-message">Message Text</Label>
                  <Textarea
                    id="custom-message"
                    placeholder="Enter a message to display on screen..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={sendCustomMessage} className="flex-1">Send to Screen</Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCustomMessage(false);
                      setCustomMessage("");
                      sendCustomMessage();
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Matches Tab */}
          <TabsContent value="matches" className="space-y-6">
            {nominations.length > 0 && (
              <Card className="p-6 space-y-4">
                <h2 className="text-xl font-bold">Select Match to Display</h2>
                
                <div>
                  <Label>Category</Label>
                  <Select value={selectedNomination} onValueChange={setSelectedNomination}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {nominations.map((nom) => (
                        <SelectItem key={nom.id} value={nom.id}>
                          {nom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3">
                  {matches.map((match) => (
                    <Card
                      key={match.id}
                      className={`p-4 hover:border-primary/50 transition-all cursor-pointer ${
                        screenState?.current_match_id === match.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => showMatch(match.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-xs text-muted-foreground uppercase">{match.round}</span>
                          <div className="text-lg font-semibold text-primary">
                            {getDancerName(match.dancer_left_id)}
                          </div>
                          <div className="text-xl font-bold text-muted-foreground">VS</div>
                          <div className="text-lg font-semibold text-secondary">
                            {getDancerName(match.dancer_right_id)}
                          </div>
                        </div>
                        <Button size="sm" className="gap-2">
                          <Play className="h-4 w-4" />
                          Show
                        </Button>
                      </div>
                    </Card>
                  ))}
                  {matches.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No matches in this category yet.</p>
                  )}
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
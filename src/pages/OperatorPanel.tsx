import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Monitor, Play, RotateCcw, Trophy, Eye } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
}

export default function OperatorPanel() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [dancers, setDancers] = useState<Dancer[]>([]);
  const [screenState, setScreenState] = useState<ScreenState | null>(null);
  const [nominations, setNominations] = useState<any[]>([]);
  const [selectedNomination, setSelectedNomination] = useState<string>("");
  
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
        setScreenState(stateData);
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

      // Load judging mode
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
      setScreenState(data);
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
      
      // Update local state
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
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(`/battle/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к баттлу
          </Button>
          <div className="flex gap-2">
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Eye className="h-4 w-4" />
                  Judge Preview
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
                        <Card className="p-6 text-center border-opponent-left/50">
                          <div className="space-y-3">
                            <div className="text-2xl font-bold text-opponent-left">
                              {getDancerName(currentMatch.dancer_left_id)}
                            </div>
                            <Button
                              disabled
                              className="w-full bg-opponent-left hover:bg-opponent-left/90"
                            >
                              <Trophy className="mr-2 h-4 w-4" />
                              Vote
                            </Button>
                          </div>
                        </Card>

                        <div className="text-center text-3xl font-bold text-muted-foreground">
                          VS
                        </div>

                        <Card className="p-6 text-center border-opponent-right/50">
                          <div className="space-y-3">
                            <div className="text-2xl font-bold text-opponent-right">
                              {getDancerName(currentMatch.dancer_right_id)}
                            </div>
                            <Button
                              disabled
                              className="w-full bg-opponent-right hover:bg-opponent-right/90"
                            >
                              <Trophy className="mr-2 h-4 w-4" />
                              Vote
                            </Button>
                          </div>
                        </Card>
                      </div>
                    ) : (
                      <SliderVoting
                        matchId={currentMatch.id}
                        dancerLeft={{
                          name: getDancerName(currentMatch.dancer_left_id),
                          city: null
                        }}
                        dancerRight={{
                          name: getDancerName(currentMatch.dancer_right_id),
                          city: null
                        }}
                        currentRound={currentRound}
                        onSubmit={() => {}}
                        disabled
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No active match. Select a match to preview judge screen.
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <Button onClick={openScreen} className="gap-2">
              <Monitor className="h-4 w-4" />
              Открыть экран
            </Button>
          </div>
        </div>

        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Панель оператора
        </h1>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">Настройки экрана</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-judges">Показывать судей</Label>
                <Switch
                  id="show-judges"
                  checked={showJudges}
                  onCheckedChange={setShowJudges}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-timer">Показывать таймер</Label>
                <Switch
                  id="show-timer"
                  checked={showTimer}
                  onCheckedChange={setShowTimer}
                />
              </div>

              {showTimer && (
                <div>
                  <Label htmlFor="timer-minutes">Время (минуты)</Label>
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
                <Label htmlFor="show-score">Показывать счёт</Label>
                <Switch
                  id="show-score"
                  checked={showScore}
                  onCheckedChange={setShowScore}
                />
              </div>

              <div>
                <Label htmlFor="rounds-to-win">Раундов до победы</Label>
                <Input
                  id="rounds-to-win"
                  type="number"
                  min="1"
                  max="5"
                  value={roundsToWin}
                  onChange={(e) => setRoundsToWin(parseInt(e.target.value) || 2)}
                />
              </div>

              <Button onClick={applySettings} className="w-full">
                Применить настройки
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">Управление матчем</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="current-round">Текущий раунд</Label>
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
                  <Label htmlFor="votes-left">Счёт слева</Label>
                  <Input
                    id="votes-left"
                    type="number"
                    min="0"
                    value={votesLeft}
                    onChange={(e) => setVotesLeft(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="votes-right">Счёт справа</Label>
                  <Input
                    id="votes-right"
                    type="number"
                    min="0"
                    value={votesRight}
                    onChange={(e) => setVotesRight(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button onClick={resetMatch} variant="outline" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Сбросить
                </Button>
                <Button onClick={showWinnerScreen} className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Победитель
                </Button>
                <Button 
                  onClick={toggleBracket} 
                  variant={showBracket ? "default" : "outline"}
                  className="col-span-2 gap-2"
                >
                  <Trophy className="h-4 w-4" />
                  {showBracket ? "Hide bracket" : "Show bracket"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {nominations.length > 0 && (
          <Card className="p-6 space-y-4">
            <h2 className="text-2xl font-bold">Select match to display</h2>
            
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

            <div className="grid gap-4">
              {matches.map((match) => (
                <Card
                  key={match.id}
                  className="p-4 hover:border-primary/50 transition-all cursor-pointer"
                  onClick={() => showMatch(match.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-lg font-semibold w-32">
                        {getDancerName(match.dancer_left_id)}
                      </div>
                      <div className="text-2xl font-bold text-muted-foreground">VS</div>
                      <div className="text-lg font-semibold w-32">
                        {getDancerName(match.dancer_right_id)}
                      </div>
                    </div>
                    <Button size="sm" className="gap-2">
                      <Play className="h-4 w-4" />
                      Показать
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

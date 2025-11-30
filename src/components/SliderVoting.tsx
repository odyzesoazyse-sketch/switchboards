import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface SliderVotingProps {
  matchId: string;
  dancerLeft: { name: string; city?: string | null };
  dancerRight: { name: string; city?: string | null };
  currentRound: number;
  onSubmit: (matchId: string, technique: number, musicality: number, performance: number, round: number) => void;
}

export default function SliderVoting({ matchId, dancerLeft, dancerRight, currentRound, onSubmit }: SliderVotingProps) {
  const [technique, setTechnique] = useState([0]);
  const [musicality, setMusicality] = useState([0]);
  const [performance, setPerformance] = useState([0]);

  const total = technique[0] + musicality[0] + performance[0];

  const handleSubmit = () => {
    onSubmit(matchId, technique[0], musicality[0], performance[0], currentRound);
  };

  const getValueColor = (value: number) => {
    if (value < 0) return "text-opponent-left";
    if (value > 0) return "text-opponent-right";
    return "text-muted-foreground";
  };

  const getWinnerIndicator = () => {
    if (total < 0) return `← ${dancerLeft.name} wins`;
    if (total > 0) return `${dancerRight.name} wins →`;
    return "Tied";
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4 text-center">
        <Card className="p-4 border-opponent-left/50">
          <div className="text-2xl font-bold text-opponent-left">
            {dancerLeft.name}
          </div>
          {dancerLeft.city && (
            <div className="text-sm text-muted-foreground">{dancerLeft.city}</div>
          )}
        </Card>
        <Card className="p-4 border-opponent-right/50">
          <div className="text-2xl font-bold text-opponent-right">
            {dancerRight.name}
          </div>
          {dancerRight.city && (
            <div className="text-sm text-muted-foreground">{dancerRight.city}</div>
          )}
        </Card>
      </div>

      <div className="space-y-6 p-6 bg-card rounded-lg border">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Technique</Label>
            <span className={`font-bold text-lg ${getValueColor(technique[0])}`}>
              {technique[0] > 0 ? `+${technique[0]}` : technique[0]}
            </span>
          </div>
          <Slider
            value={technique}
            onValueChange={setTechnique}
            min={-5}
            max={5}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="text-opponent-left">-5 Left</span>
            <span>0</span>
            <span className="text-opponent-right">+5 Right</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Musicality</Label>
            <span className={`font-bold text-lg ${getValueColor(musicality[0])}`}>
              {musicality[0] > 0 ? `+${musicality[0]}` : musicality[0]}
            </span>
          </div>
          <Slider
            value={musicality}
            onValueChange={setMusicality}
            min={-5}
            max={5}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="text-opponent-left">-5 Left</span>
            <span>0</span>
            <span className="text-opponent-right">+5 Right</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Performance</Label>
            <span className={`font-bold text-lg ${getValueColor(performance[0])}`}>
              {performance[0] > 0 ? `+${performance[0]}` : performance[0]}
            </span>
          </div>
          <Slider
            value={performance}
            onValueChange={setPerformance}
            min={-5}
            max={5}
            step={0.5}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="text-opponent-left">-5 Left</span>
            <span>0</span>
            <span className="text-opponent-right">+5 Right</span>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-lg">Total Score</Label>
            <span className={`font-bold text-2xl ${getValueColor(total)}`}>
              {total > 0 ? `+${total}` : total}
            </span>
          </div>
          <div className={`text-center text-lg font-semibold mb-4 ${getValueColor(total)}`}>
            {getWinnerIndicator()}
          </div>
          <Button
            onClick={handleSubmit}
            className="w-full"
            size="lg"
            disabled={total === 0}
          >
            Submit Vote
          </Button>
        </div>
      </div>
    </div>
  );
}

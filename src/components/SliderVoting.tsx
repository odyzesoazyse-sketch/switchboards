import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { User, ArrowLeft, ArrowRight } from "lucide-react";

interface SliderVotingProps {
  matchId: string;
  dancerLeft: { name: string; city?: string | null; photo_url?: string | null; video_url?: string | null };
  dancerRight: { name: string; city?: string | null; photo_url?: string | null; video_url?: string | null };
  currentRound: number;
  onSubmit: (matchId: string, technique: number, musicality: number, performance: number, round: number) => void;
  disabled?: boolean;
}

export default function SliderVoting({ matchId, dancerLeft, dancerRight, currentRound, onSubmit, disabled = false }: SliderVotingProps) {
  const [technique, setTechnique] = useState([0]);
  const [musicality, setMusicality] = useState([0]);
  const [performance, setPerformance] = useState([0]);

  const total = technique[0] + musicality[0] + performance[0];

  const handleSubmit = () => {
    onSubmit(matchId, technique[0], musicality[0], performance[0], currentRound);
  };

  const getValueColor = (value: number) => {
    if (value < 0) return "text-primary";
    if (value > 0) return "text-secondary";
    return "text-muted-foreground";
  };

  const getSliderBackground = (value: number) => {
    if (value < 0) return "bg-primary/20";
    if (value > 0) return "bg-secondary/20";
    return "bg-muted";
  };

  return (
    <div className="space-y-6">
      {/* Dancer names header */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 card-red">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
              {dancerLeft.video_url ? (
                <video src={dancerLeft.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
              ) : dancerLeft.photo_url ? (
                <img src={dancerLeft.photo_url} alt={dancerLeft.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="overflow-hidden">
              <div className="font-display font-bold text-primary truncate">{dancerLeft.name}</div>
              {dancerLeft.city && (
                <div className="text-xs text-muted-foreground truncate">{dancerLeft.city}</div>
              )}
            </div>
          </div>
        </Card>
        <Card className="p-4 card-blue">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center overflow-hidden shrink-0">
              {dancerRight.video_url ? (
                <video src={dancerRight.video_url} className="w-full h-full object-cover" autoPlay loop muted playsInline />
              ) : dancerRight.photo_url ? (
                <img src={dancerRight.photo_url} alt={dancerRight.name} className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-secondary" />
              )}
            </div>
            <div className="overflow-hidden">
              <div className="font-display font-bold text-secondary truncate">{dancerRight.name}</div>
              {dancerRight.city && (
                <div className="text-xs text-muted-foreground truncate">{dancerRight.city}</div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Sliders */}
      <Card className="p-6 space-y-8 border-border/50">
        {/* Technique */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Technique</Label>
            <span className={`font-display font-bold text-xl ${getValueColor(technique[0])}`}>
              {technique[0] > 0 ? `+${technique[0]}` : technique[0]}
            </span>
          </div>
          <div className={`p-4 rounded-xl ${getSliderBackground(technique[0])} transition-colors`}>
            <Slider
              value={technique}
              onValueChange={setTechnique}
              min={-5}
              max={5}
              step={0.5}
              disabled={disabled}
              className="cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-primary">
              <ArrowLeft className="w-3 h-3" /> {dancerLeft.name}
            </span>
            <span className="flex items-center gap-1 text-secondary">
              {dancerRight.name} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Musicality */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Musicality</Label>
            <span className={`font-display font-bold text-xl ${getValueColor(musicality[0])}`}>
              {musicality[0] > 0 ? `+${musicality[0]}` : musicality[0]}
            </span>
          </div>
          <div className={`p-4 rounded-xl ${getSliderBackground(musicality[0])} transition-colors`}>
            <Slider
              value={musicality}
              onValueChange={setMusicality}
              min={-5}
              max={5}
              step={0.5}
              disabled={disabled}
              className="cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-primary">
              <ArrowLeft className="w-3 h-3" /> {dancerLeft.name}
            </span>
            <span className="flex items-center gap-1 text-secondary">
              {dancerRight.name} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Performance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Performance</Label>
            <span className={`font-display font-bold text-xl ${getValueColor(performance[0])}`}>
              {performance[0] > 0 ? `+${performance[0]}` : performance[0]}
            </span>
          </div>
          <div className={`p-4 rounded-xl ${getSliderBackground(performance[0])} transition-colors`}>
            <Slider
              value={performance}
              onValueChange={setPerformance}
              min={-5}
              max={5}
              step={0.5}
              disabled={disabled}
              className="cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="flex items-center gap-1 text-primary">
              <ArrowLeft className="w-3 h-3" /> {dancerLeft.name}
            </span>
            <span className="flex items-center gap-1 text-secondary">
              {dancerRight.name} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Total & Submit */}
        <div className="pt-6 border-t border-border/50">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-lg font-semibold">Total Score</Label>
            <span className={`font-display font-bold text-3xl ${getValueColor(total)}`}>
              {total > 0 ? `+${total}` : total}
            </span>
          </div>

          <div className={`text-center py-3 rounded-xl mb-6 ${getSliderBackground(total)}`}>
            <span className={`font-display font-semibold ${getValueColor(total)}`}>
              {total < 0 && `${dancerLeft.name} wins`}
              {total > 0 && `${dancerRight.name} wins`}
              {total === 0 && "Tied - move a slider"}
            </span>
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full h-14 text-lg"
            size="lg"
            disabled={disabled || total === 0}
          >
            Submit Vote
          </Button>
        </div>
      </Card>
    </div>
  );
}
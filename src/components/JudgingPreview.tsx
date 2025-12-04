import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { User, Star, ThumbsUp } from "lucide-react";
import { JudgingConfig } from "./JudgingModeSelector";

interface JudgingPreviewProps {
  config: JudgingConfig;
  dancerLeftName?: string;
  dancerRightName?: string;
}

export default function JudgingPreview({ 
  config, 
  dancerLeftName = "Dancer A", 
  dancerRightName = "Dancer B" 
}: JudgingPreviewProps) {
  
  const renderSimplePreview = () => (
    <div className="space-y-3 sm:space-y-4">
      <p className="text-center text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
        Judges tap to select the round winner
      </p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button className="p-3 sm:p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:bg-primary/10 transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-1.5 sm:mb-2">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
          </div>
          <p className="font-semibold text-primary text-xs sm:text-sm truncate">{dancerLeftName}</p>
        </button>
        <button className="p-3 sm:p-4 rounded-xl border-2 border-secondary/30 bg-secondary/5 hover:bg-secondary/10 transition-all">
          <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-xl bg-secondary/10 flex items-center justify-center mb-1.5 sm:mb-2">
            <User className="w-5 h-5 sm:w-6 sm:h-6 text-secondary" />
          </div>
          <p className="font-semibold text-secondary text-xs sm:text-sm truncate">{dancerRightName}</p>
        </button>
      </div>
    </div>
  );

  const renderSlidersPreview = () => {
    const criteria = config.mode === 'sliders' 
      ? [
          { name: 'Technique', value: 2 },
          { name: 'Musicality', value: -1 },
          { name: 'Performance', value: 1 },
        ]
      : config.criteria.map((c, i) => ({ 
          name: c.name || `Criterion ${i + 1}`, 
          value: 0,
          min: c.min,
          max: c.max
        }));

    return (
      <div className="space-y-3 sm:space-y-4">
        <p className="text-center text-xs sm:text-sm text-muted-foreground mb-2">
          Judges adjust sliders to score each criterion
        </p>
        
        {/* Dancer headers */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-primary/5 border border-primary/20">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
              <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-primary truncate">{dancerLeftName}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 p-1.5 sm:p-2 rounded-lg bg-secondary/5 border border-secondary/20">
            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-secondary/10 flex items-center justify-center shrink-0">
              <User className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-secondary" />
            </div>
            <span className="text-[10px] sm:text-xs font-medium text-secondary truncate">{dancerRightName}</span>
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-2 sm:space-y-3">
          {criteria.map((c, i) => (
            <div key={i} className="space-y-1">
              <div className="flex justify-between text-[10px] sm:text-xs">
                <span className="font-medium truncate mr-2">{c.name}</span>
                <span className={`font-semibold shrink-0 ${c.value > 0 ? 'text-secondary' : c.value < 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                  {c.value > 0 ? `+${c.value}` : c.value}
                </span>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-muted/50">
                <Slider
                  value={[c.value]}
                  min={c.min ?? -5}
                  max={c.max ?? 5}
                  step={0.5}
                  disabled
                  className="cursor-not-allowed"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border/50">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="font-medium">Total</span>
            <span className="font-bold text-secondary">+2</span>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
            {dancerRightName} wins this round
          </p>
        </div>
      </div>
    );
  };

  const renderPointsPreview = (maxPoints: number) => {
    const isStars = maxPoints === 5;
    
    return (
      <div className="space-y-3 sm:space-y-4">
        <p className="text-center text-xs sm:text-sm text-muted-foreground mb-2">
          Judges rate each dancer {isStars ? 'with stars' : 'with points'}
        </p>

        {/* Dancer scoring cards */}
        <div className="space-y-2 sm:space-y-3">
          {[
            { name: dancerLeftName, score: isStars ? 4 : 8, color: 'primary' },
            { name: dancerRightName, score: isStars ? 3 : 7, color: 'secondary' },
          ].map((dancer, i) => (
            <div 
              key={i}
              className={`p-2 sm:p-3 rounded-xl border bg-${dancer.color}/5 border-${dancer.color}/20`}
            >
              <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-${dancer.color}/10 flex items-center justify-center shrink-0`}>
                    <User className={`w-3 h-3 sm:w-4 sm:h-4 text-${dancer.color}`} />
                  </div>
                  <span className="font-medium text-xs sm:text-sm truncate">{dancer.name}</span>
                </div>
                <Badge variant="secondary" className="font-bold text-[10px] sm:text-xs shrink-0">
                  {dancer.score}/{maxPoints}
                </Badge>
              </div>
              
              {isStars ? (
                <div className="flex gap-0.5 sm:gap-1">
                  {Array.from({ length: maxPoints }).map((_, j) => (
                    <Star 
                      key={j}
                      className={`w-4 h-4 sm:w-5 sm:h-5 ${j < dancer.score ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex gap-0.5 sm:gap-1 flex-wrap">
                  {Array.from({ length: maxPoints }).map((_, j) => (
                    <div 
                      key={j}
                      className={`w-5 h-5 sm:w-6 sm:h-6 rounded text-[10px] sm:text-xs flex items-center justify-center font-medium transition-colors ${
                        j < dancer.score 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {j + 1}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border/50 text-center">
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            Higher total score wins the round
          </p>
        </div>
      </div>
    );
  };

  const renderCustomPreview = () => {
    if (config.criteria.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Add criteria to see preview</p>
        </div>
      );
    }

    // Custom criteria behave like sliders
    return renderSlidersPreview();
  };

  const getPreviewContent = () => {
    switch (config.mode) {
      case 'simple':
        return renderSimplePreview();
      case 'sliders':
        return renderSlidersPreview();
      case 'points_5':
        return renderPointsPreview(5);
      case 'points_10':
        return renderPointsPreview(10);
      case 'custom':
        return renderCustomPreview();
      default:
        return renderSimplePreview();
    }
  };

  const getModeTitle = () => {
    const titles: Record<string, string> = {
      simple: 'Pick Winner Mode',
      sliders: '3-Slider Mode',
      points_5: '5-Point Score Mode',
      points_10: '10-Point Score Mode',
      custom: 'Custom Criteria Mode',
    };
    return titles[config.mode] || 'Voting Mode';
  };

  return (
    <Card className="p-3 sm:p-4 border-dashed border-2 border-border/50 bg-muted/30">
      <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
            <ThumbsUp className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
          </div>
          <span className="font-semibold text-xs sm:text-sm truncate">Judge Preview</span>
        </div>
        <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
          {getModeTitle()}
        </Badge>
      </div>
      
      <div className="bg-background rounded-xl p-3 sm:p-4 border border-border/50">
        {getPreviewContent()}
      </div>

      <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border/30 flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
        <span>Rounds: {config.roundsToWin}</span>
        <span>{config.allowTies ? 'Ties OK' : 'No ties'}</span>
      </div>
    </Card>
  );
}
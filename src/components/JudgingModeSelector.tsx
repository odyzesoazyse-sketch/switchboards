import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  ThumbsUp, 
  Sliders, 
  Star, 
  Hash, 
  Settings2, 
  Plus, 
  Trash2,
  Check,
  Info,
  Eye
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import JudgingPreview from "./JudgingPreview";

export interface JudgingCriterion {
  id: string;
  name: string;
  min: number;
  max: number;
  step: number;
}

export interface JudgingConfig {
  mode: 'simple' | 'sliders' | 'points_5' | 'points_10' | 'custom';
  criteria: JudgingCriterion[];
  roundsToWin: number;
  allowTies: boolean;
}

interface JudgingModeSelectorProps {
  value: JudgingConfig;
  onChange: (config: JudgingConfig) => void;
}

const PRESET_MODES = [
  {
    id: 'simple' as const,
    name: 'Pick Winner',
    description: 'Judges select who won the round',
    icon: ThumbsUp,
    criteria: [],
  },
  {
    id: 'sliders' as const,
    name: '3 Criteria Sliders',
    description: 'Technique, Musicality, Performance (-5 to +5)',
    icon: Sliders,
    criteria: [
      { id: '1', name: 'Technique', min: -5, max: 5, step: 0.5 },
      { id: '2', name: 'Musicality', min: -5, max: 5, step: 0.5 },
      { id: '3', name: 'Performance', min: -5, max: 5, step: 0.5 },
    ],
  },
  {
    id: 'points_5' as const,
    name: '5-Point Score',
    description: 'Score each dancer 1-5 stars',
    icon: Star,
    criteria: [
      { id: '1', name: 'Score', min: 1, max: 5, step: 1 },
    ],
  },
  {
    id: 'points_10' as const,
    name: '10-Point Score',
    description: 'Score each dancer 1-10 points',
    icon: Hash,
    criteria: [
      { id: '1', name: 'Score', min: 1, max: 10, step: 1 },
    ],
  },
  {
    id: 'custom' as const,
    name: 'Custom System',
    description: 'Create your own criteria',
    icon: Settings2,
    criteria: [],
  },
];

export default function JudgingModeSelector({ value, onChange }: JudgingModeSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const handleModeSelect = (modeId: JudgingConfig['mode']) => {
    const preset = PRESET_MODES.find(m => m.id === modeId);
    if (preset) {
      onChange({
        ...value,
        mode: modeId,
        criteria: modeId === 'custom' ? value.criteria : preset.criteria,
      });
    }
  };

  const addCriterion = () => {
    const newCriterion: JudgingCriterion = {
      id: Date.now().toString(),
      name: '',
      min: -5,
      max: 5,
      step: 1,
    };
    onChange({
      ...value,
      criteria: [...value.criteria, newCriterion],
    });
  };

  const updateCriterion = (id: string, field: keyof JudgingCriterion, fieldValue: string | number) => {
    onChange({
      ...value,
      criteria: value.criteria.map(c => 
        c.id === id ? { ...c, [field]: fieldValue } : c
      ),
    });
  };

  const removeCriterion = (id: string) => {
    onChange({
      ...value,
      criteria: value.criteria.filter(c => c.id !== id),
    });
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection Grid - responsive */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {PRESET_MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = value.mode === mode.id;
          
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleModeSelect(mode.id)}
              className={`
                relative p-3 sm:p-4 rounded-xl border-2 transition-all text-left
                ${isSelected 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-border/50 hover:border-border hover:bg-muted/50'
                }
              `}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                </div>
              )}
              <Icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-1.5 sm:mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className={`font-semibold text-xs sm:text-sm ${isSelected ? 'text-primary' : ''}`}>
                {mode.name}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2 hidden sm:block">
                {mode.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Custom Criteria Editor */}
      {value.mode === 'custom' && (
        <Card className="p-4 border-primary/30 bg-primary/5">
          <div className="flex items-center justify-between mb-4">
            <Label className="text-base font-semibold">Custom Criteria</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCriterion}
              disabled={value.criteria.length >= 6}
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {value.criteria.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Add criteria to create your judging system</p>
            </div>
          ) : (
            <div className="space-y-3">
              {value.criteria.map((criterion, index) => (
                <div 
                  key={criterion.id}
                  className="p-3 bg-background rounded-lg border border-border/50 space-y-3"
                >
                  {/* Mobile: stacked layout */}
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="shrink-0 w-6 h-6 p-0 justify-center">
                      {index + 1}
                    </Badge>
                    <Input
                      placeholder="Criterion name"
                      value={criterion.name}
                      onChange={(e) => updateCriterion(criterion.id, 'name', e.target.value)}
                      className="flex-1 h-9"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCriterion(criterion.id)}
                      className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10 h-9 w-9"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  {/* Range inputs - responsive */}
                  <div className="flex items-center gap-2 pl-8">
                    <span className="text-xs text-muted-foreground shrink-0">Range:</span>
                    <Input
                      type="number"
                      value={criterion.min}
                      onChange={(e) => updateCriterion(criterion.id, 'min', Number(e.target.value))}
                      className="w-16 h-8 text-center text-sm"
                    />
                    <span className="text-muted-foreground text-sm">to</span>
                    <Input
                      type="number"
                      value={criterion.max}
                      onChange={(e) => updateCriterion(criterion.id, 'max', Number(e.target.value))}
                      className="w-16 h-8 text-center text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Advanced Settings Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Settings2 className="w-4 h-4" />
        Advanced Settings
        <Badge variant="outline" className="text-xs">
          {showAdvanced ? 'Hide' : 'Show'}
        </Badge>
      </button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <Card className="p-4 space-y-4 border-border/50">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="font-semibold">Rounds to Win</Label>
              <p className="text-xs text-muted-foreground">
                How many rounds to win the match
              </p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onChange({ ...value, roundsToWin: num })}
                  className={`
                    w-10 h-10 rounded-lg font-semibold transition-all
                    ${value.roundsToWin === num
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                    }
                  `}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="font-semibold">Allow Ties</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="w-4 h-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>When enabled, rounds can end in a tie</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                Enable if draws are allowed
              </p>
            </div>
            <Switch
              checked={value.allowTies}
              onCheckedChange={(checked) => onChange({ ...value, allowTies: checked })}
            />
          </div>
        </Card>
      )}

      {/* Preview Toggle */}
      <button
        type="button"
        onClick={() => setShowPreview(!showPreview)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Eye className="w-4 h-4" />
        Judge View Preview
        <Badge variant="outline" className="text-xs">
          {showPreview ? 'Hide' : 'Show'}
        </Badge>
      </button>

      {/* Preview */}
      {showPreview && (
        <JudgingPreview config={value} />
      )}
    </div>
  );
}
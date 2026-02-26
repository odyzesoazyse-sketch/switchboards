import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, ArrowRight, Check, Plus, Trash2, ChevronDown, ChevronUp,
  Sparkles, Calendar, MapPin, Trophy, Zap
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import JudgingModeSelector, { JudgingConfig } from "@/components/JudgingModeSelector";
import { Progress } from "@/components/ui/progress";

interface Nomination {
  id: string;
  name: string;
  description: string;
  judgingConfig: JudgingConfig;
  isOpen: boolean;
  selectionFormat: number;
  concurrentCircles: number;
}

const defaultJudgingConfig: JudgingConfig = {
  mode: 'simple',
  criteria: [],
  roundsToWin: 2,
  allowTies: false,
  votePerRound: true,
};

const STEPS = [
  { id: 1, title: "Name", icon: Sparkles, description: "What's your battle called?" },
  { id: 2, title: "Date & Time", icon: Calendar, description: "When is it happening?" },
  { id: 3, title: "Location", icon: MapPin, description: "Where will it take place?" },
  { id: 4, title: "Categories", icon: Trophy, description: "Set up your categories" },
];

const CreateBattle = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);

  // Form state
  const [battleName, setBattleName] = useState("");
  const [battleDate, setBattleDate] = useState("");
  const [battleTime, setBattleTime] = useState("");
  const [location, setLocation] = useState("");
  const [nominations, setNominations] = useState<Nomination[]>([
    {
      id: "1",
      name: "",
      description: "",
      judgingConfig: { ...defaultJudgingConfig },
      isOpen: true,
      selectionFormat: 1,
      concurrentCircles: 1,
    }
  ]);

  const progress = (currentStep / STEPS.length) * 100;

  const animateTransition = (newStep: number) => {
    setDirection(newStep > currentStep ? 'forward' : 'backward');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(newStep);
      setIsAnimating(false);
    }, 150);
  };

  const nextStep = () => {
    // Validate current step
    if (currentStep === 1 && !battleName.trim()) {
      toast.error("Enter a battle name");
      return;
    }
    if (currentStep === 2 && (!battleDate || !battleTime)) {
      toast.error("Select date and time");
      return;
    }
    if (currentStep < STEPS.length) {
      animateTransition(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      animateTransition(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step < currentStep) {
      animateTransition(step);
    }
  };

  const addNomination = () => {
    if (nominations.length >= 5) {
      toast.error("Maximum 5 categories");
      return;
    }
    setNominations([
      ...nominations.map(n => ({ ...n, isOpen: false })),
      {
        id: Date.now().toString(),
        name: "",
        description: "",
        judgingConfig: { ...defaultJudgingConfig },
        isOpen: true,
        selectionFormat: 1,
        concurrentCircles: 1,
      }
    ]);
  };

  const removeNomination = (id: string) => {
    if (nominations.length === 1) {
      toast.error("Must have at least 1 category");
      return;
    }
    setNominations(nominations.filter(n => n.id !== id));
  };

  const updateNomination = (id: string, field: keyof Nomination, value: any) => {
    setNominations(nominations.map(n =>
      n.id === id ? { ...n, [field]: value } : n
    ));
  };

  const toggleNomination = (id: string) => {
    setNominations(nominations.map(n =>
      n.id === id ? { ...n, isOpen: !n.isOpen } : n
    ));
  };

  const getModeLabel = (mode: JudgingConfig['mode']) => {
    const labels = {
      simple: 'Pick Winner',
      sliders: '3 Sliders',
      points_5: '5-Point',
      points_10: '10-Point',
      custom: 'Custom',
    };
    return labels[mode];
  };

  const handleSubmit = async () => {
    const emptyNominations = nominations.filter(n => !n.name.trim());
    if (emptyNominations.length > 0) {
      toast.error("All categories must have a name");
      return;
    }

    for (const nom of nominations) {
      if (nom.judgingConfig.mode === 'custom' && nom.judgingConfig.criteria.length === 0) {
        toast.error(`Category "${nom.name}" has custom judging but no criteria defined`);
        return;
      }
      if (nom.judgingConfig.mode === 'custom') {
        const emptyCriteria = nom.judgingConfig.criteria.filter(c => !c.name.trim());
        if (emptyCriteria.length > 0) {
          toast.error(`All criteria in "${nom.name}" must have names`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Must sign in");
        navigate("/auth");
        return;
      }

      const dateTime = new Date(`${battleDate}T${battleTime}`);

      const { data: battle, error: battleError } = await supabase
        .from("battles")
        .insert({
          name: battleName,
          date: dateTime.toISOString(),
          location: location || null,
          organizer_id: user.id,
          phase: "registration"
        })
        .select()
        .single();

      if (battleError) throw battleError;

      const nominationsToInsert = nominations.map(n => ({
        battle_id: battle.id,
        name: n.name,
        description: n.description || null,
        phase: "registration" as const,
        judging_mode: n.judgingConfig.mode,
        judging_criteria: JSON.parse(JSON.stringify(n.judgingConfig.criteria)),
        rounds_to_win: n.judgingConfig.roundsToWin,
        allow_ties: n.judgingConfig.allowTies,
        vote_per_round: n.judgingConfig.votePerRound !== false,
        selection_format: n.selectionFormat,
        concurrent_circles: n.concurrentCircles,
      }));

      const { error: nominationsError } = await supabase
        .from("nominations")
        .insert(nominationsToInsert as any);

      if (nominationsError) throw nominationsError;

      toast.success("Battle created!");
      navigate(`/battle/${battle.id}`);
    } catch (error: any) {
      console.error("Error creating battle:", error);
      toast.error(error.message || "Error creating battle");
    } finally {
      setLoading(false);
    }
  };

  const CurrentIcon = STEPS[currentStep - 1].icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {STEPS.length}
            </span>
          </div>

          {/* Progress bar */}
          <Progress value={progress} className="h-1.5" />

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              const isCompleted = currentStep > step.id;
              const isCurrent = currentStep === step.id;

              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  disabled={step.id > currentStep}
                  className={`flex flex-col items-center gap-1 transition-all duration-300 ${step.id > currentStep ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isCompleted
                    ? 'bg-primary text-primary-foreground scale-90'
                    : isCurrent
                      ? 'bg-primary text-primary-foreground scale-110 ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                    }`}>
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${isCurrent ? 'text-primary' : 'text-muted-foreground'
                    }`}>
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div
          className={`transition-all duration-300 ${isAnimating
            ? direction === 'forward'
              ? 'opacity-0 translate-x-8'
              : 'opacity-0 -translate-x-8'
            : 'opacity-100 translate-x-0'
            }`}
        >
          {/* Step header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <CurrentIcon className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">
              {STEPS[currentStep - 1].description}
            </h1>
            <p className="text-muted-foreground">
              {currentStep === 1 && "Choose a memorable name for your event"}
              {currentStep === 2 && "Set when dancers should arrive"}
              {currentStep === 3 && "Help participants find the venue"}
              {currentStep === 4 && "Define battle categories and judging rules"}
            </p>
          </div>

          {/* Step 1: Name */}
          {currentStep === 1 && (
            <Card className="p-6 sm:p-8 border-border/50 shadow-lg">
              <div className="space-y-4">
                <Label htmlFor="name" className="text-lg font-semibold">Battle Name</Label>
                <Input
                  id="name"
                  placeholder="Street Dance Championship 2025"
                  value={battleName}
                  onChange={(e) => setBattleName(e.target.value)}
                  className="text-xl h-14 font-medium"
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  This will be displayed on the main screen and shared with participants
                </p>
              </div>
            </Card>
          )}

          {/* Step 2: Date & Time */}
          {currentStep === 2 && (
            <Card className="p-6 sm:p-8 border-border/50 shadow-lg">
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="date" className="text-lg font-semibold">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={battleDate}
                    onChange={(e) => setBattleDate(e.target.value)}
                    className="h-14 text-lg"
                    autoFocus
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="time" className="text-lg font-semibold">Start Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={battleTime}
                    onChange={(e) => setBattleTime(e.target.value)}
                    className="h-14 text-lg"
                  />
                </div>
                {battleDate && battleTime && (
                  <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                    <p className="text-sm font-medium text-primary">
                      📅 {new Date(`${battleDate}T${battleTime}`).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Step 3: Location */}
          {currentStep === 3 && (
            <Card className="p-6 sm:p-8 border-border/50 shadow-lg">
              <div className="space-y-4">
                <Label htmlFor="location" className="text-lg font-semibold">Venue Address</Label>
                <Input
                  id="location"
                  placeholder="Cultural Center, 123 Main Street"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="text-lg h-14"
                  autoFocus
                />
                <p className="text-sm text-muted-foreground">
                  Optional – You can add or update this later
                </p>
              </div>
            </Card>
          )}

          {/* Step 4: Categories */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {nominations.length}/5 categories
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addNomination}
                  disabled={nominations.length >= 5}
                  className="border-primary text-primary hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>

              <div className="space-y-3">
                {nominations.map((nomination, index) => (
                  <Collapsible
                    key={nomination.id}
                    open={nomination.isOpen}
                    onOpenChange={() => toggleNomination(nomination.id)}
                  >
                    <Card className={`overflow-hidden transition-all duration-300 ${nomination.isOpen ? 'ring-2 ring-primary/30' : ''
                      }`}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-colors ${nomination.isOpen
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                              }`}>
                              {index + 1}
                            </div>
                            <div className="text-left">
                              <div className="font-semibold">
                                {nomination.name || `Category ${index + 1}`}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getModeLabel(nomination.judgingConfig.mode)} • {nomination.judgingConfig.roundsToWin} rounds
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {nominations.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeNomination(nomination.id);
                                }}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                            {nomination.isOpen ? (
                              <ChevronUp className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="p-4 pt-0 space-y-6 border-t border-border/50">
                          <div className="grid gap-4 sm:grid-cols-2 pt-4">
                            <div className="space-y-2">
                              <Label>Name *</Label>
                              <Input
                                placeholder="Solo, Doubles, Power Moves..."
                                value={nomination.name}
                                onChange={(e) => updateNomination(nomination.id, 'name', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                placeholder="Optional description..."
                                value={nomination.description}
                                onChange={(e) => updateNomination(nomination.id, 'description', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2 pt-2">
                            <div className="space-y-2">
                              <Label>Dancers per Heat (Selection)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={8}
                                value={nomination.selectionFormat}
                                onChange={(e) => updateNomination(nomination.id, 'selectionFormat', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Concurrent Circles (Selection)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={4}
                                value={nomination.concurrentCircles}
                                onChange={(e) => updateNomination(nomination.id, 'concurrentCircles', parseInt(e.target.value) || 1)}
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-base font-semibold">Judging System</Label>
                            <JudgingModeSelector
                              value={nomination.judgingConfig}
                              onChange={(config) => updateNomination(nomination.id, 'judgingConfig', config)}
                            />
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-8">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="flex-1 h-14 text-base"
              disabled={isAnimating}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}

          {currentStep < STEPS.length ? (
            <Button
              type="button"
              onClick={nextStep}
              className="flex-1 h-14 text-base bg-primary hover:bg-primary/90"
              disabled={isAnimating}
            >
              Continue
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={loading || isAnimating}
              className="flex-1 h-14 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Create Battle
                </>
              )}
            </Button>
          )}
        </div>

        {/* Summary preview */}
        {currentStep === 4 && battleName && (
          <Card className="mt-6 p-4 bg-muted/50 border-dashed">
            <h3 className="font-semibold text-sm mb-2 text-muted-foreground">PREVIEW</h3>
            <div className="space-y-1">
              <p className="font-bold text-lg">{battleName}</p>
              {battleDate && battleTime && (
                <p className="text-sm text-muted-foreground">
                  📅 {new Date(`${battleDate}T${battleTime}`).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })} at {battleTime}
                </p>
              )}
              {location && (
                <p className="text-sm text-muted-foreground">📍 {location}</p>
              )}
              <p className="text-sm text-muted-foreground">
                🏆 {nominations.length} categor{nominations.length === 1 ? 'y' : 'ies'}
              </p>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CreateBattle;

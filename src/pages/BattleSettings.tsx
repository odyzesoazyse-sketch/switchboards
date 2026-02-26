import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, ArrowRight, Check, Save, Plus, Trash2, ChevronDown, ChevronUp,
  Settings2, Calendar, MapPin, Trophy, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import JudgingModeSelector, { JudgingConfig, JudgingCriterion } from "@/components/JudgingModeSelector";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Battle {
  id: string;
  name: string;
  date: string;
  location: string | null;
  phase: string;
  organizer_id: string;
}

interface Nomination {
  id: string;
  name: string;
  description: string | null;
  phase: string;
  judging_mode: string;
  judging_criteria: JudgingCriterion[] | null;
  rounds_to_win: number;
  allow_ties: boolean;
  vote_per_round?: boolean;
  selection_format: number;
  concurrent_circles: number;
  isOpen?: boolean;
}

const STEPS = [
  { id: 1, title: "Name", icon: Sparkles, description: "Battle name" },
  { id: 2, title: "Date & Time", icon: Calendar, description: "When" },
  { id: 3, title: "Location", icon: MapPin, description: "Where" },
  { id: 4, title: "Categories", icon: Trophy, description: "Judging" },
];

export default function BattleSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [nominations, setNominations] = useState<(Nomination & { isOpen: boolean })[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);

  // Battle form state
  const [battleName, setBattleName] = useState("");
  const [battleDate, setBattleDate] = useState("");
  const [battleTime, setBattleTime] = useState("");
  const [location, setLocation] = useState("");

  const progress = (currentStep / STEPS.length) * 100;

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: battleData, error: battleError } = await supabase
        .from("battles")
        .select("*")
        .eq("id", id)
        .single();

      if (battleError) throw battleError;

      if (battleData.organizer_id !== user.id) {
        toast.error("Access denied");
        navigate(`/battle/${id}`);
        return;
      }

      setBattle(battleData);
      setBattleName(battleData.name);
      const date = new Date(battleData.date);
      setBattleDate(date.toISOString().split('T')[0]);
      setBattleTime(date.toTimeString().slice(0, 5));
      setLocation(battleData.location || "");

      const { data: nominationsData, error: nominationsError } = await supabase
        .from("nominations")
        .select("*")
        .eq("battle_id", id)
        .order("created_at", { ascending: true });

      if (nominationsError) throw nominationsError;

      setNominations((nominationsData || []).map((n, i) => ({
        ...n,
        judging_criteria: Array.isArray(n.judging_criteria)
          ? n.judging_criteria as unknown as JudgingCriterion[]
          : [],
        isOpen: i === 0
      })));
    } catch (error: any) {
      console.error("Error loading data:", error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const animateTransition = (newStep: number) => {
    setDirection(newStep > currentStep ? 'forward' : 'backward');
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(newStep);
      setIsAnimating(false);
    }, 150);
  };

  const nextStep = () => {
    if (currentStep === 1 && !battleName.trim()) {
      toast.error("Battle name is required");
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
    animateTransition(step);
  };

  const getJudgingConfig = (nom: Nomination): JudgingConfig => {
    return {
      mode: nom.judging_mode as JudgingConfig['mode'],
      criteria: nom.judging_criteria || [],
      roundsToWin: nom.rounds_to_win || 2,
      allowTies: nom.allow_ties || false,
      votePerRound: nom.vote_per_round !== false,
    };
  };

  const updateNomination = (nomId: string, field: string, value: any) => {
    setNominations(nominations.map(n =>
      n.id === nomId ? { ...n, [field]: value } : n
    ));
  };

  const updateNominationJudging = (nomId: string, config: JudgingConfig) => {
    setNominations(nominations.map(n =>
      n.id === nomId ? {
        ...n,
        judging_mode: config.mode,
        judging_criteria: config.criteria,
        rounds_to_win: config.roundsToWin,
        allow_ties: config.allowTies,
        vote_per_round: config.votePerRound !== false,
      } : n
    ));
  };

  const toggleNomination = (nomId: string) => {
    setNominations(nominations.map(n =>
      n.id === nomId ? { ...n, isOpen: !n.isOpen } : n
    ));
  };

  const addNomination = async () => {
    if (nominations.length >= 5) {
      toast.error("Maximum 5 categories");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("nominations")
        .insert({
          battle_id: id,
          name: `Category ${nominations.length + 1}`,
          phase: "registration",
          judging_mode: "simple",
          selection_format: 1,
        })
        .select()
        .single();

      if (error) throw error;

      setNominations([
        ...nominations.map(n => ({ ...n, isOpen: false })),
        { ...data, judging_criteria: [], selection_format: 1, concurrent_circles: 1, isOpen: true }
      ]);
      toast.success("Category added");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const deleteNomination = async (nomId: string) => {
    if (nominations.length <= 1) {
      toast.error("Must have at least 1 category");
      return;
    }

    try {
      const { error } = await supabase
        .from("nominations")
        .delete()
        .eq("id", nomId);

      if (error) throw error;

      setNominations(nominations.filter(n => n.id !== nomId));
      toast.success("Category deleted");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      simple: 'Pick Winner',
      sliders: '3 Sliders',
      points_5: '5-Point',
      points_10: '10-Point',
      custom: 'Custom',
    };
    return labels[mode] || mode;
  };

  const saveCurrentStep = async () => {
    setSaving(true);
    try {
      if (currentStep <= 3) {
        // Save battle info
        if (!battleName.trim()) {
          toast.error("Battle name is required");
          setSaving(false);
          return;
        }

        const dateTime = new Date(`${battleDate}T${battleTime}`);
        const { error } = await supabase
          .from("battles")
          .update({
            name: battleName.trim(),
            date: dateTime.toISOString(),
            location: location.trim() || null,
          })
          .eq("id", id);

        if (error) throw error;
        toast.success("Saved!");
      } else {
        // Save nominations
        for (const nom of nominations) {
          if (!nom.name.trim()) {
            toast.error("All categories must have names");
            setSaving(false);
            return;
          }
          if (nom.judging_mode === 'custom' && (!nom.judging_criteria || nom.judging_criteria.length === 0)) {
            toast.error(`Category "${nom.name}" has custom judging but no criteria`);
            setSaving(false);
            return;
          }
        }

        for (const nom of nominations) {
          const { error } = await supabase
            .from("nominations")
            .update({
              name: nom.name.trim(),
              description: nom.description?.trim() || null,
              judging_mode: nom.judging_mode,
              judging_criteria: JSON.parse(JSON.stringify(nom.judging_criteria || [])),
              rounds_to_win: nom.rounds_to_win,
              allow_ties: nom.allow_ties,
              vote_per_round: nom.vote_per_round !== false,
              selection_format: nom.selection_format || 1,
              concurrent_circles: nom.concurrent_circles || 1,
              phase: (nom.phase as "registration" | "selection" | "bracket" | "completed") || 'registration',
            })
            .eq("id", nom.id);

          if (error) throw error;
        }
        toast.success("Categories saved!");
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Battle not found</p>
      </div>
    );
  }

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
              onClick={() => navigate(`/battle/${id}`)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Battle
            </Button>
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Settings</span>
            </div>
          </div>

          {/* Progress bar */}
          <Progress value={progress} className="h-1.5" />

          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              const isCurrent = currentStep === step.id;

              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(step.id)}
                  className="flex flex-col items-center gap-1 transition-all duration-300 cursor-pointer"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${isCurrent
                    ? 'bg-primary text-primary-foreground scale-110 ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}>
                    <StepIcon className="w-5 h-5" />
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
              {currentStep === 1 && "Battle Name"}
              {currentStep === 2 && "Date & Time"}
              {currentStep === 3 && "Location"}
              {currentStep === 4 && "Categories & Judging"}
            </h1>
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
                  Optional – helps participants find the venue
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
                                {getModeLabel(nomination.judging_mode)} • {nomination.rounds_to_win} rounds
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
                                  deleteNomination(nomination.id);
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
                              <Label>Tournament Phase</Label>
                              <Select
                                value={nomination.phase || 'registration'}
                                onValueChange={(value) => updateNomination(nomination.id, 'phase', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="registration">Registration</SelectItem>
                                  <SelectItem value="selection">Selection Heats</SelectItem>
                                  <SelectItem value="bracket">Tournament Bracket</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Selection Format (Dancers per heat)</Label>
                              <Input
                                type="number"
                                min={1}
                                max={16}
                                placeholder="e.g. 1, 2, 4..."
                                value={nomination.selection_format || 1}
                                onChange={(e) => updateNomination(nomination.id, 'selection_format', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Concurrent Circles</Label>
                              <Input
                                type="number"
                                min={1}
                                max={4}
                                placeholder="1 = One floor, 2 = Two split floors..."
                                value={nomination.concurrent_circles || 1}
                                onChange={(e) => updateNomination(nomination.id, 'concurrent_circles', parseInt(e.target.value) || 1)}
                              />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                              <Label>Description</Label>
                              <Input
                                placeholder="Optional description..."
                                value={nomination.description || ""}
                                onChange={(e) => updateNomination(nomination.id, 'description', e.target.value)}
                              />
                            </div>
                          </div>

                          <div className="space-y-3">
                            <Label className="text-base font-semibold">Judging System</Label>
                            <JudgingModeSelector
                              value={getJudgingConfig(nomination)}
                              onChange={(config) => updateNominationJudging(nomination.id, config)}
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

        {/* Navigation and Save buttons */}
        <div className="flex gap-3 mt-8">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="h-12"
              disabled={isAnimating}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={saveCurrentStep}
            disabled={saving || isAnimating}
            className="h-12"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? "Saving..." : "Save"}
          </Button>

          {currentStep < STEPS.length && (
            <Button
              type="button"
              onClick={nextStep}
              className="flex-1 h-12 bg-primary hover:bg-primary/90"
              disabled={isAnimating}
            >
              Next
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          )}

          {currentStep === STEPS.length && (
            <Button
              type="button"
              onClick={() => navigate(`/battle/${id}`)}
              className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/80"
            >
              <Check className="w-5 h-5 mr-2" />
              Done
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

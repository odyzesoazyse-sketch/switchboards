import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import JudgingModeSelector, { JudgingConfig } from "@/components/JudgingModeSelector";

interface Nomination {
  id: string;
  name: string;
  description: string;
  judgingConfig: JudgingConfig;
  isOpen: boolean;
}

const defaultJudgingConfig: JudgingConfig = {
  mode: 'simple',
  criteria: [],
  roundsToWin: 2,
  allowTies: false,
};

const CreateBattle = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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
      isOpen: true 
    }
  ]);

  const addNomination = () => {
    if (nominations.length >= 5) {
      toast.error("Maximum 5 categories");
      return;
    }
    // Close all existing nominations and add new one open
    setNominations([
      ...nominations.map(n => ({ ...n, isOpen: false })),
      { 
        id: Date.now().toString(), 
        name: "", 
        description: "",
        judgingConfig: { ...defaultJudgingConfig },
        isOpen: true
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!battleName.trim()) {
      toast.error("Enter battle name");
      return;
    }
    
    if (!battleDate || !battleTime) {
      toast.error("Specify battle date and time");
      return;
    }

    const emptyNominations = nominations.filter(n => !n.name.trim());
    if (emptyNominations.length > 0) {
      toast.error("All categories must have a name");
      return;
    }

    // Validate custom criteria
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
      }));

      const { error: nominationsError } = await supabase
        .from("nominations")
        .insert(nominationsToInsert);

      if (nominationsError) throw nominationsError;

      toast.success("Battle created!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating battle:", error);
      toast.error(error.message || "Error creating battle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to dashboard
          </Button>
          <h1 className="text-2xl font-bold">
            Create New Battle
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Battle Info */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Battle Information
              </CardTitle>
              <CardDescription>
                Basic event details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Battle Name *</Label>
                <Input
                  id="name"
                  placeholder="Street Battle 2025"
                  value={battleName}
                  onChange={(e) => setBattleName(e.target.value)}
                  className="text-lg h-12"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={battleDate}
                    onChange={(e) => setBattleDate(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={battleTime}
                    onChange={(e) => setBattleTime(e.target.value)}
                    className="h-11"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, Address"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Nominations */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categories</CardTitle>
                  <CardDescription>
                    Add categories with custom judging systems
                  </CardDescription>
                </div>
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
            </CardHeader>
            <CardContent className="space-y-4">
              {nominations.map((nomination, index) => (
                <Collapsible
                  key={nomination.id}
                  open={nomination.isOpen}
                  onOpenChange={() => toggleNomination(nomination.id)}
                >
                  <div className="border border-border/50 rounded-xl overflow-hidden bg-card">
                    {/* Header */}
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-semibold text-primary">
                            {index + 1}
                          </div>
                          <div className="text-left">
                            <div className="font-semibold">
                              {nomination.name || `Category ${index + 1}`}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getModeLabel(nomination.judgingConfig.mode)} • {nomination.judgingConfig.roundsToWin} rounds to win
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
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
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

                    {/* Content */}
                    <CollapsibleContent>
                      <div className="p-4 pt-0 space-y-6 border-t border-border/50">
                        {/* Basic Info */}
                        <div className="grid gap-4 sm:grid-cols-2 pt-4">
                          <div className="space-y-2">
                            <Label>Category Name *</Label>
                            <Input
                              placeholder="Solo, Doubles, Power Moves..."
                              value={nomination.name}
                              onChange={(e) => updateNomination(nomination.id, 'name', e.target.value)}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                              placeholder="Brief description..."
                              value={nomination.description}
                              onChange={(e) => updateNomination(nomination.id, 'description', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Judging System */}
                        <div className="space-y-3">
                          <Label className="text-base font-semibold">Judging System</Label>
                          <JudgingModeSelector
                            value={nomination.judgingConfig}
                            onChange={(config) => updateNomination(nomination.id, 'judgingConfig', config)}
                          />
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 bg-primary hover:bg-primary/90"
            >
              {loading ? "Creating..." : "Create Battle"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateBattle;
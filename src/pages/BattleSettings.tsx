import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Plus, Trash2, ChevronDown, ChevronUp, Settings2, Calendar, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import JudgingModeSelector, { JudgingConfig, JudgingCriterion } from "@/components/JudgingModeSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  isOpen?: boolean;
}

export default function BattleSettings() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [battle, setBattle] = useState<Battle | null>(null);
  const [nominations, setNominations] = useState<(Nomination & { isOpen: boolean })[]>([]);
  
  // Battle form state
  const [battleName, setBattleName] = useState("");
  const [battleDate, setBattleDate] = useState("");
  const [battleTime, setBattleTime] = useState("");
  const [location, setLocation] = useState("");

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

  const getJudgingConfig = (nom: Nomination): JudgingConfig => {
    return {
      mode: nom.judging_mode as JudgingConfig['mode'],
      criteria: nom.judging_criteria || [],
      roundsToWin: nom.rounds_to_win || 2,
      allowTies: nom.allow_ties || false,
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
        })
        .select()
        .single();

      if (error) throw error;

      setNominations([
        ...nominations.map(n => ({ ...n, isOpen: false })),
        { ...data, judging_criteria: [], isOpen: true }
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

  const saveBattleInfo = async () => {
    if (!battleName.trim()) {
      toast.error("Battle name is required");
      return;
    }

    setSaving(true);
    try {
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
      toast.success("Battle info saved");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const saveNominations = async () => {
    // Validate
    for (const nom of nominations) {
      if (!nom.name.trim()) {
        toast.error("All categories must have names");
        return;
      }
      if (nom.judging_mode === 'custom' && (!nom.judging_criteria || nom.judging_criteria.length === 0)) {
        toast.error(`Category "${nom.name}" has custom judging but no criteria`);
        return;
      }
      if (nom.judging_mode === 'custom' && nom.judging_criteria) {
        const empty = nom.judging_criteria.filter(c => !c.name.trim());
        if (empty.length > 0) {
          toast.error(`All criteria in "${nom.name}" must have names`);
          return;
        }
      }
    }

    setSaving(true);
    try {
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
          })
          .eq("id", nom.id);

        if (error) throw error;
      }
      toast.success("Categories saved");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <header className="border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(`/battle/${id}`)}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Battle
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings2 className="w-6 h-6 text-primary" />
                Battle Settings
              </h1>
              <p className="text-muted-foreground">{battle.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="info" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Battle Info</TabsTrigger>
            <TabsTrigger value="categories">Categories & Judging</TabsTrigger>
          </TabsList>

          {/* Battle Info Tab */}
          <TabsContent value="info">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Battle Information
                </CardTitle>
                <CardDescription>
                  Update basic event details
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
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    placeholder="City, Address"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>

                <Button 
                  onClick={saveBattleInfo} 
                  disabled={saving}
                  className="w-full h-12"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save Battle Info"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Categories & Judging Systems</CardTitle>
                    <CardDescription>
                      Configure judging modes for each category
                    </CardDescription>
                  </div>
                  <Button
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
                                {getModeLabel(nomination.judging_mode)} • {nomination.rounds_to_win} rounds to win
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

                      <CollapsibleContent>
                        <div className="p-4 pt-0 space-y-6 border-t border-border/50">
                          <div className="grid gap-4 sm:grid-cols-2 pt-4">
                            <div className="space-y-2">
                              <Label>Category Name *</Label>
                              <Input
                                placeholder="Solo, Doubles, Power Moves..."
                                value={nomination.name}
                                onChange={(e) => updateNomination(nomination.id, 'name', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Description</Label>
                              <Input
                                placeholder="Brief description..."
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
                    </div>
                  </Collapsible>
                ))}

                <Button 
                  onClick={saveNominations} 
                  disabled={saving}
                  className="w-full h-12"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Saving..." : "Save All Categories"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
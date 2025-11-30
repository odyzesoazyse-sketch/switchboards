import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Nomination {
  id: string;
  name: string;
  description: string;
  judging_mode: 'simple' | 'sliders';
}

const CreateBattle = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [battleName, setBattleName] = useState("");
  const [battleDate, setBattleDate] = useState("");
  const [battleTime, setBattleTime] = useState("");
  const [location, setLocation] = useState("");
  const [nominations, setNominations] = useState<Nomination[]>([
    { id: "1", name: "", description: "", judging_mode: "simple" }
  ]);

  const addNomination = () => {
    if (nominations.length >= 5) {
      toast.error("Maximum 5 categories");
      return;
    }
    setNominations([...nominations, { 
      id: Date.now().toString(), 
      name: "", 
      description: "",
      judging_mode: "simple"
    }]);
  };

  const removeNomination = (id: string) => {
    if (nominations.length === 1) {
      toast.error("Must have at least 1 category");
      return;
    }
    setNominations(nominations.filter(n => n.id !== id));
  };

  const updateNomination = (id: string, field: 'name' | 'description' | 'judging_mode', value: string) => {
    setNominations(nominations.map(n => 
      n.id === id ? { ...n, [field]: value } : n
    ));
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

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Must sign in");
        navigate("/auth");
        return;
      }

      // Combine date and time
      const dateTime = new Date(`${battleDate}T${battleTime}`);
      
      // Create battle
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

      // Create nominations
      const nominationsToInsert = nominations.map(n => ({
        battle_id: battle.id,
        name: n.name,
        description: n.description || null,
        phase: "registration" as const,
        judging_mode: n.judging_mode
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
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/dashboard")}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to dashboard
          </Button>
          <h1 className="text-2xl font-bold text-gradient-primary">
            Create new battle
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Battle Info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Battle Information</CardTitle>
              <CardDescription>
                Basic event details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Battle Name *</Label>
                <Input
                  id="name"
                  placeholder="Moscow Break 2025"
                  value={battleName}
                  onChange={(e) => setBattleName(e.target.value)}
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
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Moscow, Lenin St. 1"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Nominations */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Categories</CardTitle>
                  <CardDescription>
                    Add up to 5 categories (Solo, Doubles, Power Moves, etc.)
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
                  Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {nominations.map((nomination, index) => (
                <div 
                  key={nomination.id}
                  className="p-4 border border-border/50 rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      Category {index + 1}
                    </span>
                    {nominations.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeNomination(nomination.id)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`nom-name-${nomination.id}`}>
                      Name *
                    </Label>
                    <Input
                      id={`nom-name-${nomination.id}`}
                      placeholder="Solo, Doubles, Power Moves..."
                      value={nomination.name}
                      onChange={(e) => updateNomination(nomination.id, 'name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`nom-desc-${nomination.id}`}>
                      Description
                    </Label>
                    <Textarea
                      id={`nom-desc-${nomination.id}`}
                      placeholder="Brief category description..."
                      value={nomination.description}
                      onChange={(e) => updateNomination(nomination.id, 'description', e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`nom-mode-${nomination.id}`}>
                      Judging Mode
                    </Label>
                    <Select
                      value={nomination.judging_mode}
                      onValueChange={(value) => updateNomination(nomination.id, 'judging_mode', value)}
                    >
                      <SelectTrigger id={`nom-mode-${nomination.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="simple">Simple Vote (Pick Winner)</SelectItem>
                        <SelectItem value="sliders">3 Sliders (-5 to +5)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 glow-primary"
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

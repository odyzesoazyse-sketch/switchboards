import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Users, Trophy, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface Battle {
  id: string;
  name: string;
  date: string;
  location: string | null;
  phase: string;
}

interface Nomination {
  id: string;
  name: string;
  description: string | null;
  phase: string;
  max_dancers: number;
  dancer_count: number;
}

const dancerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(50, "Name too long"),
  city: z.string().trim().max(50, "City name too long").optional(),
  age: z.number().min(5, "Age must be at least 5").max(99, "Invalid age").optional(),
});

export default function BattlePublic() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [battle, setBattle] = useState<Battle | null>(null);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNomination, setSelectedNomination] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", city: "", age: "" });
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    if (id) loadBattle();
  }, [id]);

  const loadBattle = async () => {
    try {
      const { data: battleData, error: battleError } = await supabase
        .from("battles")
        .select("*")
        .eq("id", id)
        .single();

      if (battleError) throw battleError;
      setBattle(battleData);

      const { data: nominationsData } = await supabase
        .from("nominations")
        .select("id, name, description, phase, max_dancers")
        .eq("battle_id", id);

      if (nominationsData) {
        // Get dancer counts for each nomination
        const nominationsWithCounts = await Promise.all(
          nominationsData.map(async (nom) => {
            const { count } = await supabase
              .from("dancers")
              .select("*", { count: "exact", head: true })
              .eq("nomination_id", nom.id);
            return { ...nom, dancer_count: count || 0 };
          })
        );
        setNominations(nominationsWithCounts);
      }
    } catch (error: any) {
      toast.error("Battle not found");
      navigate("/battles");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNomination) {
      toast.error("Please select a category");
      return;
    }

    const validation = dancerSchema.safeParse({
      name: formData.name,
      city: formData.city || undefined,
      age: formData.age ? parseInt(formData.age) : undefined,
    });

    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setSubmitting(true);
    try {
      // Check if registration is still open
      const nomination = nominations.find(n => n.id === selectedNomination);
      if (!nomination || nomination.phase !== "registration") {
        toast.error("Registration is closed for this category");
        return;
      }

      if (nomination.dancer_count >= nomination.max_dancers) {
        toast.error("This category is full");
        return;
      }

      // Get next position
      const { count } = await supabase
        .from("dancers")
        .select("*", { count: "exact", head: true })
        .eq("nomination_id", selectedNomination);

      const { error } = await supabase.from("dancers").insert({
        nomination_id: selectedNomination,
        name: formData.name.trim(),
        city: formData.city.trim() || null,
        age: formData.age ? parseInt(formData.age) : null,
        position: (count || 0) + 1,
        average_score: 0,
        is_qualified: false,
      });

      if (error) throw error;

      setRegistered(true);
      toast.success("Registration successful!");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
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

  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-card flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="pt-8 pb-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">You're Registered!</h2>
            <p className="text-muted-foreground mb-6">
              Good luck at {battle.name}! Show up on time and bring your best moves.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/battles")}>Browse More Battles</Button>
              <Button onClick={() => { setRegistered(false); setFormData({ name: "", city: "", age: "" }); setSelectedNomination(null); }}>
                Register Another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openNominations = nominations.filter(n => n.phase === "registration");

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/battles")} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Battles
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3 text-gradient-primary">{battle.name}</h1>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(battle.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </span>
            {battle.location && (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {battle.location}
              </span>
            )}
          </div>
        </div>

        {openNominations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Registration Closed</h3>
              <p className="text-muted-foreground">This battle is no longer accepting registrations.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Register as Dancer</CardTitle>
              <CardDescription>Fill out the form to register for this battle</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">Select Category *</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {openNominations.map((nom) => (
                        <Card
                          key={nom.id}
                          className={`cursor-pointer transition-all ${
                            selectedNomination === nom.id
                              ? "border-primary ring-2 ring-primary/20"
                              : "hover:border-primary/50"
                          } ${nom.dancer_count >= nom.max_dancers ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => nom.dancer_count < nom.max_dancers && setSelectedNomination(nom.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-semibold">{nom.name}</span>
                              {selectedNomination === nom.id && (
                                <CheckCircle className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            {nom.description && (
                              <p className="text-sm text-muted-foreground mb-2">{nom.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4" />
                              <span>{nom.dancer_count} / {nom.max_dancers}</span>
                              {nom.dancer_count >= nom.max_dancers && (
                                <Badge variant="destructive" className="ml-auto">Full</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="name">Dancer Name *</Label>
                      <Input
                        id="name"
                        placeholder="Your stage name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        maxLength={50}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="Your city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="Your age"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        min={5}
                        max={99}
                      />
                    </div>
                  </div>
                </div>

                <Button type="submit" className="w-full" size="lg" disabled={submitting || !selectedNomination}>
                  {submitting ? "Registering..." : "Register"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

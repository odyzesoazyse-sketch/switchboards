import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, MapPin, Users, Trophy, CheckCircle, Loader2, MessageCircle, Gavel } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import LiveChat from "@/components/LiveChat";
import { MediaUploader } from "@/components/MediaUploader";

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
  const [formData, setFormData] = useState({
    name: "",
    city: "",
    age: "",
    mediaUrl: null as string | null,
    mediaType: null as 'photo' | 'video' | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isJudge, setIsJudge] = useState(false);
  const [hasAppliedJudge, setHasAppliedJudge] = useState(false);
  const [applyingJudge, setApplyingJudge] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        checkJudgeStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) checkJudgeStatus(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkJudgeStatus = async (userId: string) => {
    // Check if user has applied for this specific battle
    const { data: application } = await supabase
      .from("judge_applications")
      .select("status")
      .eq("battle_id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (application) {
      setHasAppliedJudge(true);
    }

    // Check if user is a judge in general (has a judge role anywhere) to show the button
    const { data: anyJudgeRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "judge")
      .limit(1);

    if (anyJudgeRole && anyJudgeRole.length > 0) {
      setIsJudge(true);
    }
  };

  const handleJudgeApply = async () => {
    if (!user) {
      toast.error("Please sign in first");
      navigate("/auth");
      return;
    }
    setApplyingJudge(true);
    try {
      const { error } = await supabase.from("judge_applications").insert({
        battle_id: id,
        user_id: user.id,
        status: "pending"
      });
      if (error) throw error;
      setHasAppliedJudge(true);
      toast.success("Application sent! Waiting for organizer approval.");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setApplyingJudge(false);
    }
  };

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
      const nomination = nominations.find(n => n.id === selectedNomination);
      if (!nomination || nomination.phase !== "registration") {
        toast.error("Registration is closed for this category");
        return;
      }

      if (nomination.dancer_count >= nomination.max_dancers) {
        toast.error("This category is full");
        return;
      }

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
        photo_url: formData.mediaType === 'photo' ? formData.mediaUrl : null,
        video_url: formData.mediaType === 'video' ? formData.mediaUrl : null,
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

  // Success state
  if (registered) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full text-center animate-scale-in">
          <CardContent className="pt-10 pb-8">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-success/10 flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-display font-bold mb-2">You're In!</h2>
            <p className="text-muted-foreground mb-8">
              Good luck at {battle.name}! Show up on time and bring your best moves.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => navigate("/battles")}>
                Browse More
              </Button>
              <Button onClick={() => {
                setRegistered(false);
                setFormData({ name: "", city: "", age: "", mediaUrl: null, mediaType: null });
                setSelectedNomination(null);
              }}>
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
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate("/battles")} className="mb-8 -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          All Battles
        </Button>

        {/* Battle Info */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-display font-bold mb-4 text-gradient-mixed">
            {battle.name}
          </h1>
          <div className="flex flex-wrap gap-4 text-muted-foreground">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {new Date(battle.date).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
              })}
            </span>
            {battle.location && (
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {battle.location}
              </span>
            )}
          </div>
        </div>

        {/* Registration closed */}
        {openNominations.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-6">
                <Trophy className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-display font-semibold mb-2">Registration Closed</h3>
              <p className="text-muted-foreground">This battle is no longer accepting registrations.</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="font-display">Register as Dancer</CardTitle>
              <CardDescription>Fill out the form to join this battle</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Category Selection */}
                <div>
                  <Label className="text-base font-semibold mb-4 block">
                    Select Category <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {openNominations.map((nom) => {
                      const isFull = nom.dancer_count >= nom.max_dancers;
                      const isSelected = selectedNomination === nom.id;

                      return (
                        <Card
                          key={nom.id}
                          className={`cursor-pointer transition-all ${isSelected
                            ? "border-primary ring-2 ring-primary/20 bg-primary/5"
                            : "hover:border-primary/50"
                            } ${isFull ? "opacity-50 cursor-not-allowed" : ""}`}
                          onClick={() => !isFull && setSelectedNomination(nom.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold">{nom.name}</span>
                              {isSelected && (
                                <CheckCircle className="w-5 h-5 text-primary" />
                              )}
                            </div>
                            {nom.description && (
                              <p className="text-sm text-muted-foreground mb-3">{nom.description}</p>
                            )}
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">
                                {nom.dancer_count} / {nom.max_dancers}
                              </span>
                              {isFull && (
                                <Badge variant="destructive" className="ml-auto text-xs">Full</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                  <div>
                    <Label className="mb-2 block">Dancer Media / Avatar</Label>
                    <MediaUploader
                      bucket="media"
                      onUploadSelect={(url, type) => setFormData(prev => ({ ...prev, mediaUrl: url, mediaType: type }))}
                      existingUrl={formData.mediaUrl}
                      existingType={formData.mediaType}
                    />
                  </div>

                  <div>
                    <Label htmlFor="name">
                      Dancer Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Your stage name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      maxLength={50}
                      required
                      className="mt-2 h-12"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        placeholder="Your city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        maxLength={50}
                        className="mt-2 h-12"
                      />
                    </div>
                    <div>
                      <Label htmlFor="age">Age</Label>
                      <Input
                        id="age"
                        type="number"
                        placeholder="Your age"
                        value={formData.age}
                        onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                        min={5}
                        max={99}
                        className="mt-2 h-12"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-lg"
                  size="lg"
                  disabled={submitting || !selectedNomination}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Register Now"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Judge Application Section */}
        {user && (
          <Card className="mt-8 border-border/50 bg-secondary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-secondary" />
                Want to Judge?
              </CardTitle>
              <CardDescription>
                Apply to be a judge for this battle. The organizer will review your application.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasAppliedJudge ? (
                <div className="flex items-center gap-2 text-success bg-success/10 p-4 rounded-xl">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Application sent! Pending approval.</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-secondary/50 hover:bg-secondary/10 hover:text-secondary"
                  onClick={handleJudgeApply}
                  disabled={applyingJudge}
                >
                  {applyingJudge ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Gavel className="w-4 h-4 mr-2" />}
                  Apply as Judge
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Live Chat */}
      <div className="fixed bottom-4 right-4 z-50">
        {chatOpen ? (
          <LiveChat battleId={id!} isOpen={chatOpen} onToggle={() => setChatOpen(false)} />
        ) : (
          <Button
            onClick={() => setChatOpen(true)}
            className="rounded-full w-14 h-14 shadow-lg"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        )}
      </div>
    </div>
  );
}
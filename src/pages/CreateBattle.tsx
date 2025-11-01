import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

interface Nomination {
  id: string;
  name: string;
  description: string;
}

const CreateBattle = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [battleName, setBattleName] = useState("");
  const [battleDate, setBattleDate] = useState("");
  const [battleTime, setBattleTime] = useState("");
  const [location, setLocation] = useState("");
  const [nominations, setNominations] = useState<Nomination[]>([
    { id: "1", name: "", description: "" }
  ]);

  const addNomination = () => {
    if (nominations.length >= 5) {
      toast.error("Максимум 5 номинаций");
      return;
    }
    setNominations([...nominations, { 
      id: Date.now().toString(), 
      name: "", 
      description: "" 
    }]);
  };

  const removeNomination = (id: string) => {
    if (nominations.length === 1) {
      toast.error("Должна быть минимум 1 номинация");
      return;
    }
    setNominations(nominations.filter(n => n.id !== id));
  };

  const updateNomination = (id: string, field: 'name' | 'description', value: string) => {
    setNominations(nominations.map(n => 
      n.id === id ? { ...n, [field]: value } : n
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!battleName.trim()) {
      toast.error("Введите название баттла");
      return;
    }
    
    if (!battleDate || !battleTime) {
      toast.error("Укажите дату и время баттла");
      return;
    }

    const emptyNominations = nominations.filter(n => !n.name.trim());
    if (emptyNominations.length > 0) {
      toast.error("Все номинации должны иметь название");
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Необходимо войти в систему");
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
        phase: "registration" as const
      }));

      const { error: nominationsError } = await supabase
        .from("nominations")
        .insert(nominationsToInsert);

      if (nominationsError) throw nominationsError;

      toast.success("Баттл создан!");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Error creating battle:", error);
      toast.error(error.message || "Ошибка при создании баттла");
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
            Назад к дашборду
          </Button>
          <h1 className="text-2xl font-bold text-gradient-primary">
            Создать новый баттл
          </h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Battle Info */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Информация о баттле</CardTitle>
              <CardDescription>
                Основные данные мероприятия
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Название баттла *</Label>
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
                  <Label htmlFor="date">Дата *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={battleDate}
                    onChange={(e) => setBattleDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Время *</Label>
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
                <Label htmlFor="location">Локация</Label>
                <Input
                  id="location"
                  placeholder="Москва, ул. Ленина 1"
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
                  <CardTitle>Номинации</CardTitle>
                  <CardDescription>
                    Добавьте до 5 номинаций (Solo, Doubles, Power Moves и т.д.)
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
                  Добавить
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
                      Номинация {index + 1}
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
                      Название *
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
                      Описание
                    </Label>
                    <Textarea
                      id={`nom-desc-${nomination.id}`}
                      placeholder="Краткое описание номинации..."
                      value={nomination.description}
                      onChange={(e) => updateNomination(nomination.id, 'description', e.target.value)}
                      rows={2}
                    />
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
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary hover:bg-primary/90 glow-primary"
            >
              {loading ? "Создание..." : "Создать баттл"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
};

export default CreateBattle;

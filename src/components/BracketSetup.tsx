import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Shuffle, Hand, GripVertical, ArrowRight, Trophy, RotateCcw, X } from "lucide-react";

interface Dancer {
  id: string;
  name: string;
  city: string | null;
  average_score?: number;
  is_qualified?: boolean;
}

interface BracketSlot {
  position: number;
  dancerId: string | null;
}

interface BracketSetupProps {
  nominationId: string;
  dancers: Dancer[];
  topCount: number;
  onBracketCreated: () => void;
}

const ROUND_LABELS: Record<number, string> = {
  1: "final",
  2: "semifinal",
  4: "quarterfinal",
  8: "round_of_16",
  16: "round_of_32",
};

function getRoundLabel(matchCount: number): string {
  return ROUND_LABELS[matchCount] || `round_of_${matchCount * 2}`;
}

export default function BracketSetup({ nominationId, dancers, topCount, onBracketCreated }: BracketSetupProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<"choose" | "random_preview" | "manual">("choose");
  const [slots, setSlots] = useState<BracketSlot[]>([]);
  const [availableDancers, setAvailableDancers] = useState<Dancer[]>([]);
  const [selectedDancerForSlot, setSelectedDancerForSlot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Get qualified dancers (top N by score)
  const qualifiedDancers = [...dancers]
    .sort((a, b) => (b.average_score || 0) - (a.average_score || 0))
    .slice(0, topCount);

  // Calculate bracket size (must be power of 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(Math.max(qualifiedDancers.length, 2))));
  const matchCount = bracketSize / 2;

  const initSlots = (dancerList: Dancer[]) => {
    const newSlots: BracketSlot[] = [];
    for (let i = 0; i < bracketSize; i++) {
      newSlots.push({
        position: i,
        dancerId: dancerList[i]?.id || null,
      });
    }
    setSlots(newSlots);
  };

  const handleRandom = () => {
    const shuffled = [...qualifiedDancers].sort(() => Math.random() - 0.5);
    initSlots(shuffled);
    setMode("random_preview");
  };

  const handleManual = () => {
    initSlots([]);
    setAvailableDancers([...qualifiedDancers]);
    setMode("manual");
  };

  const assignDancerToSlot = (slotIndex: number, dancerId: string) => {
    const newSlots = [...slots];
    // Remove dancer from previous slot if any
    const prevSlot = newSlots.findIndex(s => s.dancerId === dancerId);
    if (prevSlot >= 0) {
      newSlots[prevSlot] = { ...newSlots[prevSlot], dancerId: null };
    }
    // Remove previous dancer from this slot
    const prevDancer = newSlots[slotIndex].dancerId;
    newSlots[slotIndex] = { ...newSlots[slotIndex], dancerId };
    setSlots(newSlots);

    // Update available dancers
    setAvailableDancers(prev => {
      let updated = prev.filter(d => d.id !== dancerId);
      if (prevDancer) {
        const returnedDancer = qualifiedDancers.find(d => d.id === prevDancer);
        if (returnedDancer) updated.push(returnedDancer);
      }
      return updated;
    });
    setSelectedDancerForSlot(null);
  };

  const removeFromSlot = (slotIndex: number) => {
    const dancerId = slots[slotIndex].dancerId;
    if (!dancerId) return;
    const newSlots = [...slots];
    newSlots[slotIndex] = { ...newSlots[slotIndex], dancerId: null };
    setSlots(newSlots);

    const dancer = qualifiedDancers.find(d => d.id === dancerId);
    if (dancer) {
      setAvailableDancers(prev => [...prev, dancer]);
    }
  };

  const getDancerName = (dancerId: string | null) => {
    if (!dancerId) return null;
    return qualifiedDancers.find(d => d.id === dancerId)?.name || "?";
  };

  const filledSlots = slots.filter(s => s.dancerId !== null).length;
  const canSave = filledSlots >= 2 && filledSlots % 2 === 0;

  const saveBracket = async () => {
    setSaving(true);
    try {
      // Bug fix #2: Check for existing matches before creating duplicates
      const { data: existingMatches } = await supabase
        .from("matches")
        .select("id")
        .eq("nomination_id", nominationId)
        .limit(1);

      if (existingMatches && existingMatches.length > 0) {
        toast({ title: "Сетка уже существует", description: "Матчи для этой номинации уже созданы.", variant: "destructive" });
        setSaving(false);
        return;
      }

      // Mark qualified dancers
      const qualifiedIds = slots.filter(s => s.dancerId).map(s => s.dancerId!);
      for (const dId of qualifiedIds) {
        await supabase.from("dancers").update({ is_qualified: true }).eq("id", dId);
      }

      // Create matches from pairs
      const matchesToCreate = [];
      const filledPairs: { left: string; right: string | null }[] = [];

      // Group into pairs
      for (let i = 0; i < slots.length; i += 2) {
        const left = slots[i].dancerId;
        const right = slots[i + 1]?.dancerId || null;
        if (left || right) {
          filledPairs.push({ left: left!, right });
        }
      }

      const actualMatchCount = filledPairs.length;
      const roundLabel = getRoundLabel(actualMatchCount);

      for (let i = 0; i < filledPairs.length; i++) {
        matchesToCreate.push({
          nomination_id: nominationId,
          round: roundLabel,
          position: i,
          dancer_left_id: filledPairs[i].left,
          dancer_right_id: filledPairs[i].right,
          votes_left: 0,
          votes_right: 0,
          is_completed: false,
        });
      }

      // Also create empty next-round matches
      const nextRoundCount = Math.floor(actualMatchCount / 2);
      if (nextRoundCount > 0) {
        const nextRoundLabel = getRoundLabel(nextRoundCount);
        for (let i = 0; i < nextRoundCount; i++) {
          matchesToCreate.push({
            nomination_id: nominationId,
            round: nextRoundLabel,
            position: i,
            dancer_left_id: null,
            dancer_right_id: null,
            votes_left: 0,
            votes_right: 0,
            is_completed: false,
          });
        }

        // Create deeper rounds until final
        let remaining = Math.floor(nextRoundCount / 2);
        while (remaining >= 1) {
          const label = getRoundLabel(remaining);
          for (let i = 0; i < remaining; i++) {
            matchesToCreate.push({
              nomination_id: nominationId,
              round: label,
              position: i,
              dancer_left_id: null,
              dancer_right_id: null,
              votes_left: 0,
              votes_right: 0,
              is_completed: false,
            });
          }
          remaining = Math.floor(remaining / 2);
        }
      }

      const { error } = await supabase.from("matches").insert(matchesToCreate);
      if (error) throw error;

      toast({ title: "Сетка создана", description: `Создано ${filledPairs.length} матчей` });
      onBracketCreated();
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (qualifiedDancers.length < 2) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p>Нужно минимум 2 танцора для создания сетки.</p>
        <p className="text-sm mt-1">Сейчас зарегистрировано: {dancers.length}</p>
      </Card>
    );
  }

  // Mode: Choose
  if (mode === "choose") {
    return (
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-lg text-center">Настройка сетки</h3>
        <p className="text-sm text-muted-foreground text-center">
          {qualifiedDancers.length} танцоров → {matchCount} матчей (Top {topCount})
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={handleRandom} variant="outline" className="h-20 flex-col gap-2">
            <Shuffle className="h-6 w-6" />
            <span>Рандом</span>
          </Button>
          <Button onClick={handleManual} variant="outline" className="h-20 flex-col gap-2">
            <Hand className="h-6 w-6" />
            <span>Вручную</span>
          </Button>
        </div>
      </Card>
    );
  }

  // Mode: Random Preview or Manual
  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {mode === "random_preview" ? "Рандомная сетка" : "Ручная расстановка"}
        </h3>
        <div className="flex gap-2">
          {mode === "random_preview" && (
            <Button variant="ghost" size="sm" onClick={handleRandom}>
              <Shuffle className="h-4 w-4 mr-1" /> Перемешать
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setMode("choose")}>
            <RotateCcw className="h-4 w-4 mr-1" /> Назад
          </Button>
        </div>
      </div>

      {/* Available dancers (manual mode) */}
      {mode === "manual" && availableDancers.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Доступные танцоры ({availableDancers.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableDancers.map(d => (
              <Badge
                key={d.id}
                variant={selectedDancerForSlot === d.id ? "default" : "outline"}
                className="cursor-pointer hover:bg-primary/10 transition-colors"
                onClick={() => setSelectedDancerForSlot(selectedDancerForSlot === d.id ? null : d.id)}
              >
                {d.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Match slots */}
      <div className="space-y-2">
        {Array.from({ length: matchCount }).map((_, matchIdx) => {
          const leftIdx = matchIdx * 2;
          const rightIdx = matchIdx * 2 + 1;
          const leftDancer = getDancerName(slots[leftIdx]?.dancerId);
          const rightDancer = getDancerName(slots[rightIdx]?.dancerId);

          return (
            <div key={matchIdx} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30">
              <Badge variant="outline" className="shrink-0 text-xs w-8 text-center">
                {matchIdx + 1}
              </Badge>

              {/* Left slot */}
              <div
                className={`flex-1 p-2 rounded text-center text-sm font-medium border transition-all cursor-pointer min-h-[36px] flex items-center justify-center gap-1 ${
                  leftDancer
                    ? "bg-primary/10 border-primary/30 text-foreground"
                    : "border-dashed border-muted-foreground/30 text-muted-foreground"
                } ${selectedDancerForSlot && !leftDancer ? "ring-2 ring-primary/50" : ""}`}
                onClick={() => {
                  if (mode === "manual") {
                    if (selectedDancerForSlot && !leftDancer) {
                      assignDancerToSlot(leftIdx, selectedDancerForSlot);
                    } else if (leftDancer && slots[leftIdx]?.dancerId) {
                      removeFromSlot(leftIdx);
                    }
                  }
                }}
              >
                {leftDancer || "—"}
                {leftDancer && mode === "manual" && (
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                )}
              </div>

              <span className="text-xs text-muted-foreground shrink-0">vs</span>

              {/* Right slot */}
              <div
                className={`flex-1 p-2 rounded text-center text-sm font-medium border transition-all cursor-pointer min-h-[36px] flex items-center justify-center gap-1 ${
                  rightDancer
                    ? "bg-secondary/10 border-secondary/30 text-foreground"
                    : "border-dashed border-muted-foreground/30 text-muted-foreground"
                } ${selectedDancerForSlot && !rightDancer ? "ring-2 ring-primary/50" : ""}`}
                onClick={() => {
                  if (mode === "manual") {
                    if (selectedDancerForSlot && !rightDancer) {
                      assignDancerToSlot(rightIdx, selectedDancerForSlot);
                    } else if (rightDancer && slots[rightIdx]?.dancerId) {
                      removeFromSlot(rightIdx);
                    }
                  }
                }}
              >
                {rightDancer || "—"}
                {rightDancer && mode === "manual" && (
                  <X className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status + Save */}
      <div className="flex items-center justify-between pt-2 border-t">
        <span className="text-sm text-muted-foreground">
          Заполнено: {filledSlots} / {bracketSize}
        </span>
        <Button onClick={saveBracket} disabled={!canSave || saving} className="gap-1">
          <Trophy className="h-4 w-4" />
          {saving ? "Сохранение..." : "Создать сетку"}
        </Button>
      </div>
    </Card>
  );
}

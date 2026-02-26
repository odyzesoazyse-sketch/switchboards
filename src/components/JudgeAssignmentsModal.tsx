import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface Judge {
    id: string;
    name: string;
}

interface Nomination {
    id: string;
    name: string;
    concurrent_circles: number;
}

interface JudgeAssignment {
    judge_id: string;
    nomination_id: string;
    phase: string | null;
}

interface Props {
    battleId: string;
}

export default function JudgeAssignmentsModal({ battleId }: Props) {
    const [open, setOpen] = useState(false);
    const [judges, setJudges] = useState<Judge[]>([]);
    const [nominations, setNominations] = useState<Nomination[]>([]);
    const [assignments, setAssignments] = useState<JudgeAssignment[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            loadData();
        }
    }, [open, battleId]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch judge profiles from user_roles
            const { data: roles } = await supabase
                .from("user_roles")
                .select(`
          user_id,
          profiles:user_id ( full_name, email )
        `)
                .eq("battle_id", battleId)
                .eq("role", "judge");

            const judgesList = roles?.map(r => ({
                id: r.user_id,
                name: (r.profiles as any)?.full_name || (r.profiles as any)?.email || "Unknown Judge",
            })) || [];
            setJudges(judgesList);

            // Fetch nominations
            const { data: noms } = await supabase
                .from("nominations")
                .select("id, name, concurrent_circles")
                .eq("battle_id", battleId)
                .order("created_at");
            setNominations(noms || []);

            // Fetch existing assignments
            const { data: existing } = await supabase
                .from("judge_assignments")
                .select("judge_id, nomination_id, phase")
                .eq("battle_id", battleId);

            setAssignments(existing || []);
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to load judge assignments");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleAssignment = async (judgeId: string, nominationId: string) => {
        const isAssigned = assignments.some(a => a.judge_id === judgeId && a.nomination_id === nominationId);

        try {
            if (isAssigned) {
                // Remove assignment
                await supabase
                    .from("judge_assignments")
                    .delete()
                    .eq("battle_id", battleId)
                    .eq("judge_id", judgeId)
                    .eq("nomination_id", nominationId);

                setAssignments(prev => prev.filter(a => !(a.judge_id === judgeId && a.nomination_id === nominationId)));
            } else {
                // Add assignment
                await supabase
                    .from("judge_assignments")
                    .insert({
                        battle_id: battleId,
                        judge_id: judgeId,
                        nomination_id: nominationId,
                        phase: null // For now, mapping broadly to nomination. Later could map to circles.
                    });

                setAssignments(prev => [...prev, { judge_id: judgeId, nomination_id: nominationId, phase: null }]);
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Failed to update assignment");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Users className="w-4 h-4" />
                    Assign Judges
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Judge Assignments</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-muted-foreground">Loading...</div>
                ) : judges.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground">
                        No judges have been added to this battle yet.
                    </div>
                ) : (
                    <div className="space-y-6 mt-4">
                        <p className="text-sm text-muted-foreground">
                            By default, judges can vote in all categories. Select specific categories below to restrict a judge's access. If a judge has NO checked boxes, they can judge everything (or aren't restricted). To restrict them, check at least one box. Wait, actually, if they have assignments, they can ONLY judge those.
                        </p>

                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted text-muted-foreground">
                                    <tr>
                                        <th className="px-4 py-3 font-medium">Judge</th>
                                        {nominations.map(nom => (
                                            <th key={nom.id} className="px-4 py-3 font-medium text-center">
                                                {nom.name}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {judges.map(judge => (
                                        <tr key={judge.id} className="bg-background hover:bg-muted/50 transition-colors">
                                            <td className="px-4 py-3 font-medium">{judge.name}</td>
                                            {nominations.map(nom => {
                                                const isAssigned = assignments.some(a => a.judge_id === judge.id && a.nomination_id === nom.id);
                                                return (
                                                    <td key={nom.id} className="px-4 py-3 text-center">
                                                        <Checkbox
                                                            checked={isAssigned}
                                                            onCheckedChange={() => handleToggleAssignment(judge.id, nom.id)}
                                                        />
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg text-sm">
                            <span className="font-semibold block mb-1">How it works:</span>
                            If a judge is checked for specific categories, they will only see those categories on their device. If a judge has no checked boxes at all, they can see and judge all categories.
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

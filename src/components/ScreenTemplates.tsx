import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Play, Trash2, Layout } from "lucide-react";

interface ScreenTemplate {
  id: string;
  name: string;
  template_type: string;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  background_color: string | null;
  background_gradient_from: string | null;
  background_gradient_to: string | null;
}

interface ScreenTemplatesProps {
  battleId: string;
  onShowTemplate: (template: ScreenTemplate) => void;
}

const PRESET_TEMPLATES = [
  { name: "Intermission", template_type: "intermission", title: "INTERMISSION", subtitle: "We'll be right back" },
  { name: "Coming Up", template_type: "coming_up", title: "COMING UP NEXT", subtitle: "" },
  { name: "Sponsor", template_type: "sponsor", title: "THANK YOU TO OUR SPONSORS", subtitle: "" },
  { name: "Welcome", template_type: "welcome", title: "WELCOME", subtitle: "The battle begins soon" },
];

export default function ScreenTemplates({ battleId, onShowTemplate }: ScreenTemplatesProps) {
  const [templates, setTemplates] = useState<ScreenTemplate[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    template_type: "custom",
    title: "",
    subtitle: "",
    image_url: "",
    background_color: "#1a1a2e",
    background_gradient_from: "#1a1a2e",
    background_gradient_to: "#16213e",
  });
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, [battleId]);

  const loadTemplates = async () => {
    const { data } = await supabase
      .from("screen_templates")
      .select("*")
      .eq("battle_id", battleId)
      .order("created_at", { ascending: true });
    
    setTemplates(data || []);
  };

  const createTemplate = async () => {
    if (!newTemplate.name) {
      toast({ title: "Error", description: "Template name is required", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("screen_templates")
      .insert({
        battle_id: battleId,
        ...newTemplate,
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Template created" });
      setIsDialogOpen(false);
      setNewTemplate({
        name: "",
        template_type: "custom",
        title: "",
        subtitle: "",
        image_url: "",
        background_color: "#1a1a2e",
        background_gradient_from: "#1a1a2e",
        background_gradient_to: "#16213e",
      });
      loadTemplates();
    }
  };

  const createPresetTemplate = async (preset: typeof PRESET_TEMPLATES[0]) => {
    const { error } = await supabase
      .from("screen_templates")
      .insert({
        battle_id: battleId,
        name: preset.name,
        template_type: preset.template_type,
        title: preset.title,
        subtitle: preset.subtitle,
        background_color: "#1a1a2e",
        background_gradient_from: "#1a1a2e",
        background_gradient_to: "#16213e",
      });

    if (!error) {
      loadTemplates();
      toast({ title: "Success", description: `${preset.name} template created` });
    }
  };

  const deleteTemplate = async (id: string) => {
    await supabase.from("screen_templates").delete().eq("id", id);
    loadTemplates();
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Layout className="h-5 w-5" />
          Screen Templates
        </h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              New
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Template name"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={newTemplate.template_type}
                  onValueChange={(v) => setNewTemplate({ ...newTemplate, template_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="intermission">Intermission</SelectItem>
                    <SelectItem value="sponsor">Sponsor</SelectItem>
                    <SelectItem value="welcome">Welcome</SelectItem>
                    <SelectItem value="coming_up">Coming Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title</Label>
                <Input
                  value={newTemplate.title}
                  onChange={(e) => setNewTemplate({ ...newTemplate, title: e.target.value })}
                  placeholder="Main title"
                />
              </div>
              <div>
                <Label>Subtitle</Label>
                <Input
                  value={newTemplate.subtitle}
                  onChange={(e) => setNewTemplate({ ...newTemplate, subtitle: e.target.value })}
                  placeholder="Subtitle text"
                />
              </div>
              <div>
                <Label>Image URL (optional)</Label>
                <Input
                  value={newTemplate.image_url}
                  onChange={(e) => setNewTemplate({ ...newTemplate, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Background From</Label>
                  <Input
                    type="color"
                    value={newTemplate.background_gradient_from}
                    onChange={(e) => setNewTemplate({ ...newTemplate, background_gradient_from: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Background To</Label>
                  <Input
                    type="color"
                    value={newTemplate.background_gradient_to}
                    onChange={(e) => setNewTemplate({ ...newTemplate, background_gradient_to: e.target.value })}
                  />
                </div>
              </div>
              <Button onClick={createTemplate} className="w-full">Create Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick presets */}
      {templates.length === 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Quick add presets:</p>
          <div className="flex flex-wrap gap-2">
            {PRESET_TEMPLATES.map((preset) => (
              <Button
                key={preset.template_type}
                variant="outline"
                size="sm"
                onClick={() => createPresetTemplate(preset)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Templates list */}
      <div className="space-y-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded"
                style={{
                  background: `linear-gradient(135deg, ${template.background_gradient_from || template.background_color}, ${template.background_gradient_to || template.background_color})`
                }}
              />
              <div>
                <p className="font-medium">{template.name}</p>
                <p className="text-xs text-muted-foreground">{template.template_type}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => onShowTemplate(template)}>
                <Play className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => deleteTemplate(template.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
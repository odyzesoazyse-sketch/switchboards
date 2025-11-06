import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ActivityLog {
  id: string;
  event_type: string;
  event_details: any;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  } | null;
}

export default function ActivityLogs() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadLogs();
      
      // Подписка на новые логи
      const channel = supabase
        .channel('activity-logs-updates')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_logs',
            filter: `battle_id=eq.${id}`
          },
          () => {
            loadLogs();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [id]);

  const loadLogs = async () => {
    try {
      const { data: logsData, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("battle_id", id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      // Загружаем профили пользователей
      if (logsData && logsData.length > 0) {
        const userIds = [...new Set(logsData.map(log => log.user_id).filter(Boolean))];
        
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const logsWithProfiles = logsData.map(log => ({
          ...log,
          profiles: log.user_id ? profilesMap.get(log.user_id) || null : null,
        }));

        setLogs(logsWithProfiles as ActivityLog[]);
      } else {
        setLogs([]);
      }
      
      setLoading(false);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const getEventBadge = (eventType: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      "judge_application_submitted": { color: "bg-blue-500", label: "Заявка подана" },
      "judge_application_approved": { color: "bg-green-500", label: "Заявка одобрена" },
      "judge_application_rejected": { color: "bg-red-500", label: "Заявка отклонена" },
      "match_vote_submitted": { color: "bg-purple-500", label: "Голос подан" },
      "match_started": { color: "bg-yellow-500", label: "Матч начат" },
      "match_completed": { color: "bg-green-600", label: "Матч завершён" },
      "screen_updated": { color: "bg-indigo-500", label: "Экран обновлён" },
    };

    const badge = badges[eventType] || { color: "bg-gray-500", label: eventType };
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  const formatDetails = (details: any) => {
    if (!details) return null;
    return (
      <pre className="text-xs bg-muted/50 p-2 rounded mt-2 overflow-auto">
        {JSON.stringify(details, null, 2)}
      </pre>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(`/battle/${id}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад к баттлу
          </Button>
        </div>

        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          Журнал активности
        </h1>

        {logs.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            Пока нет записей в журнале
          </Card>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <Card key={log.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      {getEventBadge(log.event_type)}
                      <div className="mt-2 text-sm">
                        <span className="font-semibold">
                          {log.profiles?.full_name || log.profiles?.email || "Система"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {new Date(log.created_at).toLocaleString("ru-RU")}
                    </div>
                  </div>
                  {log.event_details && formatDetails(log.event_details)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

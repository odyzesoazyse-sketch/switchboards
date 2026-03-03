import { useMemo } from "react";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

interface AiTimekeeperProps {
  eventStartTime: string; // ISO
  totalMatchesPlanned: number;
  matchesCompleted: number;
  avgMinutesPerMatch?: number;
  eventEndTime?: string; // ISO
}

export default function AiTimekeeper({
  eventStartTime,
  totalMatchesPlanned,
  matchesCompleted,
  avgMinutesPerMatch = 5,
  eventEndTime,
}: AiTimekeeperProps) {
  const analysis = useMemo(() => {
    const start = new Date(eventStartTime).getTime();
    const now = Date.now();
    const elapsed = (now - start) / 60000; // minutes

    const remaining = totalMatchesPlanned - matchesCompleted;
    const actualAvg = matchesCompleted > 0 ? elapsed / matchesCompleted : avgMinutesPerMatch;
    const estimatedRemaining = remaining * actualAvg;
    const estimatedEnd = new Date(now + estimatedRemaining * 60000);

    let endTarget: Date | null = null;
    let delayMinutes = 0;

    if (eventEndTime) {
      endTarget = new Date(eventEndTime);
      delayMinutes = Math.round((estimatedEnd.getTime() - endTarget.getTime()) / 60000);
    }

    const pace = matchesCompleted > 0 ? actualAvg : null;
    const status: "ok" | "warning" | "danger" =
      delayMinutes > 30 ? "danger" : delayMinutes > 10 ? "warning" : "ok";

    return { elapsed, remaining, actualAvg, estimatedEnd, delayMinutes, pace, status, endTarget };
  }, [eventStartTime, totalMatchesPlanned, matchesCompleted, avgMinutesPerMatch, eventEndTime]);

  const statusColors = {
    ok: "border-success/30 bg-success/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
    danger: "border-destructive/30 bg-destructive/5 animate-pulse-soft",
  };

  const StatusIcon = analysis.status === "ok" ? CheckCircle : analysis.status === "warning" ? Clock : AlertTriangle;
  const statusTextColor = analysis.status === "ok" ? "text-success" : analysis.status === "warning" ? "text-yellow-500" : "text-destructive";

  return (
    <div className={`p-4 rounded-2xl border ${statusColors[analysis.status]} transition-all`}>
      <div className="flex items-center gap-2 mb-3">
        <StatusIcon className={`w-5 h-5 ${statusTextColor}`} />
        <span className="font-bold font-display text-sm uppercase tracking-wider text-foreground">Timekeeper</span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Elapsed</div>
          <div className="font-bold text-foreground">{Math.round(analysis.elapsed)} min</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Avg/Match</div>
          <div className="font-bold text-foreground">{analysis.pace ? `${analysis.pace.toFixed(1)} min` : "—"}</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[10px] uppercase tracking-wider">Remaining</div>
          <div className="font-bold text-foreground">{analysis.remaining} matches</div>
        </div>
        <div>
          <div className="text-muted-foreground text-[10px] uppercase tracking-wider">ETA</div>
          <div className="font-bold text-foreground">
            {analysis.estimatedEnd.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
      </div>

      {analysis.delayMinutes > 0 && (
        <div className={`mt-3 p-2 rounded-xl ${analysis.status === "danger" ? "bg-destructive/10" : "bg-yellow-500/10"} text-center`}>
          <span className={`text-sm font-black ${statusTextColor}`}>
            ⚠️ {analysis.delayMinutes > 0 ? `+${analysis.delayMinutes} min behind schedule` : "On schedule"}
          </span>
        </div>
      )}
    </div>
  );
}

import { QRCodeSVG } from "qrcode.react";
import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AudienceVoteOverlayProps {
  battleId: string;
  matchId: string | null;
  leftDancerId: string | null;
  rightDancerId: string | null;
  isLight?: boolean;
}

export default function AudienceVoteOverlay({
  battleId,
  matchId,
  leftDancerId,
  rightDancerId,
  isLight = false,
}: AudienceVoteOverlayProps) {
  const [stats, setStats] = useState({ left: 0, right: 0, total: 0 });
  const voteUrl = `${window.location.origin}/battle/${battleId}/vote`;

  useEffect(() => {
    if (!matchId) return;
    loadStats();

    const channel = supabase
      .channel(`screen-audience-${matchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audience_votes' }, () => loadStats())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [matchId]);

  const loadStats = async () => {
    if (!matchId) return;
    const { data: votes } = await supabase
      .from("audience_votes")
      .select("vote_for")
      .eq("match_id", matchId);

    if (votes) {
      const left = votes.filter(v => v.vote_for === leftDancerId).length;
      const right = votes.filter(v => v.vote_for === rightDancerId).length;
      setStats({ left, right, total: votes.length });
    }
  };

  if (!matchId) return null;

  const leftPct = stats.total > 0 ? Math.round((stats.left / stats.total) * 100) : 0;
  const rightPct = stats.total > 0 ? Math.round((stats.right / stats.total) * 100) : 0;

  return (
    <div className={`fixed bottom-8 left-8 ${isLight ? 'bg-white/90 border-gray-200' : 'bg-black/80 border-white/20'} backdrop-blur-xl p-4 rounded-2xl border shadow-2xl z-50 max-w-[200px]`}>
      <div className="flex flex-col items-center gap-3">
        <div className={`text-[10px] uppercase tracking-widest font-bold ${isLight ? 'text-gray-500' : 'text-white/50'}`}>
          Audience Vote
        </div>
        
        <div className="bg-white p-2 rounded-lg">
          <QRCodeSVG value={voteUrl} size={80} level="L" />
        </div>

        {stats.total > 0 && (
          <div className="w-full space-y-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-primary">{leftPct}%</span>
              <span className="text-secondary">{rightPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden flex">
              <div className="bg-primary transition-all duration-500" style={{ width: `${leftPct}%` }} />
              <div className="bg-secondary transition-all duration-500" style={{ width: `${rightPct}%` }} />
            </div>
            <div className={`text-center text-[10px] ${isLight ? 'text-gray-500' : 'text-white/40'} flex items-center justify-center gap-1`}>
              <Users className="w-3 h-3" />
              {stats.total}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

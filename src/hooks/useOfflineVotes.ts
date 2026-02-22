import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PendingVote {
  id: string;
  match_id: string;
  judge_id: string;
  vote_for: string | null;
  round_number: number;
  slider_technique?: number | null;
  slider_musicality?: number | null;
  slider_performance?: number | null;
  created_at: string;
}

const STORAGE_KEY = "offline_pending_votes";

function getPendingVotes(): PendingVote[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePendingVotes(votes: PendingVote[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
}

export function useOfflineVotes() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(getPendingVotes().length);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingVotes();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Try to sync on mount
  useEffect(() => {
    if (isOnline && getPendingVotes().length > 0) {
      syncPendingVotes();
    }
  }, []);

  const syncPendingVotes = useCallback(async () => {
    if (syncingRef.current) return;
    const pending = getPendingVotes();
    if (pending.length === 0) return;

    syncingRef.current = true;
    setSyncing(true);

    const remaining: PendingVote[] = [];

    for (const vote of pending) {
      try {
        const { error } = await supabase.from("match_votes").insert({
          match_id: vote.match_id,
          judge_id: vote.judge_id,
          vote_for: vote.vote_for,
          round_number: vote.round_number,
          slider_technique: vote.slider_technique ?? null,
          slider_musicality: vote.slider_musicality ?? null,
          slider_performance: vote.slider_performance ?? null,
        });

        if (error) {
          // Duplicate vote — skip it, don't re-queue
          if (error.code === "23505") continue;
          remaining.push(vote);
        }
      } catch {
        remaining.push(vote);
      }
    }

    savePendingVotes(remaining);
    setPendingCount(remaining.length);
    syncingRef.current = false;
    setSyncing(false);
  }, []);

  const submitVoteOfflineSafe = useCallback(
    async (vote: Omit<PendingVote, "id" | "created_at">): Promise<boolean> => {
      // Try online first
      if (navigator.onLine) {
        try {
          const { error } = await supabase.from("match_votes").insert({
            match_id: vote.match_id,
            judge_id: vote.judge_id,
            vote_for: vote.vote_for,
            round_number: vote.round_number,
            slider_technique: vote.slider_technique ?? null,
            slider_musicality: vote.slider_musicality ?? null,
            slider_performance: vote.slider_performance ?? null,
          });

          if (!error) return true;
        } catch {
          // Fall through to offline save
        }
      }

      // Save locally
      const pending = getPendingVotes();
      pending.push({
        ...vote,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      });
      savePendingVotes(pending);
      setPendingCount(pending.length);
      return true; // Vote saved locally
    },
    []
  );

  return {
    isOnline,
    pendingCount,
    syncing,
    submitVoteOfflineSafe,
    syncPendingVotes,
  };
}

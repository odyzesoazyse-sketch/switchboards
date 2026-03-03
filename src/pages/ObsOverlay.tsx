import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

/**
 * OBS Studio overlay — transparent background page.
 * Add as Browser Source in OBS with custom CSS:
 *   body { background-color: transparent !important; }
 *
 * Query params:
 *   ?sponsor=url — sponsor logo URL
 *   ?track=Song+Name — initial track name
 *   ?hype=1 — enable hype meter (mic access)
 */

interface Dancer {
  id: string;
  name: string;
  city: string | null;
  photo_url: string | null;
}

export default function ObsOverlay() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();

  // State
  const [leftDancer, setLeftDancer] = useState<Dancer | null>(null);
  const [rightDancer, setRightDancer] = useState<Dancer | null>(null);
  const [votesLeft, setVotesLeft] = useState(0);
  const [votesRight, setVotesRight] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [roundsToWin, setRoundsToWin] = useState(2);
  const [showWinner, setShowWinner] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [battleName, setBattleName] = useState("");
  const [showLowerThird, setShowLowerThird] = useState(false);

  // Track ID
  const [trackName, setTrackName] = useState(searchParams.get("track") || "");
  const [showTrack, setShowTrack] = useState(false);
  const trackTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Sponsor
  const sponsorUrl = searchParams.get("sponsor") || "";

  // Hype Meter
  const hypeEnabled = searchParams.get("hype") === "1";
  const [hypeLevel, setHypeLevel] = useState(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>();

  // Load data & subscribe
  useEffect(() => {
    if (!id) return;
    loadData();

    const ch = supabase
      .channel(`obs-overlay-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "screen_state" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "match_votes" }, () => loadData())
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [id]);

  // Hype meter audio
  useEffect(() => {
    if (!hypeEnabled) return;

    let audioCtx: AudioContext;
    let stream: MediaStream;

    const initAudio = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        analyserRef.current = analyser;

        const updateHype = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(data);
          const avg = data.reduce((a, b) => a + b, 0) / data.length;
          const normalized = Math.min(100, Math.round((avg / 128) * 100));
          setHypeLevel((prev) => prev + (normalized - prev) * 0.3);
          animFrameRef.current = requestAnimationFrame(updateHype);
        };
        updateHype();
      } catch (err) {
        console.warn("Mic access denied for hype meter:", err);
      }
    };

    initAudio();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioCtx) audioCtx.close();
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [hypeEnabled]);

  const loadData = async () => {
    const { data: battle } = await supabase
      .from("battles")
      .select("name")
      .eq("id", id)
      .single();
    if (battle) setBattleName(battle.name);

    const { data: states } = await supabase
      .from("screen_state")
      .select("*")
      .eq("battle_id", id)
      .order("created_at", { ascending: false })
      .limit(1);

    const state = states?.[0];
    if (!state) return;

    setVotesLeft(state.votes_left || 0);
    setVotesRight(state.votes_right || 0);
    setCurrentRound(state.current_round || 1);
    setRoundsToWin(state.rounds_to_win || 2);
    setShowWinner(state.show_winner || false);

    if (state.current_match_id) {
      const { data: match } = await supabase
        .from("matches")
        .select("*")
        .eq("id", state.current_match_id)
        .single();

      if (match) {
        setWinnerId(match.winner_id);
        const dancerIds = [match.dancer_left_id, match.dancer_right_id].filter(Boolean);
        if (dancerIds.length > 0) {
          const { data: dancersData } = await supabase.from("dancers").select("*").in("id", dancerIds);
          const map = new Map(dancersData?.map(d => [d.id, d]) || []);
          setLeftDancer(match.dancer_left_id ? (map.get(match.dancer_left_id) as Dancer) || null : null);
          setRightDancer(match.dancer_right_id ? (map.get(match.dancer_right_id) as Dancer) || null : null);
        }
        setShowLowerThird(true);

        // Show track ID on new match
        if (trackName) {
          setShowTrack(true);
          if (trackTimeoutRef.current) clearTimeout(trackTimeoutRef.current);
          trackTimeoutRef.current = setTimeout(() => setShowTrack(false), 5000);
        }
      }
    } else {
      setLeftDancer(null);
      setRightDancer(null);
      setShowLowerThird(false);
    }
  };

  const winner = winnerId === leftDancer?.id ? leftDancer : rightDancer;
  const isRedWinner = winnerId === leftDancer?.id;

  return (
    <div
      className="w-screen h-screen relative overflow-hidden"
      style={{ backgroundColor: "transparent" }}
    >
      {/* Sponsor corners */}
      {sponsorUrl && (
        <>
          <img
            src={sponsorUrl}
            alt="Sponsor"
            className="absolute top-4 right-4 h-12 opacity-80 z-50"
            draggable={false}
          />
        </>
      )}

      {/* Track ID popup */}
      <AnimatePresence>
        {showTrack && trackName && (
          <motion.div
            className="absolute top-4 left-4 z-40"
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            <div className="bg-black/80 backdrop-blur-md rounded-xl px-5 py-3 border border-white/10">
              <div className="text-white/50 text-[10px] uppercase tracking-[0.3em] font-bold">Now Playing</div>
              <div className="text-white font-bold text-sm mt-0.5">{trackName}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hype Meter */}
      {hypeEnabled && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2">
          <div className="text-white/60 text-[9px] uppercase tracking-[0.3em] font-black rotate-180" style={{ writingMode: "vertical-lr" }}>
            Hype
          </div>
          <div className="w-6 h-48 bg-black/40 rounded-full overflow-hidden border border-white/10 relative">
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-full"
              animate={{ height: `${hypeLevel}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 15 }}
              style={{
                background: hypeLevel > 75
                  ? "linear-gradient(to top, hsl(0 85% 55%), hsl(40 100% 50%))"
                  : hypeLevel > 40
                    ? "linear-gradient(to top, hsl(40 100% 50%), hsl(60 100% 50%))"
                    : "linear-gradient(to top, hsl(142 76% 45%), hsl(160 76% 45%))",
              }}
            />
          </div>
          <div className="text-white/80 text-xs font-black">{Math.round(hypeLevel)}%</div>
        </div>
      )}

      {/* Winner overlay */}
      <AnimatePresence>
        {showWinner && winner && (
          <motion.div
            className="absolute inset-0 z-30 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center"
              initial={{ scale: 0.3 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <div className="text-white font-black font-display text-6xl tracking-tight"
                style={{
                  textShadow: isRedWinner
                    ? "0 0 60px hsla(0,85%,55%,0.6)"
                    : "0 0 60px hsla(217,91%,55%,0.6)",
                }}
              >
                {winner.name}
              </div>
              <div className="text-white/60 text-xl mt-2 uppercase tracking-[0.3em]">Winner</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lower Third — Names & Score */}
      <AnimatePresence>
        {showLowerThird && !showWinner && leftDancer && rightDancer && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 z-20"
            initial={{ y: 120 }}
            animate={{ y: 0 }}
            exit={{ y: 120 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
          >
            {/* Background bar */}
            <div className="bg-black/85 backdrop-blur-xl border-t border-white/10">
              <div className="flex items-stretch">
                {/* Left dancer */}
                <div className="flex-1 flex items-center gap-4 px-6 py-4">
                  {leftDancer.photo_url && (
                    <img
                      src={leftDancer.photo_url}
                      alt={leftDancer.name}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-primary/50"
                    />
                  )}
                  <div>
                    <div className="text-primary font-black font-display text-xl uppercase tracking-wider">
                      {leftDancer.name}
                    </div>
                    {leftDancer.city && (
                      <div className="text-white/40 text-xs uppercase tracking-wider">{leftDancer.city}</div>
                    )}
                  </div>
                </div>

                {/* Score center */}
                <div className="flex items-center gap-3 px-8 bg-white/5">
                  <span className="text-primary font-black font-display text-4xl">{votesLeft}</span>
                  <div className="flex flex-col items-center">
                    <span className="text-white/30 text-[10px] uppercase tracking-[0.2em]">R{currentRound}</span>
                    <span className="text-white/50 text-lg font-black">VS</span>
                    <span className="text-white/30 text-[10px] uppercase tracking-[0.2em]">BO{roundsToWin * 2 - 1}</span>
                  </div>
                  <span className="text-secondary font-black font-display text-4xl">{votesRight}</span>
                </div>

                {/* Right dancer */}
                <div className="flex-1 flex items-center justify-end gap-4 px-6 py-4">
                  <div className="text-right">
                    <div className="text-secondary font-black font-display text-xl uppercase tracking-wider">
                      {rightDancer.name}
                    </div>
                    {rightDancer.city && (
                      <div className="text-white/40 text-xs uppercase tracking-wider">{rightDancer.city}</div>
                    )}
                  </div>
                  {rightDancer.photo_url && (
                    <img
                      src={rightDancer.photo_url}
                      alt={rightDancer.name}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-secondary/50"
                    />
                  )}
                </div>
              </div>

              {/* Battle name bar */}
              <div className="bg-white/5 px-6 py-1.5 flex items-center justify-between">
                <span className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold">{battleName}</span>
                <span className="text-white/30 text-[10px] uppercase tracking-[0.2em]">SWITCHBOARD</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

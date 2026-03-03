import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown, ChevronUp, Trophy, MapPin, Instagram,
  Grid3X3, Info, Clock, User, Flame
} from "lucide-react";
import TournamentBracket from "@/components/TournamentBracket";

interface ScreenState {
  current_match_id: string | null;
  nomination_id: string | null;
  votes_left: number;
  votes_right: number;
  current_round: number;
  rounds_to_win: number;
  timer_running: boolean;
  timer_end_time: string | null;
  timer_seconds: number;
  show_timer: boolean;
  match_status: string;
}

interface Dancer {
  id: string;
  name: string;
  city: string | null;
  photo_url: string | null;
  bio: string | null;
  instagram: string | null;
  wins_count: number | null;
  battles_count: number | null;
  average_score: number | null;
  age: number | null;
}

interface Match {
  id: string;
  round: string;
  position: number;
  dancer_left_id: string | null;
  dancer_right_id: string | null;
  winner_id: string | null;
  is_completed: boolean | null;
}

interface Nomination {
  id: string;
  name: string;
  rounds_to_win: number | null;
  top_count: number | null;
}

export default function McTeleprompter() {
  const { id } = useParams();
  const [screenState, setScreenState] = useState<ScreenState | null>(null);
  const [leftDancer, setLeftDancer] = useState<Dancer | null>(null);
  const [rightDancer, setRightDancer] = useState<Dancer | null>(null);
  const [battleName, setBattleName] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [allDancers, setAllDancers] = useState<Dancer[]>([]);
  const [nomination, setNomination] = useState<Nomination | null>(null);
  const [allNominations, setAllNominations] = useState<Nomination[]>([]);
  const [expandedDancer, setExpandedDancer] = useState<"left" | "right" | null>(null);
  const currentMatchIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentMatchIdRef.current = screenState?.current_match_id || null;
  }, [screenState?.current_match_id]);

  useEffect(() => {
    if (!id) return;
    loadData();

    const ch1 = supabase.channel(`mc-screen-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'screen_state' }, () => loadData())
      .subscribe();

    const ch2 = supabase.channel(`mc-matches-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_votes' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [id]);

  // Timer
  useEffect(() => {
    if (!screenState?.timer_running || !screenState?.timer_end_time) {
      if (!screenState?.show_timer) setTimeLeft(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.floor((new Date(screenState.timer_end_time!).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [screenState?.timer_running, screenState?.timer_end_time, screenState?.show_timer]);

  useEffect(() => {
    if (screenState?.show_timer && !screenState?.timer_running && screenState.timer_seconds > 0) {
      setTimeLeft(screenState.timer_seconds);
    }
  }, [screenState?.timer_seconds, screenState?.show_timer, screenState?.timer_running]);

  const loadData = async () => {
    if (!id) return;

    const { data: battle } = await supabase.from("battles").select("name").eq("id", id).single();
    if (battle) setBattleName(battle.name);

    const { data: nominations } = await supabase.from("nominations").select("*").eq("battle_id", id);
    setAllNominations(nominations || []);

    const { data: states } = await supabase
      .from("screen_state").select("*").eq("battle_id", id)
      .order("created_at", { ascending: false }).limit(1);

    const state = states?.[0] as any;
    if (!state) return;
    setScreenState(state);

    if (state.nomination_id) {
      const nom = (nominations || []).find((n: any) => n.id === state.nomination_id);
      setNomination(nom || null);

      const { data: matches } = await supabase.from("matches").select("*")
        .eq("nomination_id", state.nomination_id).order("position");
      setAllMatches(matches || []);

      const { data: dancers } = await supabase.from("dancers").select("*")
        .eq("nomination_id", state.nomination_id);
      setAllDancers(dancers || []);
    }

    if (state.current_match_id) {
      const { data: match } = await supabase.from("matches").select("*").eq("id", state.current_match_id).single();
      if (match) {
        const ids = [match.dancer_left_id, match.dancer_right_id].filter(Boolean);
        if (ids.length) {
          const { data: dancers } = await supabase.from("dancers").select("*").in("id", ids);
          const map = new Map(dancers?.map(d => [d.id, d]) || []);
          setLeftDancer(match.dancer_left_id ? (map.get(match.dancer_left_id) as Dancer) || null : null);
          setRightDancer(match.dancer_right_id ? (map.get(match.dancer_right_id) as Dancer) || null : null);
        }
      }
    } else {
      setLeftDancer(null);
      setRightDancer(null);
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const vl = screenState?.votes_left || 0;
  const vr = screenState?.votes_right || 0;
  const round = screenState?.current_round || 1;
  const roundsToWin = screenState?.rounds_to_win || 2;
  const isTimerDanger = timeLeft > 0 && timeLeft <= 10;
  const matchStatus = screenState?.match_status || "waiting";

  const completedMatches = allMatches.filter(m => m.is_completed);
  const upcomingMatches = allMatches.filter(m => !m.is_completed && m.id !== screenState?.current_match_id);

  const getDancerName = (dancerId: string | null) => {
    if (!dancerId) return "TBD";
    return allDancers.find(d => d.id === dancerId)?.name || "TBD";
  };

  const DancerInfoCard = ({ dancer, side }: { dancer: Dancer | null; side: "left" | "right" }) => {
    if (!dancer) return null;
    const isExpanded = expandedDancer === side;

    return (
      <div className="w-full">
        <button
          onClick={() => setExpandedDancer(isExpanded ? null : side)}
          className="w-full flex items-center justify-between py-2 px-1 opacity-60 hover:opacity-100 transition-opacity"
        >
          <span className="text-xs uppercase tracking-widest text-white/50">
            {isExpanded ? "Скрыть" : "Подробнее"}
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
        </button>

        {isExpanded && (
          <div className="space-y-2 py-3 border-t border-white/10 animate-in slide-in-from-top-2 duration-200">
            {dancer.city && (
              <div className="flex items-center gap-2 text-white/70">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="text-lg">{dancer.city}</span>
              </div>
            )}
            {dancer.age && (
              <div className="flex items-center gap-2 text-white/70">
                <User className="w-4 h-4 shrink-0" />
                <span className="text-lg">{dancer.age} лет</span>
              </div>
            )}
            {dancer.instagram && (
              <div className="flex items-center gap-2 text-white/70">
                <Instagram className="w-4 h-4 shrink-0" />
                <span className="text-lg">@{dancer.instagram.replace("@", "")}</span>
              </div>
            )}
            <div className="flex gap-4 text-white/60 text-sm mt-1">
              {dancer.wins_count != null && <span>🏆 {dancer.wins_count}W</span>}
              {dancer.battles_count != null && <span>⚔️ {dancer.battles_count}B</span>}
              {dancer.average_score != null && <span>⭐ {dancer.average_score.toFixed(1)}</span>}
            </div>
            {dancer.bio && (
              <p className="text-white/50 text-sm mt-1 leading-relaxed">{dancer.bio}</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col select-none overflow-hidden">
      {/* Top bar: battle name + controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Flame className="w-5 h-5 text-orange-400 shrink-0" />
          <span className="font-bold text-lg truncate">{battleName}</span>
          {nomination && (
            <Badge variant="outline" className="border-white/20 text-white/70 shrink-0">
              {nomination.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Timer — visible only to MC, subtle */}
          {screenState?.show_timer && timeLeft > 0 && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-mono ${
              isTimerDanger ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-white/10 text-white/60"
            }`}>
              <Clock className="w-3.5 h-3.5" />
              {formatTime(timeLeft)}
            </div>
          )}

          {/* Bracket sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                <Grid3X3 className="w-4 h-4 mr-1" />
                Сетка
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-neutral-950 border-white/10 h-[80vh]">
              <ScrollArea className="h-full pr-4">
                <h3 className="text-xl font-bold mb-4 text-white">Турнирная сетка</h3>
                {allMatches.length > 0 ? (
                  <TournamentBracket
                    matches={allMatches}
                    dancers={allDancers}
                    activeMatchId={screenState?.current_match_id || undefined}
                    layout="linear"
                  />
                ) : (
                  <p className="text-white/40">Сетка пока не сформирована</p>
                )}
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Info sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                <Info className="w-4 h-4 mr-1" />
                Инфо
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-neutral-950 border-white/10 w-[350px]">
              <ScrollArea className="h-full pr-4">
                <h3 className="text-xl font-bold mb-4 text-white">Информация о баттле</h3>

                <div className="space-y-4">
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Баттл</p>
                    <p className="text-white text-lg font-semibold">{battleName}</p>
                  </div>

                  {allNominations.length > 0 && (
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Номинации</p>
                      <div className="space-y-1">
                        {allNominations.map(n => (
                          <div key={n.id} className={`px-3 py-2 rounded-lg text-sm ${
                            n.id === nomination?.id ? "bg-white/10 text-white font-medium" : "text-white/50"
                          }`}>
                            {n.name} {n.top_count && `• Top ${n.top_count}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator className="bg-white/10" />

                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Статистика</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/40">Матчей</p>
                        <p className="text-2xl font-bold text-white">{allMatches.length}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/40">Завершено</p>
                        <p className="text-2xl font-bold text-white">{completedMatches.length}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/40">Участников</p>
                        <p className="text-2xl font-bold text-white">{allDancers.length}</p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-white/40">Раунды до</p>
                        <p className="text-2xl font-bold text-white">{roundsToWin}</p>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-white/10" />

                  {/* Upcoming matches */}
                  {upcomingMatches.length > 0 && (
                    <div>
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Следующие матчи</p>
                      <div className="space-y-1">
                        {upcomingMatches.slice(0, 8).map(m => (
                          <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 text-sm">
                            <span className="text-white/80">{getDancerName(m.dancer_left_id)}</span>
                            <span className="text-white/30 text-xs">vs</span>
                            <span className="text-white/80">{getDancerName(m.dancer_right_id)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* All dancers */}
                  <div>
                    <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Все участники</p>
                    <div className="space-y-1">
                      {allDancers.map(d => (
                        <div key={d.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 text-sm">
                          <span className="text-white/80">{d.name}</span>
                          <span className="text-white/40">{d.city || ""}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* MAIN CONTENT — maximally readable */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-2">
        {!screenState?.current_match_id ? (
          <div className="text-center space-y-4">
            <p className="text-4xl md:text-6xl font-black text-white/30 uppercase tracking-wider">
              Ожидание
            </p>
            <p className="text-xl text-white/20">Оператор ещё не запустил матч</p>
          </div>
        ) : (
          <>
            {/* Match status */}
            {matchStatus === "battle" && (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-sm px-4 py-1 animate-pulse">
                🔴 LIVE • Раунд {round}
              </Badge>
            )}

            {/* Score */}
            <div className="flex items-center justify-center gap-6 md:gap-12">
              <span className="text-[6rem] md:text-[10rem] font-black leading-none tabular-nums text-red-500 drop-shadow-[0_0_30px_rgba(239,68,68,0.4)]">
                {vl}
              </span>
              <span className="text-3xl md:text-5xl font-black text-white/20 select-none">:</span>
              <span className="text-[6rem] md:text-[10rem] font-black leading-none tabular-nums text-blue-500 drop-shadow-[0_0_30px_rgba(59,130,246,0.4)]">
                {vr}
              </span>
            </div>

            {/* Dancer names — HUGE */}
            <div className="w-full flex items-start justify-between gap-4 max-w-5xl">
              {/* LEFT */}
              <div className="flex-1 text-left">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs font-bold text-red-500/60 uppercase tracking-widest">RED</span>
                </div>
                <p className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tight break-words">
                  {leftDancer?.name || "—"}
                </p>
                <DancerInfoCard dancer={leftDancer} side="left" />
              </div>

              {/* DIVIDER */}
              <div className="w-px bg-white/10 self-stretch min-h-[80px] mx-2 shrink-0" />

              {/* RIGHT */}
              <div className="flex-1 text-right">
                <div className="flex items-baseline gap-3 justify-end">
                  <span className="text-xs font-bold text-blue-500/60 uppercase tracking-widest">BLUE</span>
                </div>
                <p className="text-4xl md:text-7xl font-black text-white leading-tight tracking-tight break-words">
                  {rightDancer?.name || "—"}
                </p>
                <DancerInfoCard dancer={rightDancer} side="right" />
              </div>
            </div>

            {/* Current match info */}
            {nomination && (
              <p className="text-white/20 text-sm mt-4">
                {nomination.name} • {allMatches.find(m => m.id === screenState?.current_match_id)?.round || ""}
              </p>
            )}
          </>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-t border-white/10 text-xs text-white/30 shrink-0">
        <span>MC Teleprompter</span>
        <span>{allMatches.filter(m => m.is_completed).length}/{allMatches.length} матчей завершено</span>
      </div>
    </div>
  );
}

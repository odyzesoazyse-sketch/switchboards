import { useCallback, useRef } from "react";

const SOUNDS = {
  timerStart: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  timerEnd: "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3",
  roundStart: "https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3",
  winner: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3",
  vote: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3",
  click: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
};

export type SoundType = keyof typeof SOUNDS;

export function useSoundEffects(enabled: boolean = true) {
  const audioCache = useRef<Map<string, HTMLAudioElement>>(new Map());

  const preloadSound = useCallback((type: SoundType) => {
    if (!audioCache.current.has(type)) {
      const audio = new Audio(SOUNDS[type]);
      audio.preload = "auto";
      audioCache.current.set(type, audio);
    }
  }, []);

  const playSound = useCallback((type: SoundType) => {
    if (!enabled) return;

    let audio = audioCache.current.get(type);
    if (!audio) {
      audio = new Audio(SOUNDS[type]);
      audioCache.current.set(type, audio);
    }
    
    audio.currentTime = 0;
    audio.volume = 0.5;
    audio.play().catch(console.error);
  }, [enabled]);

  const preloadAll = useCallback(() => {
    Object.keys(SOUNDS).forEach((type) => preloadSound(type as SoundType));
  }, [preloadSound]);

  return { playSound, preloadSound, preloadAll };
}
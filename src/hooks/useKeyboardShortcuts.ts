import { useEffect, useCallback } from "react";

interface ShortcutHandlers {
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  onNextRound?: () => void;
  onAddScoreLeft?: () => void;
  onAddScoreRight?: () => void;
  onShowWinner?: () => void;
  onToggleBracket?: () => void;
  onResetMatch?: () => void;
  onOpenScreen?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers, enabled: boolean = true) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Ignore if user is typing in an input
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case " ": // Spacebar - Start/Stop timer
        event.preventDefault();
        handlers.onStartTimer?.();
        break;
      case "escape": // Escape - Stop timer
        handlers.onStopTimer?.();
        break;
      case "n": // N - Next round
        handlers.onNextRound?.();
        break;
      case "arrowleft": // Left arrow - Add score to left
        if (event.shiftKey) {
          handlers.onAddScoreLeft?.();
        }
        break;
      case "arrowright": // Right arrow - Add score to right
        if (event.shiftKey) {
          handlers.onAddScoreRight?.();
        }
        break;
      case "w": // W - Show winner
        handlers.onShowWinner?.();
        break;
      case "b": // B - Toggle bracket
        handlers.onToggleBracket?.();
        break;
      case "r": // R - Reset match
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handlers.onResetMatch?.();
        }
        break;
      case "o": // O - Open screen
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handlers.onOpenScreen?.();
        }
        break;
    }
  }, [enabled, handlers]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export const SHORTCUT_HINTS = [
  { key: "Space", action: "Start Timer" },
  { key: "Esc", action: "Stop Timer" },
  { key: "N", action: "Next Round" },
  { key: "Shift + ←", action: "+1 Red" },
  { key: "Shift + →", action: "+1 Blue" },
  { key: "W", action: "Show Winner" },
  { key: "B", action: "Toggle Bracket" },
  { key: "Ctrl + R", action: "Reset Match" },
  { key: "Ctrl + O", action: "Open Screen" },
];
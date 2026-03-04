import { useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Universal top header — always visible except on full-screen presentation interfaces.
 * Shows SWITCHBOARD logo + utility controls (language, theme).
 * On sub-pages shows a back button.
 */

const HIDDEN_PATTERNS = [
  /^\/battle\/[^/]+\/screen/,
  /^\/battle\/[^/]+\/obs/,
  /^\/cypher-swipe\//,
];

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  if (HIDDEN_PATTERNS.some((p) => p.test(path))) return null;

  // Determine if we should show back button (any sub-page beyond top-level)
  const isTopLevel = ["/", "/auth", "/dashboard", "/pricing"].includes(path);
  const showBack = !isTopLevel;

  // Back destination logic
  const handleBack = () => {
    // Battle sub-routes → go to battle view
    const battleMatch = path.match(/^\/battle\/([^/]+)\/.+/);
    if (battleMatch) {
      navigate(`/battle/${battleMatch[1]}`);
      return;
    }
    // Battle view → dashboard
    if (path.match(/^\/battle\//)) {
      navigate("/dashboard");
      return;
    }
    navigate(-1);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/30">
      <div className="container mx-auto px-3 sm:px-4 h-10 sm:h-12 flex items-center justify-between">
        {/* Left: Back or Logo */}
        <div className="flex items-center gap-1">
          {showBack && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={handleBack}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <span
            className="font-black text-base sm:text-lg tracking-tight cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            SWITCHBOARD
          </span>
        </div>

        {/* Right: Utility controls */}
        <div className="flex items-center gap-0.5">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

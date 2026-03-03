import { useNavigate, useLocation } from "react-router-dom";
import { Home, Gavel, User, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const navKeys = [
  { path: "/", icon: Home, labelKey: "nav.home" },
  { path: "/dashboard", icon: Trophy, labelKey: "nav.battles" },
  { path: "/judge", icon: Gavel, labelKey: "nav.judge" },
  { path: "/dashboard", icon: User, labelKey: "nav.profile", matchPath: "/dashboard" },
];

// Deduplicated nav items for rendering
const mobileNavItems = [
  { path: "/", icon: Home, labelKey: "nav.home" },
  { path: "/dashboard", icon: Trophy, labelKey: "nav.battles" },
  { path: "/judge", icon: Gavel, labelKey: "nav.judge" },
];

const desktopNavItems = [
  { path: "/", icon: Home, labelKey: "nav.home" },
  { path: "/dashboard", icon: Trophy, labelKey: "nav.battles" },
  { path: "/judge", icon: Gavel, labelKey: "nav.judge" },
];

// Pages where nav should be completely hidden
const HIDDEN_EXACT = ["/auth"];
const HIDDEN_PATTERNS = [
  /^\/battle\/[^/]+\/screen/,
  /^\/battle\/[^/]+\/operator/,
  /^\/battle\/[^/]+\/obs-overlay/,
  /^\/battle\/[^/]+\/vote/,
  /^\/battle\/[^/]+\/mc/,
  /^\/cypher-swipe\//,
];

// JudgePanel hides nav (has own FAB)
const JUDGE_PATH = "/judge";

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const path = location.pathname;

  // Hide completely on specific pages
  if (HIDDEN_EXACT.includes(path)) return null;
  if (path === JUDGE_PATH) return null;
  if (HIDDEN_PATTERNS.some(p => p.test(path))) return null;

  return (
    <>
      {/* Desktop Top Navigation */}
      <nav className="hidden sm:block fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center h-12 gap-1">
            <span className="font-bold text-lg tracking-tight mr-6 text-primary cursor-pointer" onClick={() => navigate("/")}>SWITCHBOARD</span>
            {desktopNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                    "hover:bg-muted/50 active:scale-95",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{t(item.labelKey)}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
        <div className="flex items-center justify-around px-1 py-0.5">
          {mobileNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path + item.labelKey}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all min-w-[52px] min-h-[44px]",
                  "active:scale-90",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]")} />
                <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>{t(item.labelKey)}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-primary" />}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
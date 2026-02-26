import { useNavigate, useLocation } from "react-router-dom";
import { Home, Trophy, Globe, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

const navKeys = [
  { path: "/", icon: Home, labelKey: "nav.home" },
  { path: "/battles", icon: Trophy, labelKey: "nav.battles" },
  { path: "/world-events", icon: Globe, labelKey: "nav.events" },
  { path: "/world-ranking", icon: TrendingUp, labelKey: "nav.ranking" },
  { path: "/dashboard", icon: User, labelKey: "nav.profile" },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();

  const hiddenPaths = ["/auth", "/judge", "/battle/"];
  const shouldHide = hiddenPaths.some(p => location.pathname.startsWith(p));
  if (shouldHide) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1">
        {navKeys.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[56px]",
                "active:scale-90",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]")} />
              <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>{t(item.labelKey)}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

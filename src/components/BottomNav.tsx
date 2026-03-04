import { useNavigate, useLocation } from "react-router-dom";
import {
  Trophy, CreditCard, LogOut, Plus,
  Monitor, Tv, Settings2, BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

/**
 * Contextual bottom navigation — always visible except on full-screen interfaces.
 * Menu items change based on the current route context.
 */

const HIDDEN_PATTERNS = [
  /^\/$/,
  /^\/auth/,
  /^\/battle\/[^/]+\/screen/,
  /^\/battle\/[^/]+\/obs/,
  /^\/cypher-swipe\//,
  /^\/judge/,
  /^\/dancer\//,
  /^\/battles\//,
  /^\/battle\/[^/]+\/vote/,
];

interface NavItem {
  path: string;
  icon: any;
  label: string;
}

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const path = location.pathname;
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setIsAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (HIDDEN_PATTERNS.some((p) => p.test(path))) return null;

  // Extract battle ID from path
  const battleIdMatch = path.match(/^\/battle\/([^/]+)/);
  const battleId = battleIdMatch?.[1];
  const isBattleContext = !!battleId && battleId !== "create";

  // Determine nav items based on context
  let items: NavItem[];

  if (isBattleContext) {
    items = [
      { path: `/battle/${battleId}`, icon: Trophy, label: t("nav.overview") || "Overview" },
      { path: `/battle/${battleId}/operator`, icon: Monitor, label: t("nav.operator") || "Operator" },
      { path: `/battle/${battleId}/screen`, icon: Tv, label: t("nav.screen") || "Screen" },
      { path: `/battle/${battleId}/settings`, icon: Settings2, label: t("nav.settings") || "Settings" },
      { path: `/battle/${battleId}/analytics`, icon: BarChart3, label: t("nav.stats") || "Stats" },
    ];
  } else {
    items = [
      { path: "/dashboard", icon: Trophy, label: t("nav.battles") || "Battles" },
      { path: "/battle/create", icon: Plus, label: t("nav.create") || "Create" },
      { path: "/pricing", icon: CreditCard, label: t("nav.pricing") || "Plans" },
    ];

    // Add logout only in global context (fewer items, fits)
    if (isAuthenticated) {
      items.push({ path: "__logout__", icon: LogOut, label: t("nav.logout") || "Exit" });
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const handleNav = (item: NavItem) => {
    if (item.path === "__logout__") {
      handleSignOut();
    } else {
      navigate(item.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/30 safe-area-bottom">
      <div className="flex items-center justify-around px-0.5 py-0.5">
        {items.map((item) => {
          const isLogout = item.path === "__logout__";
          // Active state logic
          let isActive = false;
          if (!isLogout) {
            if (isBattleContext && item.path === `/battle/${battleId}`) {
              isActive = path === item.path;
            } else {
              isActive = path === item.path || path.startsWith(item.path + "/");
            }
          }

          return (
            <button
              key={item.path}
              onClick={() => handleNav(item)}
              className={cn(
                "flex flex-col items-center gap-0 px-1.5 sm:px-3 py-1.5 rounded-xl transition-all min-w-0 flex-1 min-h-[40px]",
                "active:scale-90",
                isLogout
                  ? "text-muted-foreground hover:text-destructive"
                  : isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-4 h-4 sm:w-5 sm:h-5", isActive && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.5)]")} />
              <span className={cn("text-[9px] sm:text-[10px] font-medium leading-tight mt-0.5 truncate max-w-full", isActive && "font-bold")}>
                {item.label}
              </span>
              {isActive && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

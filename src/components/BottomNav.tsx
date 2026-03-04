import { useNavigate, useLocation, useParams } from "react-router-dom";
import {
  Trophy, CreditCard, LogOut, Plus,
  Monitor, Tv, Settings2, BarChart3, FileText, Medal, Share2,
  Gamepad2, Users
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
  const isBattleContext = !!battleId;

  // Determine nav items based on context
  let items: NavItem[];

  if (isBattleContext && battleId !== "create") {
    // Battle management context
    items = [
      { path: `/battle/${battleId}`, icon: Trophy, label: t("nav.overview") || "Overview" },
      { path: `/battle/${battleId}/operator`, icon: Monitor, label: t("nav.operator") || "Operator" },
      { path: `/battle/${battleId}/screen`, icon: Tv, label: t("nav.screen") || "Screen" },
      { path: `/battle/${battleId}/settings`, icon: Settings2, label: t("nav.settings") || "Settings" },
      { path: `/battle/${battleId}/analytics`, icon: BarChart3, label: t("nav.stats") || "Stats" },
    ];
  } else {
    // Dashboard / global context
    items = [
      { path: "/dashboard", icon: Trophy, label: t("nav.battles") || "Battles" },
      { path: "/battle/create", icon: Plus, label: t("nav.create") || "Create" },
      { path: "/pricing", icon: CreditCard, label: t("nav.pricing") || "Plans" },
    ];
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border/30 safe-area-bottom">
      <div className="flex items-center justify-around px-1 py-1">
        {items.map((item) => {
          const isActive = path === item.path || (item.path !== "/dashboard" && path.startsWith(item.path + "/"));
          // For battle overview, exact match only
          const isExactActive = isBattleContext && item.path === `/battle/${battleId}` 
            ? path === item.path 
            : isActive;

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[48px] min-h-[44px]",
                "active:scale-90",
                isExactActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "w-5 h-5",
                  isExactActive && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                )}
              />
              <span className={cn("text-[10px] font-medium", isExactActive && "font-bold")}>
                {item.label}
              </span>
              {isExactActive && <div className="w-1 h-1 rounded-full bg-primary" />}
            </button>
          );
        })}

        {/* Logout button */}
        {isAuthenticated && (
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-[48px] min-h-[44px] text-muted-foreground hover:text-destructive active:scale-90"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-[10px] font-medium">{t("nav.logout") || "Exit"}</span>
          </button>
        )}
      </div>
    </nav>
  );
}

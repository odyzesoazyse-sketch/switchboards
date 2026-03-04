import { useNavigate, useLocation } from "react-router-dom";
import { Trophy, CreditCard, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useState } from "react";

const navItems = [
  { path: "/dashboard", icon: Trophy, labelKey: "nav.battles" },
  { path: "/pricing", icon: CreditCard, labelKey: "nav.pricing" },
];

/**
 * BottomNav is the global navigation shell.
 * It is HIDDEN on:
 *  - Landing page (/)
 *  - Auth page (/auth)
 *  - Any /battle/:id page (BattleView has its own header)
 *  - Specialized full-screen interfaces (screen, operator, obs, judge, mc, cypher-swipe)
 *  - Public spectator pages (dancer profiles, public battle views)
 *
 * It is SHOWN on:
 *  - /dashboard
 *  - /pricing
 */
const HIDDEN_EXACT = ["/", "/auth"];
const HIDDEN_PATTERNS = [
  /^\/battle\//, // ALL battle sub-routes — BattleView has its own header
  /^\/judge/,
  /^\/cypher-swipe\//,
  /^\/dancer\//,
  /^\/battles\//, // public battle views
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const path = location.pathname;

  if (HIDDEN_EXACT.includes(path)) return null;
  if (HIDDEN_PATTERNS.some((p) => p.test(path))) return null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <>
      {/* ═══ Desktop Top Navigation ═══ */}
      <nav className="hidden sm:block fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            {/* Left: Logo + Nav Links */}
            <div className="flex items-center gap-1">
              <span
                className="font-bold text-lg tracking-tight mr-6 text-primary cursor-pointer"
                onClick={() => navigate("/dashboard")}
              >
                SWITCHBOARD
              </span>
              {navItems.map((item) => {
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

            {/* Right: Controls */}
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>{t("nav.logout")}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ═══ Mobile Bottom Navigation ═══ */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-background/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all min-w-[56px] min-h-[44px]",
                  "active:scale-90",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon
                  className={cn(
                    "w-5 h-5",
                    isActive && "drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                  )}
                />
                <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>
                  {t(item.labelKey)}
                </span>
                {isActive && <div className="w-1 h-1 rounded-full bg-primary" />}
              </button>
            );
          })}

          {/* More menu — contains theme, language, logout */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all min-w-[56px] min-h-[44px] text-muted-foreground hover:text-foreground active:scale-90"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span className="text-[10px] font-medium">{mobileMenuOpen ? t("nav.close") || "Close" : t("nav.more") || "More"}</span>
          </button>
        </div>

        {/* Mobile expanded menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border/30 px-4 py-3 flex items-center justify-between bg-background/98">
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignOut();
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>{t("nav.logout")}</span>
            </button>
          </div>
        )}
      </nav>
    </>
  );
}

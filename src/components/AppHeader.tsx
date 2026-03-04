import { useNavigate, useLocation } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";

const HIDDEN_PATTERNS = [
  /^\/$/,
  /^\/auth/,
  /^\/reset-password/,
  /^\/battle\/[^/]+\/screen/,
  /^\/battle\/[^/]+\/obs/,
  /^\/cypher-swipe\//,
];

export default function AppHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsAuth(!!session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setIsAuth(!!s));
    return () => subscription.unsubscribe();
  }, []);

  if (HIDDEN_PATTERNS.some((p) => p.test(path))) return null;

  const isTopLevel = ["/dashboard", "/pricing", "/profile"].includes(path);
  const showBack = !isTopLevel;

  const handleBack = () => {
    const battleMatch = path.match(/^\/battle\/([^/]+)\/.+/);
    if (battleMatch) {
      navigate(`/battle/${battleMatch[1]}`);
      return;
    }
    if (path.match(/^\/battle\//)) {
      navigate("/dashboard");
      return;
    }
    navigate(-1);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/30">
      <div className="container mx-auto px-3 sm:px-4 h-10 sm:h-12 flex items-center justify-between">
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

        <div className="flex items-center gap-0.5">
          {isAuth && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/profile")}
            >
              <User className="h-4 w-4" />
            </Button>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

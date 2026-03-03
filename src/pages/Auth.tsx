import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const Auth = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate("/dashboard");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
            emailRedirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
        toast.success("Account created! Check your email for confirmation.");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication error");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAuth = async (role: "Organizer" | "Judge") => {
    setLoading(true);

    const storageKey = `test_${role.toLowerCase()}_credentials`;
    const savedCreds = localStorage.getItem(storageKey);

    try {
      if (savedCreds) {
        const { email, password } = JSON.parse(savedCreds);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) {
          toast.success(`Welcome back Test ${role}!`);
          navigate("/dashboard");
          return;
        }
      }

      const randomId = Math.floor(Math.random() * 10000);
      const testEmail = `test_${role.toLowerCase()}_${randomId}@switchboard.com`;
      const testPassword = "password123";

      const { error } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
          data: {
            full_name: `Test ${role} ${randomId}`,
          },
        },
      });
      if (error) throw error;

      localStorage.setItem(storageKey, JSON.stringify({ email: testEmail, password: testPassword }));

      toast.success(`Created and logged in as Test ${role}`);
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to handle test account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
      {/* Subtle ambient glow */}
      <div className="absolute top-1/4 left-1/3 w-[400px] h-[400px] rounded-full blur-[150px] opacity-10 bg-primary pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] rounded-full blur-[150px] opacity-10 bg-secondary pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tight text-foreground mb-2">
            SWITCHBOARD
          </h1>
          <p className="text-sm text-muted-foreground">
            Professional judging for dance battles
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-border/30 bg-card/50 backdrop-blur-sm p-8">
          <h2 className="text-xl font-bold mb-1">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            {isLogin ? "Sign in to continue" : "Get started as an organizer"}
          </p>

          <form onSubmit={handleAuth} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                  className="h-12 bg-background/50 border-border/50 focus:border-primary/50"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12 bg-background/50 border-border/50 focus:border-primary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-12 bg-background/50 border-border/50 focus:border-primary/50"
              />
            </div>
            <Button
              type="submit"
              className="w-full h-12 bg-primary hover:bg-primary/90 font-bold text-sm uppercase tracking-wider shadow-[0_0_20px_hsl(var(--primary)/0.25)]"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
            </Button>

            {process.env.NODE_ENV === 'development' && (
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 text-xs border-border/50"
                  onClick={() => handleQuickAuth("Organizer")}
                  disabled={loading}
                >
                  ⚡ Test Organizer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-10 text-xs border-border/50"
                  onClick={() => handleQuickAuth("Judge")}
                  disabled={loading}
                >
                  ⚖️ Test Judge
                </Button>
              </div>
            )}
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {isLogin
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

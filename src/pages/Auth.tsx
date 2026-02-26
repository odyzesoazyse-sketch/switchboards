import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

    // Check if we already have a saved test account for this role
    const storageKey = `test_${role.toLowerCase()}_credentials`;
    const savedCreds = localStorage.getItem(storageKey);

    try {
      if (savedCreds) {
        // Try logging in with saved credentials
        const { email, password } = JSON.parse(savedCreds);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (!error) {
          toast.success(`Welcome back Test ${role}!`);
          navigate("/dashboard");
          return;
        }
        // If login fails, we'll fall through and create a new one
      }

      // Create a brand new test account
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

      // Save for next time
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-card">
      <Card className="w-full max-w-md border-border/50 backdrop-blur-sm">
        <CardHeader className="space-y-1">
          <div className="text-center mb-4">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              SWITCHBOARD
            </h1>
            <p className="text-sm text-muted-foreground">
              Fair breakdance battle judging
            </p>
          </div>
          <CardTitle className="text-2xl">
            {isLogin ? "Sign In" : "Sign Up"}
          </CardTitle>
          <CardDescription>
            {isLogin
              ? "Sign in to continue"
              : "Create an organizer account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 glow-primary"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>

            {process.env.NODE_ENV === 'development' && (
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleQuickAuth("Organizer")}
                  disabled={loading}
                >
                  ⚡ Test Organizer
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleQuickAuth("Judge")}
                  disabled={loading}
                >
                  ⚖️ Test Judge/Dancer
                </Button>
              </div>
            )}
          </form>
          <div className="mt-4 text-center">
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
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

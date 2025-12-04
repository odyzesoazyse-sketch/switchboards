import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Users, Timer, Sparkles, CheckCircle, TrendingUp, Zap, Shield, ArrowRight } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-display font-bold tracking-tight cursor-pointer"
            onClick={() => navigate("/")}
          >
            SWITCHBOARD
          </h1>
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/battles")}
              className="hidden sm:inline-flex"
            >
              Find Battles
            </Button>
            <Button onClick={() => navigate("/auth")}>
              Sign In
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div 
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: 'var(--gradient-red-glow)' }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-30"
          style={{ background: 'var(--gradient-blue-glow)' }}
        />

        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 mb-8 animate-fade-in">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Professional Battle Judging</span>
            </div>

            {/* Main heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold mb-6 animate-fade-in-up">
              <span className="text-gradient-red">Fair.</span>{" "}
              <span className="text-gradient-blue">Fast.</span>{" "}
              <span className="text-foreground">Flawless.</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.1s' }}>
              The modern judging system for breakdance battles. Real-time voting, 
              live visualization, and transparent scoring.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Button 
                onClick={() => navigate("/battles")}
                size="lg"
                className="text-lg px-8 h-14 bg-primary hover:bg-primary/90 glow-red hover-lift"
              >
                Find a Battle
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                onClick={() => navigate("/auth")}
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14 border-2 hover-lift"
              >
                Organize Event
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
              {[
                { value: "100%", label: "Transparent" },
                { value: "Real-time", label: "Voting" },
                { value: "0", label: "Bias" },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl sm:text-3xl font-display font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-surface">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Everything You Need
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete toolkit for running professional breakdance battles
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {[
              {
                icon: Users,
                title: "Role-Based Access",
                description: "Organizers, judges, selectors — each with their own interface and permissions",
                color: "primary"
              },
              {
                icon: Timer,
                title: "Real-time Scoring",
                description: "Judges vote from their devices, results update instantly on the big screen",
                color: "secondary"
              },
              {
                icon: TrendingUp,
                title: "Two-Phase System",
                description: "Selection round with criteria scoring, then Olympic bracket for top-16",
                color: "primary"
              },
              {
                icon: Sparkles,
                title: "Live Visualization",
                description: "Big screen display with vote animations and tournament bracket view",
                color: "secondary"
              },
              {
                icon: Shield,
                title: "Fair Judging",
                description: "Anonymous judge voting, automatic counting, no manipulation possible",
                color: "primary"
              },
              {
                icon: CheckCircle,
                title: "Full Control",
                description: "Operator panel for managing matches, rounds, and screen display",
                color: "secondary"
              },
            ].map((feature, i) => (
              <Card 
                key={i}
                className={`p-6 hover-lift border-border/50 hover:border-${feature.color}/30 transition-all group`}
              >
                <feature.icon className={`w-10 h-10 mb-4 text-${feature.color} group-hover:scale-110 transition-transform`} />
                <h3 className="text-lg font-display font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground">
                Get your battle running in four simple steps
              </p>
            </div>
            
            <div className="space-y-8">
              {[
                {
                  step: 1,
                  title: "Create a Battle",
                  description: "Set name, date, location and add categories (Solo, Doubles, Power Moves, etc.)",
                  color: "primary"
                },
                {
                  step: 2,
                  title: "Build Your Team",
                  description: "Invite judges and selectors. They can apply or you can add them directly.",
                  color: "secondary"
                },
                {
                  step: 3,
                  title: "Run Selection",
                  description: "Judges rate dancers on technique, creativity, energy. Top performers advance.",
                  color: "primary"
                },
                {
                  step: 4,
                  title: "Battle Mode",
                  description: "Automatic seeding, live voting, audience visualization. Pure competition.",
                  color: "secondary"
                },
              ].map((item, i) => (
                <div key={i} className="flex gap-6 items-start animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div 
                    className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-display font-bold text-xl
                      ${item.color === 'primary' ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'}`}
                  >
                    {item.step}
                  </div>
                  <div className="pt-2">
                    <h3 className="text-xl font-display font-semibold mb-2">{item.title}</h3>
                    <p className="text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-foreground text-background">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <Trophy className="w-16 h-16 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-6">
              Ready to Battle?
            </h2>
            <p className="text-xl opacity-80 mb-10">
              Join the community of organizers using SWITCHBOARD for fair, transparent judging.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate("/battles")} 
                size="lg"
                className="text-lg px-8 h-14 bg-background text-foreground hover:bg-background/90"
              >
                Browse Battles
              </Button>
              <Button 
                onClick={() => navigate("/auth")} 
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14 border-2 border-background/30 text-background hover:bg-background/10"
              >
                Start Organizing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground">
            © 2025 SWITCHBOARD. Fair judging for the breakdance community.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Users, Timer, Sparkles, CheckCircle, TrendingUp } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card to-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-block mb-6 animate-fade-in">
            <Trophy className="w-20 h-20 text-primary mx-auto mb-4 animate-pulse-glow" />
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in">
            <span className="text-gradient-primary">BreakDance</span>{" "}
            <span className="text-gradient-secondary">Judge</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in">
            Fair breakdance battle judging with real-time voting and live visualization for audiences
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button 
              onClick={() => navigate("/battles")}
              size="lg"
              className="bg-primary hover:bg-primary/90 glow-primary text-lg px-8"
            >
              Find a Battle
            </Button>
            <Button 
              onClick={() => navigate("/auth")}
              size="lg"
              variant="outline"
              className="border-secondary text-secondary hover:bg-secondary/10 text-lg px-8"
            >
              Organize Events
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
          Everything for <span className="text-gradient-primary">Professional</span> Judging
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          <Card className="border-border/50 hover:border-primary/50 transition-all group">
            <CardHeader>
              <Users className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Roles & Access</CardTitle>
              <CardDescription>
                Organizer, judges, selectors - each with their own interface and permissions
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-secondary/50 transition-all group">
            <CardHeader>
              <Timer className="w-10 h-10 text-secondary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Real-time Scoring</CardTitle>
              <CardDescription>
                Judges vote from their devices, results update instantly
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-all group">
            <CardHeader>
              <TrendingUp className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Two-Phase System</CardTitle>
              <CardDescription>
                Selection with 3-criteria scoring, then Olympic bracket for top-16
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-secondary/50 transition-all group">
            <CardHeader>
              <Sparkles className="w-10 h-10 text-secondary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Live Visualization</CardTitle>
              <CardDescription>
                Big screen for audience with vote animations and tournament bracket
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-primary/50 transition-all group">
            <CardHeader>
              <CheckCircle className="w-10 h-10 text-primary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Fair Judging</CardTitle>
              <CardDescription>
                Anonymous judge voting, automatic counting, no manipulation
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/50 hover:border-secondary/50 transition-all group">
            <CardHeader>
              <Trophy className="w-10 h-10 text-secondary mb-4 group-hover:scale-110 transition-transform" />
              <CardTitle>Data Export</CardTitle>
              <CardDescription>
                Full statistics, protocols and results in PDF/CSV for archives
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It <span className="text-gradient-secondary">Works</span>
          </h2>
          
          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">1</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Create a Battle</h3>
                <p className="text-muted-foreground">Set name, date, add categories (Solo, Doubles, Power Moves, etc.)</p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xl">2</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Invite Your Team</h3>
                <p className="text-muted-foreground">Add judges and selectors by email, they'll receive a login link</p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xl">3</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Dancer Selection</h3>
                <p className="text-muted-foreground">Judges rate performances on technique, creativity, energy. Top-16 advance to bracket</p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xl">4</div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Tournament Bracket</h3>
                <p className="text-muted-foreground">Automatic seeding, judges vote in battles, audience sees everything on screen</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Battle?</h2>
          <p className="text-xl text-muted-foreground mb-8">Browse upcoming battles or organize your own event</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate("/battles")} size="lg" className="bg-primary hover:bg-primary/90 glow-primary text-lg px-8">
              Find Battles
            </Button>
            <Button onClick={() => navigate("/auth")} size="lg" variant="outline" className="text-lg px-8">
              Organize Event
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2025 BreakDance Judge. Fair judging for the breakdance community.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

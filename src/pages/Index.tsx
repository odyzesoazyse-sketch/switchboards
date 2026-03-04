import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Zap, Shield, Monitor, BarChart3, Users, Crown,
  ArrowRight, Check, Star, Tv, Smartphone, Gauge
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const FEATURES = [
  {
    icon: Gauge,
    title: "Cypher Swipe",
    desc: "Tinder-style selection rounds. Judges swipe left or right — fast, intuitive, mobile-first.",
    color: "text-primary",
  },
  {
    icon: Tv,
    title: "OBS Overlay",
    desc: "Transparent broadcast layer with live scores, dancer names, and Hype Meter for streaming.",
    color: "text-secondary",
  },
  {
    icon: BarChart3,
    title: "Hype Meter",
    desc: "Real-time audience energy gauge. Crowd noise = live data on screen. Pure spectacle.",
    color: "text-neon",
  },
  {
    icon: Smartphone,
    title: "Live Judging",
    desc: "Judges vote from their phones. Scores sync instantly to the main screen and brackets.",
    color: "text-primary",
  },
  {
    icon: Monitor,
    title: "Screen Control",
    desc: "Operator panel controls everything: timer, brackets, animations, custom messages — one dashboard.",
    color: "text-secondary",
  },
  {
    icon: Users,
    title: "Multi-role System",
    desc: "Organizer, Judge, Operator, Spectator — each role gets a tailored interface. No clutter.",
    color: "text-neon",
  },
];

const PLANS = [
  {
    name: "FREE",
    price: "$0",
    period: "forever",
    desc: "Perfect for small jams",
    features: [
      "Up to 16 participants",
      "Standard bracket",
      "Basic judging modes",
      "Mobile voting",
    ],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "PRO",
    price: "$149",
    period: "/month",
    desc: "For serious organizers",
    features: [
      "Up to 512 participants",
      "Custom branding & colors",
      "OBS transparent overlay",
      "Export results (PDF/CSV)",
      "No watermark",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "ENTERPRISE",
    price: "Custom",
    period: "",
    desc: "Federations & large events",
    features: [
      "Unlimited participants",
      "API access",
      "White-Glove setup",
      "Dedicated account manager",
      "Everything in Pro",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const },
  }),
};

const Index = () => {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
  }, []);

  const handleGetStarted = () => {
    navigate(isLoggedIn ? "/dashboard" : "/auth");
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="font-black text-xl tracking-tight">SWITCHBOARD</span>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
            {isLoggedIn ? (
              <Button onClick={() => navigate("/dashboard")} size="sm" className="gap-2">
                Dashboard <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
                  Sign In
                </Button>
                <Button size="sm" onClick={() => navigate("/auth")} className="gap-2 shadow-[0_0_20px_hsl(var(--primary)/0.2)]">
                  Get Started <ArrowRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-32 px-4">
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full blur-[180px] opacity-15 bg-primary pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full blur-[150px] opacity-10 bg-secondary pointer-events-none" />

        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-neon/30 bg-neon/5 text-neon text-xs font-bold uppercase tracking-wider mb-8">
              <div className="live-dot" />
              Professional Battle Judging
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-[0.9] mb-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            Run battles
            <br />
            <span className="text-gradient-red">like a pro</span>
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            The all-in-one platform for dance battle organizers. Real-time judging, live brackets,
            OBS overlays, and audience engagement — all synced.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Button
              size="lg"
              className="text-base px-8 py-6 gap-2 shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
              onClick={handleGetStarted}
            >
              <Zap className="w-5 h-5" />
              {isLoggedIn ? "Go to Dashboard" : "Start Free"}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 py-6 gap-2 border-border/50"
              onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
            >
              <Star className="w-5 h-5" />
              See How It Works
            </Button>
          </motion.div>

          <motion.div
            className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Trusted by organizers
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> All dance styles
            </span>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-28 px-4 relative" id="features">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              Everything you need to
              <br />
              <span className="text-gradient-mixed">run the show</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From registration to finals — one platform, zero chaos.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                className="group p-6 sm:p-8 rounded-2xl border border-border/30 bg-card/50 hover:bg-card hover:border-border/60 transition-all duration-300 hover-lift"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
              >
                <f.icon className={`w-8 h-8 mb-4 ${f.color}`} />
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 sm:py-28 px-4 relative" id="pricing">
        <div className="absolute inset-0 bg-grid opacity-5 pointer-events-none" />
        <div className="container mx-auto max-w-5xl relative z-10">
          <motion.div
            className="text-center mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              Simple, honest pricing
            </h2>
            <p className="text-muted-foreground text-lg">
              Start free. Upgrade when you're ready.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`relative rounded-2xl border p-6 sm:p-8 transition-all duration-300 ${
                  plan.popular
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_40px_hsl(var(--primary)/0.1)]"
                    : "border-border/30 bg-card/50"
                }`}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    {plan.name}
                  </h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.desc}</p>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-neon shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  className={`w-full ${
                    plan.popular
                      ? "bg-primary hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                  onClick={handleGetStarted}
                >
                  {plan.cta}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
          >
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-6">
              Ready to level up
              <br />
              your events?
            </h2>
            <p className="text-muted-foreground text-lg mb-10 max-w-lg mx-auto">
              Join organizers who run battles with precision, style, and zero paper.
            </p>
            <Button
              size="lg"
              className="text-base px-10 py-6 gap-2 shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
              onClick={handleGetStarted}
            >
              <Crown className="w-5 h-5" />
              {isLoggedIn ? "Go to Dashboard" : "Get Started — It's Free"}
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/30 py-8 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="font-bold text-foreground">SWITCHBOARD</span>
          <span>© 2026 Switchboard. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;

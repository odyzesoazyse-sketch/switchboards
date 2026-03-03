import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Users, Timer, Sparkles, CheckCircle, TrendingUp, Zap, Shield, ArrowRight, Gavel, Monitor, Music } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

const DANCE_STYLES = [
  "Breaking", "Hip-Hop", "Popping", "Locking", "Krump",
  "Waacking", "House", "Dancehall", "Vogue", "All Styles"
];

const Index = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background pb-safe">
      {/* Hero Section — bold, dark-first aesthetic */}
      <section className="relative pt-24 sm:pt-32 pb-24 overflow-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 bg-grid opacity-30" />
        {/* Neon glows */}
        <div className="absolute top-1/3 left-1/5 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 bg-primary" />
        <div className="absolute bottom-1/3 right-1/5 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 bg-secondary" />

        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Language & Theme — mobile only */}
            <div className="flex items-center justify-center gap-3 mb-8 sm:hidden">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 mb-8"
            >
              <Gavel className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">{t("hero.badge")}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-7xl lg:text-8xl font-black mb-6 tracking-tight leading-[0.9]"
            >
              <span className="text-primary drop-shadow-[0_0_30px_hsl(var(--primary)/0.4)]">{t("hero.title1")}</span>{" "}
              <span className="text-secondary drop-shadow-[0_0_30px_hsl(var(--secondary)/0.4)]">{t("hero.title2")}</span>{" "}
              <span className="text-foreground">{t("hero.title3")}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
            >
              {t("hero.subtitle")}
            </motion.p>

            {/* Dance style tags */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap justify-center gap-2 mb-12 max-w-xl mx-auto"
            >
              {DANCE_STYLES.map((style) => (
                <span
                  key={style}
                  className="px-3 py-1.5 rounded-full text-xs font-bold bg-muted text-muted-foreground border border-border/50 uppercase tracking-wider"
                >
                  {style}
                </span>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                className="text-lg px-8 h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-black uppercase tracking-wider shadow-[0_0_30px_hsl(var(--primary)/0.3)]"
              >
                <Trophy className="mr-2 w-5 h-5" />
                {t("cta.startOrganizing")}
              </Button>
              <Button
                onClick={() => navigate("/dashboard")}
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14 border-2 font-bold"
              >
                {t("dashboard.myBattles")}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>

            {/* Stats */}
            <div className="mt-20 grid grid-cols-3 gap-8 max-w-md mx-auto">
              {[
                { value: "100%", label: "Transparent" },
                { value: "Real-time", label: "Voting" },
                { value: "0", label: "Bias" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 + i * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl sm:text-4xl font-black text-foreground">{stat.value}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-1">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 sm:py-24 bg-surface">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-5xl font-black mb-3 tracking-tight">{t("howItWorks.title")}</h2>
            <p className="text-muted-foreground">{t("howItWorks.subtitle")}</p>
          </div>

          <div className="grid gap-6 sm:gap-8 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {[
              { step: 1, icon: Sparkles, title: t("howItWorks.step1"), desc: t("howItWorks.step1Desc"), color: "primary" },
              { step: 2, icon: Users, title: t("howItWorks.step2"), desc: t("howItWorks.step2Desc"), color: "secondary" },
              { step: 3, icon: TrendingUp, title: t("howItWorks.step3"), desc: t("howItWorks.step3Desc"), color: "primary" },
              { step: 4, icon: Trophy, title: t("howItWorks.step4"), desc: t("howItWorks.step4Desc"), color: "secondary" },
            ].map((item) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: item.step * 0.1 }}
              >
                <Card className="p-6 h-full border-border/50 hover-lift group bg-card">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                    item.color === "primary" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                  }`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-[0.2em]">STEP {item.step}</div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-24">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-5xl font-black mb-3 tracking-tight">{t("features.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t("features.subtitle")}</p>
          </div>

          <div className="grid gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {[
              { icon: Users, title: t("features.roles"), desc: t("features.rolesDesc"), accent: "primary" },
              { icon: Timer, title: t("features.realtime"), desc: t("features.realtimeDesc"), accent: "secondary" },
              { icon: TrendingUp, title: t("features.twoPhase"), desc: t("features.twoPhaseDesc"), accent: "primary" },
              { icon: Monitor, title: t("features.liveViz"), desc: t("features.liveVizDesc"), accent: "secondary" },
              { icon: Shield, title: t("features.fair"), desc: t("features.fairDesc"), accent: "primary" },
              { icon: CheckCircle, title: t("features.control"), desc: t("features.controlDesc"), accent: "secondary" },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
              >
                <Card className={`p-5 h-full border-border/50 transition-all group hover:shadow-lg bg-card ${
                  feature.accent === "primary" ? "hover:border-primary/30 hover:shadow-[0_0_30px_hsl(var(--primary)/0.1)]" : "hover:border-secondary/30 hover:shadow-[0_0_30px_hsl(var(--secondary)/0.1)]"
                }`}>
                  <feature.icon className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${
                    feature.accent === "primary" ? "text-primary" : "text-secondary"
                  }`} />
                  <h3 className="text-base font-bold mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 bg-foreground text-background">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <Trophy className="w-14 h-14 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl sm:text-5xl font-black mb-4 tracking-tight">{t("cta.title")}</h2>
            <p className="text-lg opacity-70 mb-8">{t("cta.subtitle")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                className="text-lg px-8 h-14 bg-background text-foreground hover:bg-background/90 font-black uppercase tracking-wider"
              >
                {t("cta.startOrganizing")}
              </Button>
              <Button
                onClick={() => navigate("/judge")}
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14 border-2 border-background/30 text-background hover:bg-background/10 font-bold"
              >
                {t("dashboard.judgePanel")}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-8 border-t border-border/50">
        <div className="container mx-auto px-6 text-center">
          <p className="text-muted-foreground text-sm">© 2026 SWITCHBOARD. Fair judging for the dance battle community.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

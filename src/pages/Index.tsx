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
      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: 'var(--gradient-red-glow)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-20" style={{ background: 'var(--gradient-blue-glow)' }} />

        <div className="container mx-auto px-6 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Language & Theme */}
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
              <span className="text-sm font-medium">{t("hero.badge")}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-5xl sm:text-6xl lg:text-7xl font-display font-bold mb-6"
            >
              <span className="text-gradient-red">{t("hero.title1")}</span>{" "}
              <span className="text-gradient-blue">{t("hero.title2")}</span>{" "}
              <span className="text-foreground">{t("hero.title3")}</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground mb-6 max-w-2xl mx-auto"
            >
              {t("hero.subtitle")}
            </motion.p>

            {/* Dance style tags */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap justify-center gap-2 mb-10 max-w-xl mx-auto"
            >
              {DANCE_STYLES.map((style) => (
                <span
                  key={style}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border/50"
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
                className="text-lg px-8 h-14 bg-gradient-to-r from-primary to-secondary text-white hover-lift"
              >
                <Trophy className="mr-2 w-5 h-5" />
                {t("cta.startOrganizing")}
              </Button>
              <Button
                onClick={() => navigate("/dashboard")}
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14 border-2 hover-lift"
              >
                {t("dashboard.myBattles")}
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </motion.div>

            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
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
                  <div className="text-2xl sm:text-3xl font-display font-bold text-foreground">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it Works — compact visual flow */}
      <section className="py-16 sm:py-20 bg-surface">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">{t("howItWorks.title")}</h2>
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
                <Card className="p-6 h-full border-border/50 hover-lift group">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${
                    item.color === "primary" ? "bg-primary/10 text-primary" : "bg-secondary/10 text-secondary"
                  }`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="text-xs font-bold text-muted-foreground mb-1">STEP {item.step}</div>
                  <h3 className="text-lg font-display font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">{t("features.title")}</h2>
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
                <Card className={`p-5 h-full border-border/50 transition-all group hover:shadow-lg ${
                  feature.accent === "primary" ? "hover:border-primary/30" : "hover:border-secondary/30"
                }`}>
                  <feature.icon className={`w-8 h-8 mb-3 transition-transform group-hover:scale-110 ${
                    feature.accent === "primary" ? "text-primary" : "text-secondary"
                  }`} />
                  <h3 className="text-base font-display font-semibold mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-foreground text-background">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <Trophy className="w-14 h-14 mx-auto mb-6 opacity-80" />
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">{t("cta.title")}</h2>
            <p className="text-lg opacity-80 mb-8">{t("cta.subtitle")}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/auth")}
                size="lg"
                className="text-lg px-8 h-14 bg-background text-foreground hover:bg-background/90"
              >
                {t("cta.startOrganizing")}
              </Button>
              <Button
                onClick={() => navigate("/judge")}
                size="lg"
                variant="outline"
                className="text-lg px-8 h-14 border-2 border-background/30 text-background hover:bg-background/10"
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

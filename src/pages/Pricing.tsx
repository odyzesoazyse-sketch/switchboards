import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Check, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSubscription, type SubscriptionTier } from "@/hooks/useSubscription";

const PLANS: { name: string; tier: SubscriptionTier; price: string; period: string; features: string[]; popular: boolean }[] = [
  {
    name: "FREE",
    tier: "free",
    price: "$0",
    period: "forever",
    features: [
      "Up to 16 participants",
      "Standard bracket",
      "Basic judging modes",
      "Mobile voting",
      '"Powered by Switchboard" watermark',
    ],
    popular: false,
  },
  {
    name: "PRO",
    tier: "pro",
    price: "$149",
    period: "/month",
    features: [
      "Up to 512 participants",
      "Custom branding & colors",
      "OBS transparent overlay",
      "Sponsor logo uploads",
      "Export results (PDF/CSV)",
      "No watermark",
      "Priority support",
    ],
    popular: true,
  },
  {
    name: "ENTERPRISE",
    tier: "enterprise",
    price: "Custom",
    period: "",
    features: [
      "Unlimited participants",
      "API access",
      "White-Glove setup",
      "Dedicated account manager",
      "Custom integrations",
      "SLA guarantee",
      "Everything in Pro",
    ],
    popular: false,
  },
];

const Pricing = () => {
  const navigate = useNavigate();
  const { tier: currentTier, loading: subLoading } = useSubscription();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  const handleUpgrade = async (tier: SubscriptionTier) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (tier === currentTier) return;

    if (tier === ("enterprise" as SubscriptionTier)) {
      toast.info("Contact us at hello@switchboard.app for Enterprise plans.");
      return;
    }

    setUpgrading(tier);

    try {
      const maxParticipants = tier === "pro" ? 512 : tier === "enterprise" ? 99999 : 16;
      const expiresAt = tier === "free" ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const { error } = await supabase
        .from("profiles")
        .update({
          subscription_tier: tier,
          max_participants: maxParticipants,
          subscription_expires_at: expiresAt,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast.success(tier === "free" ? "Downgraded to Free" : `Upgraded to ${tier.toUpperCase()}! 🎉`);
      // Navigate to dashboard to reflect changes
      navigate("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Failed to update plan");
    } finally {
      setUpgrading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 sm:pb-0 sm:pt-14">

      <main className="container mx-auto px-4 sm:px-6 py-10 sm:py-16 max-w-5xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">Choose your plan</h2>
          <p className="text-muted-foreground">Upgrade anytime. Downgrade anytime. No lock-in.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = plan.tier === currentTier;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 sm:p-8 transition-all ${
                  plan.popular
                    ? "border-primary/50 bg-primary/5 shadow-[0_0_40px_hsl(var(--primary)/0.1)]"
                    : "border-border/30 bg-card/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground text-sm">{plan.period}</span>}
                  </div>
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
                    isCurrent
                      ? "bg-muted text-muted-foreground cursor-default"
                      : plan.popular
                        ? "bg-primary hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.2)]"
                        : "bg-muted hover:bg-muted/80 text-foreground"
                  }`}
                  disabled={isCurrent || upgrading !== null || subLoading}
                  onClick={() => handleUpgrade(plan.tier)}
                >
                  {upgrading === plan.tier ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : (
                    <>
                      <Crown className="w-4 h-4 mr-2" />
                      {plan.tier === "free" ? "Downgrade" : `Upgrade to ${plan.name}`}
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          Mock billing — no real charges. Stripe integration coming soon.
        </p>
      </main>
    </div>
  );
};

export default Pricing;

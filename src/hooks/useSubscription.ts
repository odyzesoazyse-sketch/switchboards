import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionTier = "free" | "pro" | "enterprise";

interface SubscriptionInfo {
  tier: SubscriptionTier;
  maxParticipants: number;
  expiresAt: string | null;
  loading: boolean;
}

const TIER_LIMITS: Record<SubscriptionTier, { maxParticipants: number; features: string[] }> = {
  free: {
    maxParticipants: 16,
    features: ["standard_bracket", "basic_judging"],
  },
  pro: {
    maxParticipants: 512,
    features: ["custom_branding", "obs_overlay", "export_results", "sponsor_logos", "no_watermark"],
  },
  enterprise: {
    maxParticipants: 99999,
    features: ["api_access", "white_glove", "custom_branding", "obs_overlay", "export_results", "sponsor_logos", "no_watermark"],
  },
};

export function useSubscription(): SubscriptionInfo {
  const [info, setInfo] = useState<SubscriptionInfo>({
    tier: "free",
    maxParticipants: 16,
    expiresAt: null,
    loading: true,
  });

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setInfo(prev => ({ ...prev, loading: false }));
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_expires_at, max_participants")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        const tier = (profile.subscription_tier || "free") as SubscriptionTier;
        setInfo({
          tier,
          maxParticipants: profile.max_participants || TIER_LIMITS[tier].maxParticipants,
          expiresAt: profile.subscription_expires_at,
          loading: false,
        });
      } else {
        setInfo(prev => ({ ...prev, loading: false }));
      }
    };

    load();
  }, []);

  return info;
}

export function hasFeature(tier: SubscriptionTier, feature: string): boolean {
  return TIER_LIMITS[tier].features.includes(feature);
}

export function getTierLimits(tier: SubscriptionTier) {
  return TIER_LIMITS[tier];
}

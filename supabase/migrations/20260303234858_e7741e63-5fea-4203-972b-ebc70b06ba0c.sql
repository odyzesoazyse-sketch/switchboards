
-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro', 'enterprise');

-- Add subscription fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN subscription_tier public.subscription_tier NOT NULL DEFAULT 'free',
  ADD COLUMN subscription_expires_at timestamp with time zone,
  ADD COLUMN max_participants integer NOT NULL DEFAULT 16;

-- Listening activity table to power friends feed
CREATE TABLE IF NOT EXISTS public.listening_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  track_id TEXT,
  track_title TEXT NOT NULL,
  track_artist TEXT,
  track_cover TEXT,
  track_source TEXT,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

ALTER TABLE public.listening_activity ENABLE ROW LEVEL SECURITY;

-- Helper trigger to keep updated_at current
CREATE OR REPLACE FUNCTION public.update_listening_activity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_listening_activity_updated_at
BEFORE UPDATE ON public.listening_activity
FOR EACH ROW
EXECUTE FUNCTION public.update_listening_activity_updated_at();

-- RLS policies
CREATE POLICY "Users can insert their listening activity"
ON public.listening_activity
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their listening activity"
ON public.listening_activity
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their listening activity"
ON public.listening_activity
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can view friends listening activity"
ON public.listening_activity
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.user_follows uf
    WHERE uf.follower_id = auth.uid()
      AND uf.following_id = listening_activity.user_id
  )
);

CREATE INDEX IF NOT EXISTS listening_activity_user_id_idx
  ON public.listening_activity(user_id);

CREATE INDEX IF NOT EXISTS listening_activity_played_at_idx
  ON public.listening_activity(played_at DESC);


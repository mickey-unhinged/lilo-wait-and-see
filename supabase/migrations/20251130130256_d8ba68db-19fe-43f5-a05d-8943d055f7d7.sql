-- Create listening_activity table for real-time friends activity feed
CREATE TABLE public.listening_activity (
  user_id UUID NOT NULL PRIMARY KEY,
  track_id TEXT NOT NULL,
  track_title TEXT NOT NULL,
  track_artist TEXT,
  track_cover TEXT,
  track_source TEXT,
  played_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listening_activity ENABLE ROW LEVEL SECURITY;

-- Users can view anyone's listening activity
CREATE POLICY "Listening activity is publicly viewable"
ON public.listening_activity FOR SELECT
USING (true);

-- Users can update their own activity
CREATE POLICY "Users can upsert their own listening activity"
ON public.listening_activity FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own listening activity"
ON public.listening_activity FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.listening_activity;
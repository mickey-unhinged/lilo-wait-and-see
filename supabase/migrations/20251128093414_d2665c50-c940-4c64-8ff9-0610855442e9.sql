-- Create shared_songs table for inbox functionality
CREATE TABLE public.shared_songs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  track_data JSONB NOT NULL,
  message TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_songs ENABLE ROW LEVEL SECURITY;

-- Users can view shares they sent or received
CREATE POLICY "Users can view own shared songs" 
ON public.shared_songs 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send shares
CREATE POLICY "Users can send shared songs" 
ON public.shared_songs 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- Users can update shares they received (mark as read)
CREATE POLICY "Users can update received shares" 
ON public.shared_songs 
FOR UPDATE 
USING (auth.uid() = recipient_id);

-- Users can delete shares they sent or received
CREATE POLICY "Users can delete own shares" 
ON public.shared_songs 
FOR DELETE 
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Create index for faster queries
CREATE INDEX idx_shared_songs_recipient ON public.shared_songs(recipient_id);
CREATE INDEX idx_shared_songs_sender ON public.shared_songs(sender_id);
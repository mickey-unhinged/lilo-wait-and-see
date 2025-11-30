-- Add privacy and room code columns to listening_rooms
ALTER TABLE public.listening_rooms 
ADD COLUMN is_private boolean NOT NULL DEFAULT false,
ADD COLUMN room_code text UNIQUE;

-- Create function to generate unique room codes
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate room code for private rooms
CREATE OR REPLACE FUNCTION set_room_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_private = true AND NEW.room_code IS NULL THEN
    NEW.room_code := generate_room_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_room_code_trigger
BEFORE INSERT OR UPDATE ON public.listening_rooms
FOR EACH ROW
EXECUTE FUNCTION set_room_code();

-- Create room_invites table for private room invitations
CREATE TABLE public.room_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id uuid NOT NULL REFERENCES public.listening_rooms(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL,
  invited_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(room_id, invited_user_id)
);

-- Enable RLS on room_invites
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;

-- RLS policies for room_invites
CREATE POLICY "Room hosts can manage invites"
ON public.room_invites FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM listening_rooms 
    WHERE listening_rooms.id = room_invites.room_id 
    AND listening_rooms.host_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own invites"
ON public.room_invites FOR SELECT
USING (invited_user_id = auth.uid());

CREATE POLICY "Users can delete their own invites"
ON public.room_invites FOR DELETE
USING (invited_user_id = auth.uid());

-- Update room viewing policy to account for private rooms
DROP POLICY IF EXISTS "Anyone can view rooms" ON public.listening_rooms;

CREATE POLICY "Users can view public rooms or rooms they have access to"
ON public.listening_rooms FOR SELECT
USING (
  is_private = false 
  OR host_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM room_participants 
    WHERE room_participants.room_id = listening_rooms.id 
    AND room_participants.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM room_invites 
    WHERE room_invites.room_id = listening_rooms.id 
    AND room_invites.invited_user_id = auth.uid()
  )
);

-- Enable realtime for room_invites
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invites;
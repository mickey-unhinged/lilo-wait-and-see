-- Create listening rooms table
CREATE TABLE public.listening_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  host_id UUID NOT NULL,
  current_track JSONB,
  is_playing BOOLEAN DEFAULT false,
  playback_position INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.listening_rooms ENABLE ROW LEVEL SECURITY;

-- Policies for listening rooms
CREATE POLICY "Anyone can view rooms" ON public.listening_rooms FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create rooms" ON public.listening_rooms FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Hosts can update their rooms" ON public.listening_rooms FOR UPDATE USING (auth.uid() = host_id);
CREATE POLICY "Hosts can delete their rooms" ON public.listening_rooms FOR DELETE USING (auth.uid() = host_id);

-- Create room participants table
CREATE TABLE public.room_participants (
  room_id UUID NOT NULL REFERENCES public.listening_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

-- Policies for room participants
CREATE POLICY "Anyone can view participants" ON public.room_participants FOR SELECT USING (true);
CREATE POLICY "Users can join rooms" ON public.room_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave rooms" ON public.room_participants FOR DELETE USING (auth.uid() = user_id);

-- Create room messages table
CREATE TABLE public.room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.listening_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  reaction TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

-- Policies for room messages
CREATE POLICY "Anyone in room can view messages" ON public.room_messages FOR SELECT USING (true);
CREATE POLICY "Users can send messages" ON public.room_messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for all room tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.listening_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;
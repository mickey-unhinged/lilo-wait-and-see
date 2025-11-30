-- Drop ALL existing policies on listening_rooms
DROP POLICY IF EXISTS "Anyone can view public rooms" ON public.listening_rooms;
DROP POLICY IF EXISTS "Users can view rooms they host" ON public.listening_rooms;
DROP POLICY IF EXISTS "Users can view private rooms they are invited to" ON public.listening_rooms;
DROP POLICY IF EXISTS "Users can view rooms they participate in" ON public.listening_rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.listening_rooms;
DROP POLICY IF EXISTS "Hosts can update their own rooms" ON public.listening_rooms;
DROP POLICY IF EXISTS "Hosts can delete their own rooms" ON public.listening_rooms;

-- Recreate simple policies without recursion
CREATE POLICY "view_public_rooms"
ON public.listening_rooms FOR SELECT
USING (is_private = false OR auth.uid() = host_id);

CREATE POLICY "view_participant_rooms"
ON public.listening_rooms FOR SELECT
USING (
  id IN (SELECT room_id FROM public.room_participants WHERE user_id = auth.uid())
);

CREATE POLICY "view_invited_rooms"
ON public.listening_rooms FOR SELECT
USING (
  id IN (SELECT room_id FROM public.room_invites WHERE invited_user_id = auth.uid())
);

CREATE POLICY "create_rooms"
ON public.listening_rooms FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "update_own_rooms"
ON public.listening_rooms FOR UPDATE
USING (auth.uid() = host_id);

CREATE POLICY "delete_own_rooms"
ON public.listening_rooms FOR DELETE
USING (auth.uid() = host_id);
-- Fix the infinite recursion issue in listening_rooms RLS policies
-- Drop the problematic policies that cause circular references
DROP POLICY IF EXISTS "view_invited_rooms" ON public.listening_rooms;
DROP POLICY IF EXISTS "view_participant_rooms" ON public.listening_rooms;
DROP POLICY IF EXISTS "view_public_rooms" ON public.listening_rooms;

-- Create a security definer function to check room access without recursion
CREATE OR REPLACE FUNCTION public.can_access_room(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.listening_rooms
    WHERE id = _room_id AND (is_private = false OR host_id = _user_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.room_participants
    WHERE room_id = _room_id AND user_id = _user_id
  )
  OR EXISTS (
    SELECT 1 FROM public.room_invites
    WHERE room_id = _room_id AND invited_user_id = _user_id
  )
$$;

-- Create a single unified SELECT policy using the security definer function
CREATE POLICY "users_can_view_accessible_rooms" ON public.listening_rooms
FOR SELECT USING (
  is_private = false 
  OR host_id = auth.uid()
  OR public.can_access_room(auth.uid(), id)
);
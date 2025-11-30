-- Drop ALL conflicting policies on listening_rooms
DROP POLICY IF EXISTS "Users can view public rooms or rooms they have access to" ON public.listening_rooms;
DROP POLICY IF EXISTS "Hosts can delete their rooms" ON public.listening_rooms;
DROP POLICY IF EXISTS "Hosts can update their rooms" ON public.listening_rooms;

-- Keep only the simple non-recursive policies:
-- view_public_rooms, view_participant_rooms, view_invited_rooms, create_rooms, update_own_rooms, delete_own_rooms
-- Create table for playlist collaborators
CREATE TABLE public.playlist_collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(playlist_id, user_id)
);

-- Enable RLS
ALTER TABLE public.playlist_collaborators ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Playlist owner can manage collaborators"
ON public.playlist_collaborators
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_collaborators.playlist_id
    AND playlists.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view collaborations they're part of"
ON public.playlist_collaborators
FOR SELECT
USING (user_id = auth.uid() OR invited_by = auth.uid());

CREATE POLICY "Users can accept/reject invitations"
ON public.playlist_collaborators
FOR UPDATE
USING (user_id = auth.uid());

-- Update playlist_tracks policy to allow collaborators to add tracks
DROP POLICY IF EXISTS "Playlist owner can manage tracks" ON public.playlist_tracks;

CREATE POLICY "Playlist owner and collaborators can manage tracks"
ON public.playlist_tracks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM playlists
    WHERE playlists.id = playlist_tracks.playlist_id
    AND (
      playlists.owner_id = auth.uid()
      OR (
        playlists.is_collaborative = true
        AND EXISTS (
          SELECT 1 FROM playlist_collaborators pc
          WHERE pc.playlist_id = playlists.id
          AND pc.user_id = auth.uid()
          AND pc.accepted_at IS NOT NULL
        )
      )
    )
  )
);
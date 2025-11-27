import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, X, Music2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Invitation {
  id: string;
  playlist_id: string;
  invited_at: string;
  playlist?: {
    title: string;
    cover_url: string | null;
  };
  inviter?: {
    display_name: string | null;
    username: string | null;
  };
}

export function PlaylistInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("playlist_collaborators")
        .select("id, playlist_id, invited_at, invited_by")
        .eq("user_id", user.id)
        .is("accepted_at", null);

      if (error) throw error;

      if (data && data.length > 0) {
        // Fetch playlist and inviter info
        const playlistIds = data.map((i) => i.playlist_id);
        const inviterIds = data.map((i) => i.invited_by);

        const [playlistsRes, profilesRes] = await Promise.all([
          supabase.from("playlists").select("id, title, cover_url").in("id", playlistIds),
          supabase.from("profiles").select("id, display_name, username").in("id", inviterIds),
        ]);

        const invitationsWithDetails = data.map((inv) => ({
          ...inv,
          playlist: playlistsRes.data?.find((p) => p.id === inv.playlist_id),
          inviter: profilesRes.data?.find((p) => p.id === inv.invited_by),
        }));

        setInvitations(invitationsWithDetails);
      } else {
        setInvitations([]);
      }
    } catch (error) {
      console.error("Failed to fetch invitations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("playlist_collaborators")
        .update({ accepted_at: new Date().toISOString() })
        .eq("id", invitationId);

      if (error) throw error;

      toast({
        title: "Invitation accepted",
        description: "You can now add songs to this playlist",
      });

      fetchInvitations();
    } catch (error) {
      console.error("Failed to accept invitation:", error);
    }
  };

  const declineInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from("playlist_collaborators")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      toast({
        title: "Invitation declined",
      });

      fetchInvitations();
    } catch (error) {
      console.error("Failed to decline invitation:", error);
    }
  };

  if (isLoading || invitations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3">Playlist Invitations</h3>
      <div className="space-y-2">
        {invitations.map((inv) => (
          <Card key={inv.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden">
                {inv.playlist?.cover_url ? (
                  <img
                    src={inv.playlist.cover_url}
                    alt={inv.playlist.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music2 className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <p className="font-medium">{inv.playlist?.title}</p>
                <p className="text-sm text-muted-foreground">
                  Invited by {inv.inviter?.display_name || inv.inviter?.username}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => acceptInvitation(inv.id)}
                className="gap-1"
              >
                <Check className="w-4 h-4" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => declineInvitation(inv.id)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

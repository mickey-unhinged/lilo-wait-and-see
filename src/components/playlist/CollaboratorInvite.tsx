import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { UserPlus, Search, Check, X, Loader2, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";

interface User {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

interface Collaborator {
  id: string;
  user_id: string;
  accepted_at: string | null;
  profile?: User;
}

interface CollaboratorInviteProps {
  playlistId: string;
  isOwner: boolean;
}

export function CollaboratorInvite({ playlistId, isOwner }: CollaboratorInviteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (isOpen) {
      fetchCollaborators();
    }
  }, [isOpen, playlistId]);

  useEffect(() => {
    if (debouncedSearch.length >= 2) {
      searchUsers(debouncedSearch);
    } else {
      setSearchResults([]);
    }
  }, [debouncedSearch]);

  const fetchCollaborators = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("playlist_collaborators")
        .select("id, user_id, accepted_at")
        .eq("playlist_id", playlistId);

      if (error) throw error;

      // Fetch profile info for each collaborator
      if (data && data.length > 0) {
        const userIds = data.map((c) => c.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", userIds);

        const collaboratorsWithProfiles = data.map((c) => ({
          ...c,
          profile: profiles?.find((p) => p.id === c.user_id),
        }));

        setCollaborators(collaboratorsWithProfiles);
      } else {
        setCollaborators([]);
      }
    } catch (error) {
      console.error("Failed to fetch collaborators:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    setIsSearching(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .neq("id", user.id)
        .limit(10);

      if (error) throw error;

      // Filter out existing collaborators
      const existingIds = new Set(collaborators.map((c) => c.user_id));
      setSearchResults((data || []).filter((u) => !existingIds.has(u.id)));
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const inviteUser = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from("playlist_collaborators").insert({
        playlist_id: playlistId,
        user_id: userId,
        invited_by: user.id,
      });

      if (error) throw error;

      toast({
        title: "Invitation sent",
        description: "User has been invited to collaborate",
      });

      fetchCollaborators();
      setSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Failed to invite user:", error);
      toast({
        title: "Failed to invite",
        description: "Could not send invitation",
        variant: "destructive",
      });
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from("playlist_collaborators")
        .delete()
        .eq("id", collaboratorId);

      if (error) throw error;

      toast({
        title: "Collaborator removed",
      });

      fetchCollaborators();
    } catch (error) {
      console.error("Failed to remove collaborator:", error);
    }
  };

  if (!isOwner) return null;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="w-4 h-4" />
          Collaborators
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-background border-border">
        <SheetHeader>
          <SheetTitle>Manage Collaborators</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users to invite..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="bg-card rounded-lg border border-border divide-y divide-border">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {(user.display_name || user.username || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.display_name || user.username}
                        </p>
                        {user.username && (
                          <p className="text-xs text-muted-foreground">
                            @{user.username}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => inviteUser(user.id)}
                      className="gap-1"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {isSearching && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Current Collaborators */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Current Collaborators ({collaborators.length})
            </h3>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No collaborators yet. Invite friends to add songs together!
              </p>
            ) : (
              <div className="space-y-2">
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className="flex items-center justify-between p-3 bg-card rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={collab.profile?.avatar_url || undefined} />
                        <AvatarFallback>
                          {(collab.profile?.display_name || collab.profile?.username || "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {collab.profile?.display_name || collab.profile?.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {collab.accepted_at ? (
                            <span className="text-green-500 flex items-center gap-1">
                              <Check className="w-3 h-3" /> Accepted
                            </span>
                          ) : (
                            "Pending"
                          )}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCollaborator(collab.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

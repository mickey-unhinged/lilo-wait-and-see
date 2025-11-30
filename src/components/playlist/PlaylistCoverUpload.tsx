import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PlaylistCoverUploadProps {
  playlistId: string;
  currentCover: string | null;
  onUploadComplete: (url: string) => void;
}

export function PlaylistCoverUpload({ playlistId, currentCover, onUploadComplete }: PlaylistCoverUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Create unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${playlistId}-${Date.now()}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("playlist-covers")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("playlist-covers")
        .getPublicUrl(filePath);

      // Update playlist cover_url
      const { error: updateError } = await supabase
        .from("playlists")
        .update({ cover_url: publicUrl })
        .eq("id", playlistId);

      if (updateError) throw updateError;

      toast({ title: "Cover updated!" });
      onUploadComplete(publicUrl);
    } catch (error) {
      console.error("Failed to upload cover:", error);
      toast({ title: "Failed to upload cover", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="relative inline-block">
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        id={`cover-upload-${playlistId}`}
        disabled={isUploading}
      />
      <label htmlFor={`cover-upload-${playlistId}`}>
        <Button
          variant="outline"
          size="sm"
          disabled={isUploading}
          asChild
        >
          <span className="cursor-pointer">
            {isUploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Camera className="w-4 h-4 mr-2" />
            )}
            {currentCover ? "Change Cover" : "Add Cover"}
          </span>
        </Button>
      </label>
    </div>
  );
}

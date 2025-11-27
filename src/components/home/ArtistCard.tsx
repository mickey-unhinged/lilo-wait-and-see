interface ArtistCardProps {
  name: string;
  imageUrl: string;
  followers?: string;
  onClick?: () => void;
}

export function ArtistCard({ name, imageUrl, followers, onClick }: ArtistCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col items-center text-center w-28 transition-all duration-300"
    >
      {/* Avatar */}
      <div className="relative mb-3">
        <img
          src={imageUrl}
          alt={name}
          className="w-24 h-24 rounded-full object-cover border-2 border-transparent group-hover:border-primary transition-all duration-300"
        />
        <div className="absolute inset-0 rounded-full bg-primary/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
      </div>
      
      {/* Info */}
      <h3 className="font-medium text-sm truncate w-full">{name}</h3>
      {followers && (
        <p className="text-xs text-muted-foreground">{followers}</p>
      )}
    </button>
  );
}

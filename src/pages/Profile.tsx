import { Settings, ChevronRight, LogOut, Moon, Bell, Shield, HelpCircle, Music } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

const menuItems = [
  { icon: Music, label: "Playback", description: "Audio quality, crossfade" },
  { icon: Bell, label: "Notifications", description: "Push, email alerts" },
  { icon: Shield, label: "Privacy", description: "Data, personalization" },
  { icon: Moon, label: "Appearance", description: "Theme, display" },
  { icon: HelpCircle, label: "Help & Support", description: "FAQ, contact us" },
];

const Profile = () => {
  // Mock user data
  const user = {
    name: "Alex Thompson",
    username: "@alexthompson",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
    followers: 248,
    following: 186,
    playlists: 24,
    isPremium: false,
  };

  return (
    <AppLayout>
      <div className="px-4 pt-12 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold font-display">Profile</h1>
          <button className="p-2 rounded-full hover:bg-card transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
        
        {/* User card */}
        <div className="glass rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-primary"
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-muted-foreground">{user.username}</p>
              {!user.isPremium && (
                <button className="mt-2 px-4 py-1.5 text-xs font-semibold gradient-bg text-primary-foreground rounded-full">
                  Upgrade to Premium
                </button>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-2xl bg-card/50">
              <p className="text-xl font-bold">{user.playlists}</p>
              <p className="text-xs text-muted-foreground">Playlists</p>
            </div>
            <div className="p-3 rounded-2xl bg-card/50">
              <p className="text-xl font-bold">{user.followers}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="p-3 rounded-2xl bg-card/50">
              <p className="text-xl font-bold">{user.following}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>
        </div>
        
        {/* Menu items */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-card/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center">
                <item.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>
        
        {/* Sign out */}
        <button className="w-full flex items-center gap-4 p-4 mt-4 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <LogOut className="w-5 h-5" />
          </div>
          <span className="font-medium">Sign Out</span>
        </button>
        
        {/* Version */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Lilo v1.0.0
        </p>
      </div>
    </AppLayout>
  );
};

export default Profile;

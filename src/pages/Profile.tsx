import { useState, useEffect } from "react";
import { Settings, ChevronRight, LogOut, Moon, Bell, Shield, HelpCircle, Music, User, Sun, Volume2, Info, Mail, MessageSquare, Bug, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useSettings } from "@/hooks/useSettings";
import { Watermark } from "@/components/common/Watermark";

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { settings, toggleSetting } = useSettings();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out", description: "You've been logged out successfully." });
    navigate("/auth");
  };

  // Mock user data for display
  const displayUser = {
    name: user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Guest",
    username: user?.email ? `@${user.email.split("@")[0]}` : "@guest",
    avatarUrl: user?.user_metadata?.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
    followers: 248,
    following: 186,
    playlists: 24,
    isPremium: false,
  };

  const menuItems = [
    { icon: Music, label: "Playback", description: "Audio quality, crossfade" },
    { icon: Bell, label: "Notifications", description: "Push, email alerts" },
    { icon: Shield, label: "Privacy", description: "Data, personalization" },
    { icon: theme === "dark" ? Moon : Sun, label: "Appearance", description: "Theme, display" },
    { icon: HelpCircle, label: "Help & Support", description: "FAQ, contact us" },
  ];

  const handleContactSupport = () => {
    toast({ title: "Support", description: "Contact support at support@lilo.app" });
  };

  const handleReportProblem = () => {
    toast({ title: "Report Sent", description: "Thank you for your feedback!" });
    setActiveSheet(null);
  };

  const SettingsSheet = ({ item }: { item: typeof menuItems[0] }) => (
    <Sheet open={activeSheet === item.label} onOpenChange={(open) => setActiveSheet(open ? item.label : null)}>
      <SheetTrigger asChild>
        <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-card/50 transition-colors">
          <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center">
            <item.icon className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-medium">{item.label}</p>
            <p className="text-sm text-muted-foreground">{item.description}</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <item.icon className="w-5 h-5" />
            {item.label}
          </SheetTitle>
        </SheetHeader>
        <div className="py-6 space-y-4">
          {item.label === "Playback" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">High Quality Audio</p>
                  <p className="text-sm text-muted-foreground">Stream in 320kbps</p>
                </div>
                <Switch 
                  checked={settings.highQualityAudio}
                  onCheckedChange={() => {
                    toggleSetting("highQualityAudio");
                    toast({ 
                      title: settings.highQualityAudio ? "Standard Quality" : "High Quality Enabled",
                      description: settings.highQualityAudio ? "Streaming at 128kbps" : "Streaming at 320kbps"
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Crossfade</p>
                  <p className="text-sm text-muted-foreground">Smooth transitions between tracks</p>
                </div>
                <Switch 
                  checked={settings.crossfade}
                  onCheckedChange={() => {
                    toggleSetting("crossfade");
                    toast({ 
                      title: settings.crossfade ? "Crossfade Disabled" : "Crossfade Enabled",
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Gapless Playback</p>
                  <p className="text-sm text-muted-foreground">No gaps between tracks</p>
                </div>
                <Switch 
                  checked={settings.gaplessPlayback}
                  onCheckedChange={() => toggleSetting("gaplessPlayback")}
                />
              </div>
              <div className="space-y-2">
                <p className="font-medium">Volume Normalization</p>
                <p className="text-sm text-muted-foreground">Keeps volume consistent across tracks</p>
                <Slider defaultValue={[75]} max={100} step={1} className="mt-2" />
              </div>
            </>
          )}
          {item.label === "Notifications" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">New releases, updates</p>
                </div>
                <Switch 
                  checked={settings.pushNotifications}
                  onCheckedChange={() => {
                    toggleSetting("pushNotifications");
                    toast({ 
                      title: settings.pushNotifications ? "Notifications Off" : "Notifications On",
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Updates</p>
                  <p className="text-sm text-muted-foreground">Weekly digest</p>
                </div>
                <Switch 
                  checked={settings.emailUpdates}
                  onCheckedChange={() => toggleSetting("emailUpdates")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Artist Updates</p>
                  <p className="text-sm text-muted-foreground">New music from artists you follow</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Concert Alerts</p>
                  <p className="text-sm text-muted-foreground">Shows near you</p>
                </div>
                <Switch />
              </div>
            </>
          )}
          {item.label === "Privacy" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Personalized Recommendations</p>
                  <p className="text-sm text-muted-foreground">Better suggestions based on listening</p>
                </div>
                <Switch 
                  checked={settings.personalizedRecommendations}
                  onCheckedChange={() => toggleSetting("personalizedRecommendations")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Share Listening Activity</p>
                  <p className="text-sm text-muted-foreground">Friends can see what you're playing</p>
                </div>
                <Switch 
                  checked={settings.shareListeningActivity}
                  onCheckedChange={() => toggleSetting("shareListeningActivity")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Public Profile</p>
                  <p className="text-sm text-muted-foreground">Anyone can view your profile</p>
                </div>
                <Switch defaultChecked />
              </div>
              <button className="w-full p-4 rounded-xl bg-card/50 hover:bg-card text-left transition-colors mt-4">
                <p className="font-medium">Download Your Data</p>
                <p className="text-sm text-muted-foreground">Get a copy of your Lilo data</p>
              </button>
            </>
          )}
          {item.label === "Appearance" && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">{theme === "dark" ? "Currently enabled" : "Currently disabled"}</p>
                </div>
                <Switch 
                  checked={theme === "dark"}
                  onCheckedChange={() => {
                    toggleTheme();
                    toast({ 
                      title: theme === "dark" ? "Light Mode" : "Dark Mode",
                      description: `Switched to ${theme === "dark" ? "light" : "dark"} theme`
                    });
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Reduce Motion</p>
                  <p className="text-sm text-muted-foreground">Less animations</p>
                </div>
                <Switch 
                  checked={settings.reduceMotion}
                  onCheckedChange={() => toggleSetting("reduceMotion")}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Compact Mode</p>
                  <p className="text-sm text-muted-foreground">Show more content</p>
                </div>
                <Switch />
              </div>
            </>
          )}
          {item.label === "Help & Support" && (
            <div className="space-y-3">
              <button 
                onClick={() => window.open("https://help.lilo.app", "_blank")}
                className="w-full p-4 rounded-xl bg-card/50 hover:bg-card text-left transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">FAQ</p>
                  <p className="text-sm text-muted-foreground">Common questions</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              </button>
              <button 
                onClick={handleContactSupport}
                className="w-full p-4 rounded-xl bg-card/50 hover:bg-card text-left transition-colors flex items-center gap-3"
              >
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Contact Support</p>
                  <p className="text-sm text-muted-foreground">Get help from our team</p>
                </div>
              </button>
              <button 
                onClick={handleReportProblem}
                className="w-full p-4 rounded-xl bg-card/50 hover:bg-card text-left transition-colors flex items-center gap-3"
              >
                <Bug className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Report a Problem</p>
                  <p className="text-sm text-muted-foreground">Let us know about issues</p>
                </div>
              </button>
              <button 
                onClick={() => toast({ title: "Feedback", description: "Thank you for your feedback!" })}
                className="w-full p-4 rounded-xl bg-card/50 hover:bg-card text-left transition-colors flex items-center gap-3"
              >
                <MessageSquare className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Send Feedback</p>
                  <p className="text-sm text-muted-foreground">Share your thoughts</p>
                </div>
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  // General Settings Sheet
  const GeneralSettingsSheet = () => (
    <Sheet open={showSettingsSheet} onOpenChange={setShowSettingsSheet}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </SheetTitle>
        </SheetHeader>
        <div className="py-6 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setShowSettingsSheet(false);
                setTimeout(() => setActiveSheet(item.label), 200);
              }}
              className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-card/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center">
                <item.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
          
          <div className="pt-4 border-t border-border mt-4">
            <button className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-card/50 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-card flex items-center justify-center">
                <Info className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">About</p>
                <p className="text-xs text-muted-foreground">Version 1.0.0</p>
              </div>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <AppLayout>
      <div className="px-4 pt-12 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold font-display">Profile</h1>
          <button 
            onClick={() => setShowSettingsSheet(true)}
            className="p-2 rounded-full hover:bg-card transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
        
        {/* User card */}
        <div className="glass rounded-3xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            {user ? (
              <img
                src={displayUser.avatarUrl}
                alt={displayUser.name}
                className="w-20 h-20 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-card flex items-center justify-center border-2 border-border">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1">
              <h2 className="text-xl font-bold">{displayUser.name}</h2>
              <p className="text-muted-foreground">{displayUser.username}</p>
              {user ? (
                !displayUser.isPremium && (
                  <button className="mt-2 px-4 py-1.5 text-xs font-semibold gradient-bg text-primary-foreground rounded-full">
                    Upgrade to Premium
                  </button>
                )
              ) : (
                <button 
                  onClick={() => navigate("/auth")}
                  className="mt-2 px-4 py-1.5 text-xs font-semibold gradient-bg text-primary-foreground rounded-full"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-2xl bg-card/50">
              <p className="text-xl font-bold">{displayUser.playlists}</p>
              <p className="text-xs text-muted-foreground">Playlists</p>
            </div>
            <div className="p-3 rounded-2xl bg-card/50">
              <p className="text-xl font-bold">{displayUser.followers}</p>
              <p className="text-xs text-muted-foreground">Followers</p>
            </div>
            <div className="p-3 rounded-2xl bg-card/50">
              <p className="text-xl font-bold">{displayUser.following}</p>
              <p className="text-xs text-muted-foreground">Following</p>
            </div>
          </div>
        </div>
        
        {/* Menu items */}
        <div className="space-y-2">
          {menuItems.map((item) => (
            <SettingsSheet key={item.label} item={item} />
          ))}
        </div>
        
        {/* Sign out */}
        {user && (
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 p-4 mt-4 rounded-2xl text-destructive hover:bg-destructive/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="font-medium">Sign Out</span>
          </button>
        )}
        
        {/* Version & Watermark */}
        <div className="text-center mt-8 space-y-1">
          <p className="text-xs text-muted-foreground">
            Lilo v1.0.0
          </p>
          <Watermark />
        </div>
      </div>

      <GeneralSettingsSheet />
    </AppLayout>
  );
};

export default Profile;

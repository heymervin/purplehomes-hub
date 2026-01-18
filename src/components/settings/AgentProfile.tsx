import { useState, useEffect } from 'react';
import { User, Mail, Phone, Image, Save, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';

// LocalStorage keys for agent profile overrides
const STORAGE_KEYS = {
  enabled: 'agent_profile_override_enabled',
  name: 'agent_profile_name',
  email: 'agent_profile_email',
  phone: 'agent_profile_phone',
  title: 'agent_profile_title',
  headshot: 'agent_profile_headshot',
};

interface AgentProfileData {
  enabled: boolean;
  name: string;
  email: string;
  phone: string;
  title: string;
  headshot: string;
}

// Helper to get saved profile from localStorage
export function getAgentProfileOverrides(): AgentProfileData | null {
  const enabled = localStorage.getItem(STORAGE_KEYS.enabled) === 'true';
  if (!enabled) return null;

  return {
    enabled,
    name: localStorage.getItem(STORAGE_KEYS.name) || '',
    email: localStorage.getItem(STORAGE_KEYS.email) || '',
    phone: localStorage.getItem(STORAGE_KEYS.phone) || '',
    title: localStorage.getItem(STORAGE_KEYS.title) || '',
    headshot: localStorage.getItem(STORAGE_KEYS.headshot) || '',
  };
}

// Helper to check if overrides are enabled
export function isAgentProfileOverrideEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEYS.enabled) === 'true';
}

export function AgentProfile() {
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [profile, setProfile] = useState<AgentProfileData>({
    enabled: false,
    name: '',
    email: '',
    phone: '',
    title: '',
    headshot: '',
  });

  // Load saved profile on mount
  useEffect(() => {
    setProfile({
      enabled: localStorage.getItem(STORAGE_KEYS.enabled) === 'true',
      name: localStorage.getItem(STORAGE_KEYS.name) || '',
      email: localStorage.getItem(STORAGE_KEYS.email) || '',
      phone: localStorage.getItem(STORAGE_KEYS.phone) || '',
      title: localStorage.getItem(STORAGE_KEYS.title) || '',
      headshot: localStorage.getItem(STORAGE_KEYS.headshot) || '',
    });
  }, []);

  const updateProfile = (field: keyof AgentProfileData, value: string | boolean) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    setIsSaving(true);

    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.enabled, String(profile.enabled));
    localStorage.setItem(STORAGE_KEYS.name, profile.name);
    localStorage.setItem(STORAGE_KEYS.email, profile.email);
    localStorage.setItem(STORAGE_KEYS.phone, profile.phone);
    localStorage.setItem(STORAGE_KEYS.title, profile.title);
    localStorage.setItem(STORAGE_KEYS.headshot, profile.headshot);

    setTimeout(() => {
      setIsSaving(false);
      setHasChanges(false);
      toast.success('Agent profile saved');
    }, 300);
  };

  const handleReset = () => {
    // Clear all localStorage keys
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));

    setProfile({
      enabled: false,
      name: '',
      email: '',
      phone: '',
      title: '',
      headshot: '',
    });
    setHasChanges(false);
    toast.success('Agent profile reset to defaults');
  };

  const getInitials = () => {
    if (!profile.name) return '?';
    const parts = profile.name.split(' ');
    return parts.map(p => p[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Agent Profile Override
            </CardTitle>
            <CardDescription>
              Override Imejis template fieldIDs with custom agent information for branded images
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isSaving}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              size="sm"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Override Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div>
            <Label className="text-sm font-medium">Enable Profile Override</Label>
            <p className="text-sm text-muted-foreground">
              When enabled, Imejis templates will use these values instead of default fieldIDs
            </p>
          </div>
          <Switch
            checked={profile.enabled}
            onCheckedChange={(checked) => updateProfile('enabled', checked)}
          />
        </div>

        {/* Profile Fields */}
        <div className={profile.enabled ? '' : 'opacity-50 pointer-events-none'}>
          {/* Avatar Preview */}
          <div className="flex items-center gap-6 mb-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile.headshot || undefined} />
              <AvatarFallback className="text-xl bg-muted">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">{profile.name || 'Agent Name'}</p>
              <p className="text-sm text-muted-foreground">{profile.title || 'Title'}</p>
              {profile.email && (
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="agent-name" className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Agent Name
              </Label>
              <Input
                id="agent-name"
                value={profile.name}
                onChange={(e) => updateProfile('name', e.target.value)}
                placeholder="John Doe"
                disabled={!profile.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-title">Title</Label>
              <Input
                id="agent-title"
                value={profile.title}
                onChange={(e) => updateProfile('title', e.target.value)}
                placeholder="Real Estate Agent"
                disabled={!profile.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-email" className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email
              </Label>
              <Input
                id="agent-email"
                type="email"
                value={profile.email}
                onChange={(e) => updateProfile('email', e.target.value)}
                placeholder="agent@example.com"
                disabled={!profile.enabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone
              </Label>
              <Input
                id="agent-phone"
                value={profile.phone}
                onChange={(e) => updateProfile('phone', e.target.value)}
                placeholder="(555) 123-4567"
                disabled={!profile.enabled}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="agent-headshot" className="flex items-center gap-2">
                <Image className="h-4 w-4 text-muted-foreground" />
                Headshot URL
              </Label>
              <Input
                id="agent-headshot"
                value={profile.headshot}
                onChange={(e) => updateProfile('headshot', e.target.value)}
                placeholder="https://example.com/headshot.jpg"
                disabled={!profile.enabled}
              />
              <p className="text-xs text-muted-foreground">
                Enter a direct URL to your headshot image (recommended size: 512x512 px)
              </p>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <p className="font-medium mb-1">How it works:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>These values are stored locally in your browser</li>
            <li>When generating branded images via Imejis, these values will override the default template fieldIDs</li>
            <li>Each team member can have their own profile settings</li>
            <li>Disable the toggle to use the default template values</li>
          </ul>
        </div>

        {hasChanges && (
          <p className="text-sm text-yellow-600 font-medium">You have unsaved changes</p>
        )}
      </CardContent>
    </Card>
  );
}

import { useState, useEffect, useMemo } from 'react';
import {
  Check, RefreshCw, ExternalLink, Wifi, WifiOff, Key, Save,
  Clock, CheckCircle2, Calculator, Loader2, Target, Home,
  DollarSign, Sliders, ChevronDown, Users, Share2, Settings as SettingsIcon,
  Link2, Zap, Brain, MessageSquareQuote, Plus, Trash2, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useTestConnection, useSocialAccounts } from '@/services/ghlApi';
import { useGhlConnection } from '@/hooks/useGhlConnection';
import { useCalculatorDefaults, useUpdateCalculatorDefaults } from '@/services/calculatorApi';
import { useMatchingPreferences, useUpdateMatchingPreferences } from '@/services/matchingApi';
import { TeamManagement } from '@/components/settings/team';
import { AIPerformance } from '@/components/settings/AIPerformance';
import type { CalculatorDefaults } from '@/types/calculator';
import {
  DEFAULT_AFFORDABILITY_SETTINGS,
  DEFAULT_MATCH_FLEXIBILITY,
  type AffordabilitySettings,
  type ZillowMatchFlexibility
} from '@/types/matching';
import {
  calculateMaxAffordablePrice,
  calculateEntryFactor,
  calculateFixedTotal
} from '@/lib/affordability';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { isAgentProfileOverrideEnabled, setAgentProfileOverrideEnabled } from '@/lib/agentProfileToggle';
import { User, Calendar } from 'lucide-react';
import { logSettingsChanged } from '@/store/useActivityStore';
import { useQueueSettings } from '@/hooks/useQueueSettings';
import { DAY_LABELS, AVAILABLE_TIME_SLOTS } from '@/lib/queue/constants';
import type { Testimonial } from '@/types/funnel';

// Collapsible Section Component
function SettingsSection({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
  actions
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg">
        <CollapsibleTrigger asChild>
          <button className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors text-left">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-primary" />
              <span className="font-medium">{title}</span>
              {badge}
            </div>
            <div className="flex items-center gap-2">
              {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
              <ChevronDown className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-2 border-t">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// Common US timezones for the dropdown
const TIMEZONE_OPTIONS = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Phoenix', label: 'Arizona (MST - no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
];

// Available social platforms
const PLATFORM_OPTIONS = [
  { id: 'facebook', label: 'Facebook', icon: '📘' },
  { id: 'instagram', label: 'Instagram', icon: '📷' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'twitter', label: 'X (Twitter)', icon: '🐦' },
  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
  { id: 'google', label: 'Google Business', icon: '🔍' },
];

export default function Settings() {
  const { propertiesPerPage, setPropertiesPerPage, timezone, setTimezone, defaultPlatforms, setDefaultPlatforms } = useAppStore();
  const { user: currentUser } = useAuthStore();
  const { isConnected, manualReconnect } = useGhlConnection({ autoConnect: false });

  // GHL Domain Configuration
  const [ghlDomain, setGhlDomain] = useState(() => {
    return localStorage.getItem('ghl_domain') || 'app.gohighlevel.com';
  });
  const [ghlLocationIdLocal, setGhlLocationIdLocal] = useState(() => {
    return localStorage.getItem('ghl_location_id') || import.meta.env.VITE_GHL_LOCATION_ID || '';
  });

  const testConnection = useTestConnection();

  // Social accounts from GHL
  const { data: socialAccountsData, isLoading: isLoadingSocialAccounts } = useSocialAccounts();
  const socialAccounts = socialAccountsData?.accounts || [];

  // Calculator defaults
  const { data: calculatorDefaultsData, isLoading: isLoadingDefaults } = useCalculatorDefaults();
  const updateCalculatorDefaults = useUpdateCalculatorDefaults();
  const [localDefaults, setLocalDefaults] = useState<Partial<CalculatorDefaults>>({});
  const [hasDefaultsChanges, setHasDefaultsChanges] = useState(false);

  // Matching preferences
  const { data: matchingPreferencesData, isLoading: isLoadingMatchingPrefs } = useMatchingPreferences();
  const updateMatchingPreferences = useUpdateMatchingPreferences();
  const [localBudgetMultiplier, setLocalBudgetMultiplier] = useState<number>(20);
  const [hasMatchingPrefsChanges, setHasMatchingPrefsChanges] = useState(false);

  // Zillow settings
  const [localZillowMaxPrice, setLocalZillowMaxPrice] = useState<number>(275000);
  const [localZillowMinDays, setLocalZillowMinDays] = useState<number>(90);
  const [localZillowKeywords, setLocalZillowKeywords] = useState<string>('seller finance OR owner finance OR bond for deed');
  const [hasZillowChanges, setHasZillowChanges] = useState(false);

  // Affordability formula settings
  const [affordabilitySettings, setAffordabilitySettings] = useState<AffordabilitySettings>(
    DEFAULT_AFFORDABILITY_SETTINGS
  );

  // User Management
  const canManageUsers = currentUser?.isAdmin || currentUser?.role?.toLowerCase() === 'admin' || currentUser?.permissions?.includes('manage-users');
  const [hasAffordabilityChanges, setHasAffordabilityChanges] = useState(false);
  const [testDownPayment, setTestDownPayment] = useState<number>(50000);

  // Match flexibility settings
  const [matchFlexibility, setMatchFlexibility] = useState<ZillowMatchFlexibility>(
    DEFAULT_MATCH_FLEXIBILITY
  );
  const [hasFlexibilityChanges, setHasFlexibilityChanges] = useState(false);

  // Agent profile override toggle
  const [agentProfileOverride, setAgentProfileOverride] = useState(() => isAgentProfileOverrideEnabled());

  // Queue settings
  const { settings: queueSettings, updateSettings: updateQueueSettings } = useQueueSettings();

  // Global Testimonials
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoadingTestimonials, setIsLoadingTestimonials] = useState(true);
  const [isSavingTestimonials, setIsSavingTestimonials] = useState(false);
  const [hasTestimonialChanges, setHasTestimonialChanges] = useState(false);

  // Company Info Settings
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [testimonialSpeed, setTestimonialSpeed] = useState(25);
  const [isLoadingCompanyInfo, setIsLoadingCompanyInfo] = useState(true);
  const [isSavingCompanyInfo, setIsSavingCompanyInfo] = useState(false);
  const [hasCompanyInfoChanges, setHasCompanyInfoChanges] = useState(false);

  // Load testimonials and company info on mount
  useEffect(() => {
    loadTestimonials();
    loadCompanyInfo();
  }, []);

  const loadTestimonials = async () => {
    setIsLoadingTestimonials(true);
    try {
      const response = await fetch('/api/testimonials');
      const data = await response.json();
      if (data.success && data.testimonials) {
        setTestimonials(data.testimonials);
      }
    } catch (error) {
      console.error('Error loading testimonials:', error);
    } finally {
      setIsLoadingTestimonials(false);
    }
  };

  const loadCompanyInfo = async () => {
    setIsLoadingCompanyInfo(true);
    try {
      const response = await fetch('/api/company-info');
      const data = await response.json();
      if (data.success) {
        setCompanyPhone(data.phone || '');
        setCompanyEmail(data.email || '');
        setTestimonialSpeed(data.testimonialSpeed ?? 25);
      }
    } catch (error) {
      console.error('Error loading company info:', error);
    } finally {
      setIsLoadingCompanyInfo(false);
    }
  };

  const handleSaveCompanyInfo = async () => {
    setIsSavingCompanyInfo(true);
    try {
      const response = await fetch('/api/company-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: companyPhone, email: companyEmail, testimonialSpeed }),
      });
      const data = await response.json();
      if (data.success) {
        setHasCompanyInfoChanges(false);
        toast.success('Company info saved!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('Failed to save company info');
    } finally {
      setIsSavingCompanyInfo(false);
    }
  };

  const handleSaveTestimonials = async () => {
    setIsSavingTestimonials(true);
    try {
      const response = await fetch('/api/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testimonials }),
      });
      const data = await response.json();
      if (data.success) {
        setHasTestimonialChanges(false);
        toast.success('Testimonials saved!');
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error('Failed to save testimonials');
    } finally {
      setIsSavingTestimonials(false);
    }
  };

  const addTestimonial = () => {
    setTestimonials([...testimonials, {
      quote: '',
      authorName: '',
      authorTitle: 'Purple Homes Homeowner',
      rating: 5,
    }]);
    setHasTestimonialChanges(true);
  };

  const updateTestimonial = (index: number, field: keyof Testimonial, value: string | number) => {
    const updated = [...testimonials];
    updated[index] = { ...updated[index], [field]: value };
    setTestimonials(updated);
    setHasTestimonialChanges(true);
  };

  const removeTestimonial = (index: number) => {
    setTestimonials(testimonials.filter((_, i) => i !== index));
    setHasTestimonialChanges(true);
  };

  // Sync local defaults when API data loads
  useEffect(() => {
    if (calculatorDefaultsData?.defaults) {
      setLocalDefaults(calculatorDefaultsData.defaults);
    }
  }, [calculatorDefaultsData]);

  // Sync matching preferences when API data loads
  useEffect(() => {
    if (matchingPreferencesData) {
      if (matchingPreferencesData.budgetMultiplier) {
        setLocalBudgetMultiplier(matchingPreferencesData.budgetMultiplier);
      }
      if (matchingPreferencesData.zillowMaxPrice) {
        setLocalZillowMaxPrice(matchingPreferencesData.zillowMaxPrice);
      }
      if (matchingPreferencesData.zillowMinDays) {
        setLocalZillowMinDays(matchingPreferencesData.zillowMinDays);
      }
      if (matchingPreferencesData.zillowKeywords) {
        setLocalZillowKeywords(matchingPreferencesData.zillowKeywords);
      }
      if (matchingPreferencesData.affordability) {
        setAffordabilitySettings(matchingPreferencesData.affordability);
      }
      if (matchingPreferencesData.matchFlexibility) {
        setMatchFlexibility(matchingPreferencesData.matchFlexibility);
      }
    }
  }, [matchingPreferencesData]);

  // Calculate live preview for affordability formula
  const livePreview = useMemo(() => {
    const fixedTotal = calculateFixedTotal(affordabilitySettings);
    const entryFactor = calculateEntryFactor(affordabilitySettings);
    const available = testDownPayment - fixedTotal;
    const maxPrice = calculateMaxAffordablePrice(testDownPayment, affordabilitySettings);

    return {
      fixedTotal,
      entryFactor: (entryFactor * 100).toFixed(1),
      available,
      maxPrice,
    };
  }, [affordabilitySettings, testDownPayment]);

  const handleDefaultChange = (field: keyof CalculatorDefaults, value: number) => {
    setLocalDefaults(prev => ({ ...prev, [field]: value }));
    setHasDefaultsChanges(true);
  };

  const handleSaveCalculatorDefaults = async () => {
    try {
      await updateCalculatorDefaults.mutateAsync(localDefaults as CalculatorDefaults);
      setHasDefaultsChanges(false);
      logSettingsChanged('Calculator Defaults');
      toast.success('Calculator defaults saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save defaults');
    }
  };

  const handleSaveMatchingPreferences = async () => {
    try {
      await updateMatchingPreferences.mutateAsync({ budgetMultiplier: localBudgetMultiplier });
      setHasMatchingPrefsChanges(false);
      logSettingsChanged('Budget Multiplier', `${localBudgetMultiplier}x`);
      toast.success('Matching preferences saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save preferences');
    }
  };

  const handleSaveZillowSettings = async () => {
    try {
      await updateMatchingPreferences.mutateAsync({
        zillowMaxPrice: localZillowMaxPrice,
        zillowMinDays: localZillowMinDays,
        zillowKeywords: localZillowKeywords,
      });
      setHasZillowChanges(false);
      logSettingsChanged('Zillow Search Settings');
      toast.success('Zillow settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    }
  };

  const handleSaveAffordability = async () => {
    try {
      await updateMatchingPreferences.mutateAsync({
        affordability: affordabilitySettings
      });
      setHasAffordabilityChanges(false);
      logSettingsChanged('Affordability Formula');
      toast.success('Affordability settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save affordability settings');
    }
  };

  const handleSaveFlexibility = async () => {
    try {
      await updateMatchingPreferences.mutateAsync({
        matchFlexibility: matchFlexibility
      });
      setHasFlexibilityChanges(false);
      logSettingsChanged('Match Flexibility');
      toast.success('Match flexibility settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save flexibility settings');
    }
  };

  const handleSaveGhlDomain = () => {
    localStorage.setItem('ghl_domain', ghlDomain);
    toast.success('CRM domain saved!');
  };

  const handleSaveGhlLocationIdLocal = () => {
    localStorage.setItem('ghl_location_id', ghlLocationIdLocal);
    toast.success('Location ID saved!');
  };

  const handleTestGhlConnection = async () => {
    try {
      await testConnection.mutateAsync();
      toast.success('HighLevel API connection successful!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your preferences and integrations
        </p>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList>
          <TabsTrigger value="settings" className="gap-2">
            <SettingsIcon className="h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="social" className="gap-2">
            <Share2 className="h-4 w-4" />
            Social Accounts
          </TabsTrigger>
          <TabsTrigger value="ai-performance" className="gap-2">
            <Brain className="h-4 w-4" />
            AI Performance
          </TabsTrigger>
          <TabsTrigger value="company" className="gap-2">
            <MessageSquareQuote className="h-4 w-4" />
            Company Info
          </TabsTrigger>
          {canManageUsers && (
            <TabsTrigger value="team" className="gap-2">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          )}
        </TabsList>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4">

          {/* Integrations Section */}
          <SettingsSection
            title="Integrations"
            icon={Link2}
            defaultOpen={false}
            badge={
              isConnected ? (
                <Badge className="bg-success text-xs">Connected</Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">Disconnected</Badge>
              )
            }
            actions={
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestGhlConnection}
                disabled={testConnection.isPending}
              >
                {testConnection.isPending ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <Wifi className="h-3 w-3" />
                )}
              </Button>
            }
          >
            <div className="space-y-4">
              {/* GHL Connection Status */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  {isConnected ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium text-sm">HighLevel API</p>
                    <p className="text-xs text-muted-foreground">
                      {isConnected ? 'Ready for contacts & opportunities' : 'Check API credentials'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CRM Domain */}
              <div className="space-y-2">
                <Label className="text-sm">CRM Domain</Label>
                <p className="text-xs text-muted-foreground">
                  Custom domain for whitelabeled CRM (e.g., app.reireply.com)
                </p>
                <div className="flex gap-2">
                  <Input
                    value={ghlDomain}
                    onChange={(e) => setGhlDomain(e.target.value)}
                    placeholder="app.gohighlevel.com"
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleSaveGhlDomain}>Save</Button>
                </div>
              </div>

              {/* CRM Location ID */}
              <div className="space-y-2">
                <Label className="text-sm">CRM Location ID</Label>
                <p className="text-xs text-muted-foreground">
                  Used for direct links to opportunities
                </p>
                <div className="flex gap-2">
                  <Input
                    value={ghlLocationIdLocal}
                    onChange={(e) => setGhlLocationIdLocal(e.target.value)}
                    placeholder="abc123..."
                    className="flex-1"
                  />
                  <Button size="sm" onClick={handleSaveGhlLocationIdLocal}>Save</Button>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Display Settings */}
          <SettingsSection title="Display" icon={SettingsIcon}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Properties per page</Label>
                  <Select
                    value={propertiesPerPage.toString()}
                    onValueChange={(v) => setPropertiesPerPage(parseInt(v))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">6</SelectItem>
                      <SelectItem value="9">9</SelectItem>
                      <SelectItem value="12">12</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm">Time zone</Label>
                  <Select
                    value={timezone}
                    onValueChange={(tz) => {
                      setTimezone(tz);
                      logSettingsChanged('Time Zone', tz);
                      toast.success(`Time zone set to ${TIMEZONE_OPTIONS.find(t => t.value === tz)?.label || tz}`);
                    }}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Social Hub Settings */}
          <SettingsSection title="Social Hub" icon={User}>
            <div className="space-y-4">
              {/* Agent Profile Override */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div>
                  <Label className="text-sm font-medium">Use My Agent Profile</Label>
                  <p className="text-sm text-muted-foreground">
                    ON: Your agent info appears on images. OFF: Default Hartman branding.
                  </p>
                </div>
                <Switch
                  checked={agentProfileOverride}
                  onCheckedChange={(checked) => {
                    setAgentProfileOverride(checked);
                    setAgentProfileOverrideEnabled(checked);
                    logSettingsChanged('Agent Profile Override', checked);
                    toast.success(checked ? 'Agent profiles enabled' : 'Using template defaults');
                  }}
                />
              </div>

              {/* Default Platforms */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <Label className="text-sm font-medium">Default Platforms</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Pre-selected platforms when creating new posts
                </p>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map((platform) => {
                    const isSelected = defaultPlatforms.includes(platform.id);
                    return (
                      <button
                        key={platform.id}
                        type="button"
                        onClick={() => {
                          const newPlatforms = isSelected
                            ? defaultPlatforms.filter(p => p !== platform.id)
                            : [...defaultPlatforms, platform.id];
                          setDefaultPlatforms(newPlatforms);
                          logSettingsChanged('Default Platforms', newPlatforms.join(', '));
                        }}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        )}
                      >
                        <span>{platform.icon}</span>
                        {platform.label}
                      </button>
                    );
                  })}
                </div>
                {defaultPlatforms.length === 0 && (
                  <p className="text-xs text-amber-600 mt-2">
                    Select at least one platform
                  </p>
                )}
              </div>
            </div>
          </SettingsSection>

          {/* Queue Configuration */}
          <SettingsSection title="Posting Schedule" icon={Calendar}>
            <div className="space-y-6">
              {/* Posting Days */}
              <div>
                <Label className="text-sm font-medium">Posting Days</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select which days of the week to schedule posts
                </p>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const isSelected = queueSettings.postingDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          const newDays = isSelected
                            ? queueSettings.postingDays.filter(d => d !== day)
                            : [...queueSettings.postingDays, day].sort((a, b) => a - b);
                          updateQueueSettings({ postingDays: newDays });
                          logSettingsChanged('Posting Days', newDays.map(d => DAY_LABELS[d]).join(', '));
                        }}
                        className={cn(
                          'w-10 h-10 rounded-lg text-sm font-medium transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        )}
                      >
                        {DAY_LABELS[day]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <Label className="text-sm font-medium">Posting Times</Label>
                <p className="text-sm text-muted-foreground mb-3">
                  Select preferred times for scheduled posts
                </p>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TIME_SLOTS.map((slot) => {
                    const isSelected = queueSettings.timeSlots.includes(slot.time);
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => {
                          const newSlots = isSelected
                            ? queueSettings.timeSlots.filter(t => t !== slot.time)
                            : [...queueSettings.timeSlots, slot.time].sort();
                          updateQueueSettings({ timeSlots: newSlots });
                          logSettingsChanged('Posting Times', newSlots.join(', '));
                        }}
                        className={cn(
                          'px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                        )}
                      >
                        <span>{slot.icon}</span>
                        <span>{slot.label}</span>
                        <span className="opacity-70">({slot.time})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Max Posts & Min Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Max Posts Per Day</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Limit daily scheduled posts
                  </p>
                  <Select
                    value={queueSettings.maxPostsPerDay.toString()}
                    onValueChange={(v) => {
                      updateQueueSettings({ maxPostsPerDay: parseInt(v) });
                      logSettingsChanged('Max Posts Per Day', v);
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Min Hours Between Posts</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Gap between consecutive posts
                  </p>
                  <Select
                    value={queueSettings.minHoursBetween.toString()}
                    onValueChange={(v) => {
                      updateQueueSettings({ minHoursBetween: parseInt(v) });
                      logSettingsChanged('Min Hours Between Posts', `${v} hours`);
                    }}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hr</SelectItem>
                      <SelectItem value="2">2 hrs</SelectItem>
                      <SelectItem value="3">3 hrs</SelectItem>
                      <SelectItem value="4">4 hrs</SelectItem>
                      <SelectItem value="6">6 hrs</SelectItem>
                      <SelectItem value="8">8 hrs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Info box */}
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                These settings control how Quick Batch schedules posts. Changes apply immediately to new batches.
              </div>
            </div>
          </SettingsSection>

          {/* Matching Preferences */}
          <SettingsSection
            title="Matching Preferences"
            icon={Target}
            actions={
              hasMatchingPrefsChanges && (
                <Button
                  size="sm"
                  onClick={handleSaveMatchingPreferences}
                  disabled={updateMatchingPreferences.isPending}
                >
                  {updateMatchingPreferences.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
              )
            }
          >
            {isLoadingMatchingPrefs ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm">Minimum Down Payment Percentage</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Buyer's down payment must be at least this percentage of the property price
                  </p>
                  <Select
                    value={localBudgetMultiplier.toString()}
                    onValueChange={(v) => {
                      setLocalBudgetMultiplier(parseInt(v));
                      setHasMatchingPrefsChanges(true);
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10%</SelectItem>
                      <SelectItem value="15">15%</SelectItem>
                      <SelectItem value="20">20%</SelectItem>
                      <SelectItem value="25">25%</SelectItem>
                      <SelectItem value="30">30%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  Example: $30,000 down at {localBudgetMultiplier}% → Max: ${Math.round(30000 / (localBudgetMultiplier / 100)).toLocaleString()}
                </p>
              </div>
            )}
          </SettingsSection>

          {/* Zillow Search Settings */}
          <SettingsSection
            title="Zillow Search"
            icon={Home}
            actions={
              hasZillowChanges && (
                <Button
                  size="sm"
                  onClick={handleSaveZillowSettings}
                  disabled={updateMatchingPreferences.isPending}
                >
                  {updateMatchingPreferences.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
              )
            }
          >
            {isLoadingMatchingPrefs ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm">Max Property Price</Label>
                    <Select
                      value={localZillowMaxPrice.toString()}
                      onValueChange={(v) => {
                        setLocalZillowMaxPrice(parseInt(v));
                        setHasZillowChanges(true);
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="200000">$200,000</SelectItem>
                        <SelectItem value="250000">$250,000</SelectItem>
                        <SelectItem value="275000">$275,000</SelectItem>
                        <SelectItem value="300000">$300,000</SelectItem>
                        <SelectItem value="350000">$350,000</SelectItem>
                        <SelectItem value="400000">$400,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Min Days on Market</Label>
                    <Select
                      value={localZillowMinDays.toString()}
                      onValueChange={(v) => {
                        setLocalZillowMinDays(parseInt(v));
                        setHasZillowChanges(true);
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 days</SelectItem>
                        <SelectItem value="60">60 days</SelectItem>
                        <SelectItem value="90">90 days</SelectItem>
                        <SelectItem value="120">120 days</SelectItem>
                        <SelectItem value="180">180 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-sm">Creative Financing Keywords</Label>
                  <Textarea
                    value={localZillowKeywords}
                    onChange={(e) => {
                      setLocalZillowKeywords(e.target.value);
                      setHasZillowChanges(true);
                    }}
                    placeholder="seller finance OR owner finance OR bond for deed"
                    className="mt-1 min-h-[60px]"
                  />
                </div>
              </div>
            )}
          </SettingsSection>

          {/* Affordability Formula */}
          <SettingsSection
            title="Affordability Formula"
            icon={DollarSign}
            actions={
              hasAffordabilityChanges && (
                <Button
                  size="sm"
                  onClick={handleSaveAffordability}
                  disabled={updateMatchingPreferences.isPending}
                >
                  {updateMatchingPreferences.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
              )
            }
          >
            <div className="space-y-4">
              {/* Fixed Costs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Red-Box Costs ($)</Label>
                  <Input
                    type="number"
                    value={affordabilitySettings.fixedOtherCosts}
                    onChange={(e) => {
                      setAffordabilitySettings(s => ({ ...s, fixedOtherCosts: Number(e.target.value) }));
                      setHasAffordabilityChanges(true);
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Loan Fees ($)</Label>
                  <Input
                    type="number"
                    value={affordabilitySettings.fixedLoanFees}
                    onChange={(e) => {
                      setAffordabilitySettings(s => ({ ...s, fixedLoanFees: Number(e.target.value) }));
                      setHasAffordabilityChanges(true);
                    }}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Percentage Costs */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm">Down %</Label>
                  <Input
                    type="number"
                    value={affordabilitySettings.downPaymentPercent}
                    onChange={(e) => {
                      setAffordabilitySettings(s => ({ ...s, downPaymentPercent: Number(e.target.value) }));
                      setHasAffordabilityChanges(true);
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Closing %</Label>
                  <Input
                    type="number"
                    value={affordabilitySettings.closingCostPercent}
                    onChange={(e) => {
                      setAffordabilitySettings(s => ({ ...s, closingCostPercent: Number(e.target.value) }));
                      setHasAffordabilityChanges(true);
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Points %</Label>
                  <Input
                    type="number"
                    value={affordabilitySettings.pointsPercent}
                    onChange={(e) => {
                      setAffordabilitySettings(s => ({ ...s, pointsPercent: Number(e.target.value) }));
                      setHasAffordabilityChanges(true);
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Financed %</Label>
                  <Input
                    type="number"
                    value={affordabilitySettings.pointsFinancedPercent}
                    onChange={(e) => {
                      setAffordabilitySettings(s => ({ ...s, pointsFinancedPercent: Number(e.target.value) }));
                      setHasAffordabilityChanges(true);
                    }}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Adjustments */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Price Buffer ($)</Label>
                  <Input
                    type="number"
                    value={affordabilitySettings.priceBuffer}
                    onChange={(e) => {
                      setAffordabilitySettings(s => ({ ...s, priceBuffer: Number(e.target.value) }));
                      setHasAffordabilityChanges(true);
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm">Min Down Payment ($)</Label>
                  <Input
                    type="number"
                    value={affordabilitySettings.minDownPayment}
                    onChange={(e) => {
                      setAffordabilitySettings(s => ({ ...s, minDownPayment: Number(e.target.value) }));
                      setHasAffordabilityChanges(true);
                    }}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Test with:</Label>
                  <Input
                    type="number"
                    value={testDownPayment}
                    onChange={(e) => setTestDownPayment(Number(e.target.value))}
                    className="w-28 h-8"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Max Affordable:</span>
                  <span className="font-bold text-purple-700 dark:text-purple-300">
                    ${livePreview.maxPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </SettingsSection>

          {/* Match Flexibility */}
          <SettingsSection
            title="Match Flexibility"
            icon={Sliders}
            actions={
              hasFlexibilityChanges && (
                <Button
                  size="sm"
                  onClick={handleSaveFlexibility}
                  disabled={updateMatchingPreferences.isPending}
                >
                  {updateMatchingPreferences.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
              )
            }
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm">Bedrooms</Label>
                  <RadioGroup
                    value={matchFlexibility.bedroomFlex}
                    onValueChange={(v) => {
                      setMatchFlexibility(s => ({ ...s, bedroomFlex: v as 'exact' | 'minus1' | 'minus2' }));
                      setHasFlexibilityChanges(true);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="exact" id="beds-exact" />
                      <label htmlFor="beds-exact" className="text-sm">Exact or more</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="minus1" id="beds-minus1" />
                      <label htmlFor="beds-minus1" className="text-sm">Allow 1 less</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="minus2" id="beds-minus2" />
                      <label htmlFor="beds-minus2" className="text-sm">Allow 2 less</label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Bathrooms</Label>
                  <RadioGroup
                    value={matchFlexibility.bathroomFlex}
                    onValueChange={(v) => {
                      setMatchFlexibility(s => ({ ...s, bathroomFlex: v as 'exact' | 'minus1' | 'minus2' }));
                      setHasFlexibilityChanges(true);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="exact" id="baths-exact" />
                      <label htmlFor="baths-exact" className="text-sm">Exact or more</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="minus1" id="baths-minus1" />
                      <label htmlFor="baths-minus1" className="text-sm">Allow 1 less</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="minus2" id="baths-minus2" />
                      <label htmlFor="baths-minus2" className="text-sm">Allow 2 less</label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Budget Flexibility</Label>
                <RadioGroup
                  value={matchFlexibility.budgetFlexPercent.toString()}
                  onValueChange={(v) => {
                    setMatchFlexibility(s => ({ ...s, budgetFlexPercent: Number(v) as 0 | 5 | 10 | 15 | 20 }));
                    setHasFlexibilityChanges(true);
                  }}
                  className="flex flex-wrap gap-4"
                >
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <div key={pct} className="flex items-center space-x-2">
                      <RadioGroupItem value={pct.toString()} id={`budget-${pct}`} />
                      <label htmlFor={`budget-${pct}`} className="text-sm">
                        {pct === 0 ? 'Exact' : `+${pct}%`}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>
          </SettingsSection>

          {/* Calculator Defaults */}
          <SettingsSection
            title="Calculator Defaults"
            icon={Calculator}
            actions={
              hasDefaultsChanges && (
                <Button
                  size="sm"
                  onClick={handleSaveCalculatorDefaults}
                  disabled={updateCalculatorDefaults.isPending}
                >
                  {updateCalculatorDefaults.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                </Button>
              )
            }
          >
            {isLoadingDefaults ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Purchase & Fees */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Purchase & Fees</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-sm">Wholesale %</Label>
                      <Input
                        type="number"
                        value={localDefaults.wholesaleDiscount ?? 70}
                        onChange={(e) => handleDefaultChange('wholesaleDiscount', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Your Fee ($)</Label>
                      <Input
                        type="number"
                        value={localDefaults.yourFee ?? 5000}
                        onChange={(e) => handleDefaultChange('yourFee', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Credit to Buyer ($)</Label>
                      <Input
                        type="number"
                        value={localDefaults.creditToBuyer ?? 5000}
                        onChange={(e) => handleDefaultChange('creditToBuyer', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Operating */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Operating</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm">War Chest %</Label>
                      <Input
                        type="number"
                        value={localDefaults.warChestPercent ?? 5}
                        onChange={(e) => handleDefaultChange('warChestPercent', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Prop Mgmt %</Label>
                      <Input
                        type="number"
                        value={localDefaults.propertyMgmtPercent ?? 10}
                        onChange={(e) => handleDefaultChange('propertyMgmtPercent', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Funding Loan */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Funding Loan</Label>
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <Label className="text-sm">LTV %</Label>
                      <Input
                        type="number"
                        value={localDefaults.dscrLtvPercent ?? 80}
                        onChange={(e) => handleDefaultChange('dscrLtvPercent', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Rate %</Label>
                      <Input
                        type="number"
                        value={localDefaults.dscrInterestRate ?? 8}
                        onChange={(e) => handleDefaultChange('dscrInterestRate', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Term (Yr)</Label>
                      <Input
                        type="number"
                        value={localDefaults.dscrTermYears ?? 30}
                        onChange={(e) => handleDefaultChange('dscrTermYears', parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Balloon</Label>
                      <Input
                        type="number"
                        value={localDefaults.dscrBalloonYears ?? 5}
                        onChange={(e) => handleDefaultChange('dscrBalloonYears', parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Points</Label>
                      <Input
                        type="number"
                        value={localDefaults.dscrPoints ?? 2}
                        onChange={(e) => handleDefaultChange('dscrPoints', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Wrap Loan */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Wrap Loan</Label>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm">Rate %</Label>
                      <Input
                        type="number"
                        value={localDefaults.wrapInterestRate ?? 10}
                        onChange={(e) => handleDefaultChange('wrapInterestRate', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Term (Yr)</Label>
                      <Input
                        type="number"
                        value={localDefaults.wrapTermYears ?? 30}
                        onChange={(e) => handleDefaultChange('wrapTermYears', parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Balloon</Label>
                      <Input
                        type="number"
                        value={localDefaults.wrapBalloonYears ?? 5}
                        onChange={(e) => handleDefaultChange('wrapBalloonYears', parseInt(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Service ($)</Label>
                      <Input
                        type="number"
                        value={localDefaults.wrapServiceFee ?? 50}
                        onChange={(e) => handleDefaultChange('wrapServiceFee', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Closing Costs */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Closing & Setup</Label>
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <Label className="text-sm">Closing ($)</Label>
                      <Input
                        type="number"
                        value={localDefaults.closingCosts ?? 3000}
                        onChange={(e) => handleDefaultChange('closingCosts', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Appraisal ($)</Label>
                      <Input
                        type="number"
                        value={localDefaults.appraisalCost ?? 500}
                        onChange={(e) => handleDefaultChange('appraisalCost', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">LLC ($)</Label>
                      <Input
                        type="number"
                        value={localDefaults.llcCost ?? 200}
                        onChange={(e) => handleDefaultChange('llcCost', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Servicing ($)</Label>
                      <Input
                        type="number"
                        value={localDefaults.servicingFee ?? 100}
                        onChange={(e) => handleDefaultChange('servicingFee', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">DSCR Fees ($)</Label>
                      <Input
                        type="number"
                        value={localDefaults.dscrFees ?? 1500}
                        onChange={(e) => handleDefaultChange('dscrFees', parseFloat(e.target.value) || 0)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </SettingsSection>

          {/* Notifications */}
          <SettingsSection title="Notifications" icon={Zap}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Email notifications</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Notify on successful posts</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Notify on failed posts</Label>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Daily summary email</Label>
                <Switch />
              </div>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* SOCIAL ACCOUNTS TAB */}
        <TabsContent value="social" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Connected Accounts</CardTitle>
                  <CardDescription>
                    Social media accounts connected via GHL Social Planner
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => window.open('https://app.gohighlevel.com/social-planner/accounts', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Manage in GHL
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingSocialAccounts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : socialAccounts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No social accounts connected.</p>
                  <p className="text-sm mt-1">Connect accounts in GHL Social Planner to see them here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {socialAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center gap-4 p-4 rounded-lg border border-border"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={account.avatar} />
                        <AvatarFallback>
                          {(account.accountName || account.name || 'A').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">{account.accountName || account.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {account.platform}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {account.isActive ? (
                          <Badge className="bg-success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI PERFORMANCE TAB */}
        <TabsContent value="ai-performance" className="space-y-6">
          <AIPerformance />
        </TabsContent>

        {/* COMPANY INFO TAB */}
        <TabsContent value="company" className="space-y-6">
          {/* Company Contact Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-purple-600" />
                    Company Contact Info
                  </CardTitle>
                  <CardDescription>
                    Contact information displayed on funnel pages and marketing materials
                  </CardDescription>
                </div>
                {hasCompanyInfoChanges && (
                  <Button onClick={handleSaveCompanyInfo} disabled={isSavingCompanyInfo}>
                    {isSavingCompanyInfo ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save Changes
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCompanyInfo ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input
                      value={companyPhone}
                      onChange={(e) => {
                        setCompanyPhone(e.target.value);
                        setHasCompanyInfoChanges(true);
                      }}
                      placeholder="(504) 475-0672"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for SMS links in FAQ sections and CTAs
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Email Address</Label>
                    <Input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => {
                        setCompanyEmail(e.target.value);
                        setHasCompanyInfoChanges(true);
                      }}
                      placeholder="info@purplehomesla.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used for contact links on marketing pages
                    </p>
                  </div>
                  <div className="col-span-2 space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Testimonial Scroll Speed</Label>
                        <p className="text-xs text-muted-foreground">
                          How fast testimonials scroll on funnel pages (10 = slow, 50 = fast)
                        </p>
                      </div>
                      <span className="text-sm font-medium text-purple-600 min-w-[3rem] text-right">
                        {testimonialSpeed}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={testimonialSpeed}
                      onChange={(e) => {
                        setTestimonialSpeed(Number(e.target.value));
                        setHasCompanyInfoChanges(true);
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Slower</span>
                      <span>Faster</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Testimonials */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquareQuote className="h-5 w-5 text-purple-600" />
                    Customer Testimonials
                  </CardTitle>
                  <CardDescription>
                    Manage customer testimonials displayed across all property pages
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {hasTestimonialChanges && (
                    <Button onClick={handleSaveTestimonials} disabled={isSavingTestimonials}>
                      {isSavingTestimonials ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  )}
                  <Button onClick={addTestimonial} variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Testimonial
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingTestimonials ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : testimonials.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <MessageSquareQuote className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No testimonials yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Add real customer testimonials to display on your property pages
                  </p>
                  <Button onClick={addTestimonial}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Testimonial
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {testimonials.map((testimonial, index) => (
                    <div key={index} className="relative border rounded-lg p-4 bg-muted/30">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-2 right-2 h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                        onClick={() => removeTestimonial(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="space-y-4 pr-10">
                        {/* Quote */}
                        <div className="space-y-2">
                          <Label>Quote</Label>
                          <Textarea
                            value={testimonial.quote}
                            onChange={(e) => updateTestimonial(index, 'quote', e.target.value)}
                            placeholder="I was rejected by three banks. I felt hopeless. Then Purple Homes helped me find my dream home with owner financing. Now I'm building equity instead of wasting rent!"
                            rows={3}
                            className="resize-none"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          {/* Author Name */}
                          <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                              value={testimonial.authorName}
                              onChange={(e) => updateTestimonial(index, 'authorName', e.target.value)}
                              placeholder="Sarah L."
                            />
                          </div>

                          {/* Author Title */}
                          <div className="space-y-2">
                            <Label>Title (optional)</Label>
                            <Input
                              value={testimonial.authorTitle || ''}
                              onChange={(e) => updateTestimonial(index, 'authorTitle', e.target.value)}
                              placeholder="Proud Homeowner"
                            />
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="space-y-2">
                          <Label>Rating</Label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => updateTestimonial(index, 'rating', star)}
                                className={`p-1 ${
                                  (testimonial.rating || 5) >= star
                                    ? 'text-yellow-500'
                                    : 'text-gray-300 hover:text-yellow-400'
                                }`}
                              >
                                <Star className={`h-6 w-6 ${(testimonial.rating || 5) >= star ? 'fill-current' : ''}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Info */}
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                    These testimonials will be displayed in a scrolling carousel on all property funnel pages.
                    If no testimonials are added here, AI-generated testimonials will be used as fallback.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TEAM TAB */}
        {canManageUsers && (
          <TabsContent value="team" className="space-y-6">
            <TeamManagement enabled={canManageUsers} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

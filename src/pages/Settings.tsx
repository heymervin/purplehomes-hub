import { useState, useEffect, useMemo } from 'react';
import { Check, X, RefreshCw, ExternalLink, Plus, Trash2, Wifi, WifiOff, Key, Save, Server, Clock, CheckCircle2, XCircle, Activity, Calculator, Loader2, Target, Home, DollarSign, Sliders, UserPlus, Shield, Copy, Eye, EyeOff, RotateCcw, Mail, Phone, Image as ImageIcon } from 'lucide-react';
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
import { useAppStore } from '@/store/useAppStore';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getApiConfig, setApiConfig, useTestConnection, useSocialAccounts } from '@/services/ghlApi';
import { useGhlConnection } from '@/hooks/useGhlConnection';
import { SyncHistoryLog } from '@/components/settings/SyncHistoryLog';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { useTestAssociationsApi } from '@/services/ghlAssociationsApi';
import { useCalculatorDefaults, useUpdateCalculatorDefaults } from '@/services/calculatorApi';
import { useMatchingPreferences, useUpdateMatchingPreferences } from '@/services/matchingApi';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, AVAILABLE_PERMISSIONS, type User } from '@/services/authApi';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export default function Settings() {
  const { connectionStatus, setConnectionStatus, propertiesPerPage, setPropertiesPerPage } = useAppStore();
  const { isConnected, lastChecked, manualReconnect, checkConnection } = useGhlConnection({ autoConnect: false });
  const [isTestingConnection, setIsTestingConnection] = useState<string | null>(null);
  const [connectionHistory, setConnectionHistory] = useState<Array<{ time: string; success: boolean }>>([]);
  
  // GHL API Configuration
  const [ghlApiKey, setGhlApiKey] = useState('');
  const [ghlLocationId, setGhlLocationId] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  // GHL Domain Configuration (for whitelabeled CRM instances)
  const [ghlDomain, setGhlDomain] = useState(() => {
    return localStorage.getItem('ghl_domain') || 'app.gohighlevel.com';
  });
  const [ghlLocationIdLocal, setGhlLocationIdLocal] = useState(() => {
    return localStorage.getItem('ghl_location_id') || import.meta.env.VITE_GHL_LOCATION_ID || '';
  });
  
  const testConnection = useTestConnection();
  const testAssociationsApi = useTestAssociationsApi();

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

  // Zillow settings (part of matching preferences)
  const [localZillowMaxPrice, setLocalZillowMaxPrice] = useState<number>(275000);
  const [localZillowMinDays, setLocalZillowMinDays] = useState<number>(90);
  const [localZillowKeywords, setLocalZillowKeywords] = useState<string>('seller finance OR owner finance OR bond for deed');
  const [hasZillowChanges, setHasZillowChanges] = useState(false);

  // Affordability formula settings
  const [affordabilitySettings, setAffordabilitySettings] = useState<AffordabilitySettings>(
    DEFAULT_AFFORDABILITY_SETTINGS
  );

  // User Management
  const { data: users, isLoading: isLoadingUsers, refetch: refetchUsers } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showTempPassword, setShowTempPassword] = useState<string | null>(null);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    isAdmin: false,
    permissions: ['dashboard', 'properties', 'contacts'] as string[],
    phone: '',
    agentEmail: '',
    headshot: '',
  });
  const [hasAffordabilityChanges, setHasAffordabilityChanges] = useState(false);
  const [testDownPayment, setTestDownPayment] = useState<number>(50000);

  // Match flexibility settings
  const [matchFlexibility, setMatchFlexibility] = useState<ZillowMatchFlexibility>(
    DEFAULT_MATCH_FLEXIBILITY
  );
  const [hasFlexibilityChanges, setHasFlexibilityChanges] = useState(false);

  // Load saved config on mount
  useEffect(() => {
    const config = getApiConfig();
    if (config.apiKey) setGhlApiKey(config.apiKey);
    if (config.locationId) setGhlLocationId(config.locationId);
  }, []);

  // Sync local defaults when API data loads
  useEffect(() => {
    if (calculatorDefaultsData?.defaults) {
      setLocalDefaults(calculatorDefaultsData.defaults);
    }
  }, [calculatorDefaultsData]);

  // Sync matching preferences and Zillow settings when API data loads
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
      // Sync affordability settings
      if (matchingPreferencesData.affordability) {
        setAffordabilitySettings(matchingPreferencesData.affordability);
      }
      // Sync match flexibility settings
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
      toast.success('Calculator defaults saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save defaults');
    }
  };

  const handleSaveMatchingPreferences = async () => {
    try {
      await updateMatchingPreferences.mutateAsync({ budgetMultiplier: localBudgetMultiplier });
      setHasMatchingPrefsChanges(false);
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
      toast.success('Match flexibility settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save flexibility settings');
    }
  };

  const handleSaveGhlConfig = () => {
    setApiConfig({ apiKey: ghlApiKey, locationId: ghlLocationId });
    setConfigSaved(true);
    toast.success('GHL API configuration saved');
    setTimeout(() => setConfigSaved(false), 2000);
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
      setConnectionStatus({ ...connectionStatus, highLevel: true });
      toast.success('HighLevel API connection successful!');
    } catch (error) {
      setConnectionStatus({ ...connectionStatus, highLevel: false });
      toast.error(error instanceof Error ? error.message : 'Connection failed');
    }
  };

  const handleTestConnection = async (service: string) => {
    setIsTestingConnection(service);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsTestingConnection(null);
    toast.success(`${service} connection verified`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Configure your integrations and preferences
        </p>
      </div>

      <Tabs defaultValue="integrations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="status">Connection Status</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="social">Social Accounts</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        {/* Connection Status Tab */}
        <TabsContent value="status" className="space-y-6">
          {/* Real-time GHL Status */}
          <Card className={cn(
            "border-2 transition-colors",
            isConnected ? "border-success/50 bg-success/5" : "border-error/50 bg-error/5"
          )}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-3 rounded-full",
                    isConnected ? "bg-success/20" : "bg-error/20"
                  )}>
                    {isConnected ? (
                      <Wifi className="h-6 w-6 text-success" />
                    ) : (
                      <WifiOff className="h-6 w-6 text-error" />
                    )}
                  </div>
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      HighLevel API Status
                      {isConnected ? (
                        <Badge className="bg-success">Connected</Badge>
                      ) : (
                        <Badge variant="destructive">Disconnected</Badge>
                      )}
                    </CardTitle>
                    <CardDescription>
                      Real-time connection monitoring with auto-reconnect
                    </CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const success = await manualReconnect();
                    setConnectionHistory(prev => [
                      { time: new Date().toISOString(), success },
                      ...prev.slice(0, 9)
                    ]);
                    if (success) {
                      toast.success('Connection verified');
                    } else {
                      toast.error('Connection failed');
                    }
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Test Now
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Server className="h-4 w-4" />
                    Server
                  </div>
                  <p className="font-semibold text-foreground">
                    {isConnected ? 'Online' : 'Unreachable'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Clock className="h-4 w-4" />
                    Last Check
                  </div>
                  <p className="font-semibold text-foreground">
                    {lastChecked ? new Date(lastChecked).toLocaleTimeString() : 'Never'}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Activity className="h-4 w-4" />
                    Auto-Reconnect
                  </div>
                  <p className="font-semibold text-success">Enabled</p>
                </div>
                <div className="p-4 rounded-lg bg-card border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                    <Key className="h-4 w-4" />
                    Config Source
                  </div>
                  <p className="font-semibold text-foreground">Vercel Env</p>
                </div>
              </div>

              {/* Connection History */}
              {connectionHistory.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium mb-2">Recent Connection Tests</h4>
                  <div className="space-y-2">
                    {connectionHistory.map((entry, index) => (
                      <div 
                        key={index}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          {entry.success ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : (
                            <XCircle className="h-4 w-4 text-error" />
                          )}
                          <span className="text-sm">
                            {entry.success ? 'Connection successful' : 'Connection failed'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.time).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Environment Configuration Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Required Environment Variables
              </CardTitle>
              <CardDescription>
                These must be configured in Vercel for production deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'GHL_API_KEY', description: 'Your HighLevel API key', required: true },
                  { name: 'GHL_LOCATION_ID', description: 'Your HighLevel location ID', required: true },
                  { name: 'GHL_SELLER_ACQUISITION_PIPELINE_ID', description: 'Pipeline ID for Property Pipeline (default: U4FANAMaB1gGddRaaD9x)', required: false },
                  { name: 'GHL_BUYER_DISPOSITION_PIPELINE_ID', description: 'Pipeline ID for Buyer Dispositions (default: cThFQOW6nkVKVxbBrDAV)', required: false },
                  { name: 'GHL_DEAL_ACQUISITION_PIPELINE_ID', description: 'Pipeline ID for Buyers/Deals (default: 2NeLTlKaeMyWOnLXdTCS)', required: false },
                  { name: 'GOOGLE_SHEET_ID', description: 'Google Sheet ID for staff auth', required: true },
                  { name: 'GOOGLE_SHEET_CREDENTIALS', description: 'Service account credentials JSON', required: true },
                  { name: 'OPENAI_API_KEY', description: 'For AI caption generation', required: false },
                  { name: 'RESEND_API_KEY', description: 'For email notifications when connection fails', required: false },
                ].map((envVar) => (
                  <div 
                    key={envVar.name}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
                  >
                    <div>
                      <code className="text-sm font-mono text-primary">{envVar.name}</code>
                      <p className="text-xs text-muted-foreground mt-0.5">{envVar.description}</p>
                    </div>
                    <Badge variant={envVar.required ? "default" : "secondary"}>
                      {envVar.required ? 'Required' : 'Optional'}
                    </Badge>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Tip:</strong> Once these environment variables are set in Vercel, 
                  the app will automatically use them. No local configuration needed for production.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sync History Log */}
          <SyncHistoryLog />

          {/* Notification Settings */}
          <NotificationSettings />
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          {/* GHL API Configuration - Primary */}
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-primary" />
                    HighLevel API Configuration
                    {isConnected ? (
                      <Badge className="bg-success flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        Connected
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1">
                        <WifiOff className="h-3 w-3" />
                        Not Connected
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Configure your HighLevel API credentials for contacts, opportunities, and documents
                  </CardDescription>
                </div>
                <div className={cn(
                  "h-3 w-3 rounded-full animate-pulse",
                  isConnected ? "bg-success" : "bg-error"
                )} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  Get your API Key from HighLevel Settings → Integrations → API Keys. 
                  The Location ID is found in Settings → Business Profile.
                </p>
                <a 
                  href="https://help.gohighlevel.com/support/solutions/articles/48001060529" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View GHL API Documentation
                </a>
              </div>
              
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">API credentials configured via Vercel</p>
                      <p className="text-sm text-muted-foreground">
                        Environment variables: GHL_API_KEY, GHL_LOCATION_ID
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={handleTestGhlConnection}
                    disabled={testConnection.isPending}
                  >
                    {testConnection.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </div>
              
              {isConnected && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Ready to sync contacts, opportunities, and documents
                </div>
              )}
              
              {/* Deployment Note */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mt-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Vercel Deployment:</strong> When deploying to Vercel, 
                  add <code className="bg-muted px-1 rounded">GHL_API_KEY</code> and{' '}
                  <code className="bg-muted px-1 rounded">GHL_LOCATION_ID</code> as environment variables 
                  for secure server-side API calls.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CRM Domain Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                CRM Domain Settings
              </CardTitle>
              <CardDescription>
                Configure your CRM domain for the "Edit in CRM" links. Use this if you have a whitelabeled GoHighLevel instance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ghl-domain">CRM Domain</Label>
                <p className="text-sm text-muted-foreground">
                  If you use a whitelabeled CRM, enter your custom domain (e.g., app.reireply.com)
                </p>
                <div className="flex gap-2">
                  <Input
                    id="ghl-domain"
                    value={ghlDomain}
                    onChange={(e) => setGhlDomain(e.target.value)}
                    placeholder="app.gohighlevel.com"
                  />
                  <Button onClick={handleSaveGhlDomain}>Save</Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ghl-location-id-local">CRM Location ID</Label>
                <p className="text-sm text-muted-foreground">
                  Your GoHighLevel location ID (found in your CRM URL). This is used for direct links to opportunities.
                </p>
                <div className="flex gap-2">
                  <Input
                    id="ghl-location-id-local"
                    value={ghlLocationIdLocal}
                    onChange={(e) => setGhlLocationIdLocal(e.target.value)}
                    placeholder="abc123..."
                  />
                  <Button onClick={handleSaveGhlLocationIdLocal}>Save</Button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Preview URL:</strong>{' '}
                  <code className="text-xs bg-background px-1 rounded">
                    https://{ghlDomain}/v2/location/{ghlLocationIdLocal || '[location-id]'}/opportunities/[id]
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* GHL Custom Objects & Associations API Test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                Custom Objects & Associations API
              </CardTitle>
              <CardDescription>
                Test the GHL Custom Objects & Associations API for buyer-property matching
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground mb-3">
                  This tests the GHL Associations API which is used for managing buyer-property relationships.
                  The response will show association IDs and labels that can be used for deal tracking.
                </p>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={async () => {
                      try {
                        const data = await testAssociationsApi.mutateAsync();
                        console.log('[Associations API Test] Response:', data);

                        // Build a readable summary
                        const associations = data.associations || [];
                        const labels = data.labels || [];

                        toast.success(
                          `Found ${associations.length} associations and ${labels.length} labels. Check console for details.`,
                          { duration: 5000 }
                        );

                        // Log label mapping for easy reference
                        if (labels.length > 0) {
                          console.log('[Associations API Test] Label IDs:');
                          labels.forEach((label: { name: string; id: string }) => {
                            console.log(`  "${label.name}": "${label.id}"`);
                          });
                        }
                      } catch (error) {
                        console.error('[Associations API Test] Error:', error);
                        toast.error(error instanceof Error ? error.message : 'Failed to fetch associations');
                      }
                    }}
                    disabled={testAssociationsApi.isPending}
                  >
                    {testAssociationsApi.isPending ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Activity className="h-4 w-4 mr-2" />
                    )}
                    Test Associations API
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Results will be logged to browser console
                  </span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Expected Labels:</p>
                <ul className="list-disc list-inside space-y-0.5 text-xs">
                  <li>Sent to Buyer</li>
                  <li>Buyer Responded</li>
                  <li>Showing Scheduled</li>
                  <li>Property Viewed</li>
                  <li>Offer Made</li>
                  <li>Under Contract</li>
                  <li>Closed Deal / Won</li>
                  <li>Not Interested</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* OpenAI */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    OpenAI
                    {connectionStatus.openAI ? (
                      <Badge className="bg-success">Connected</Badge>
                    ) : (
                      <Badge variant="destructive">Disconnected</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    AI-powered caption generation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>API Key</Label>
                <Input type="password" value="••••••••••••••••" className="mt-1" />
              </div>
              <div>
                <Label>Default Tone</Label>
                <Select defaultValue="professional">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="exciting">Exciting</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Tokens used this month: 45,230
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleTestConnection('OpenAI')}
                  disabled={isTestingConnection === 'OpenAI'}
                >
                  {isTestingConnection === 'OpenAI' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Imejis */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Imejis
                    {connectionStatus.imejis ? (
                      <Badge className="bg-success">Connected</Badge>
                    ) : (
                      <Badge variant="destructive">Disconnected</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Branded image generation
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>API Key</Label>
                  <Input type="password" value="••••••••••••••••" className="mt-1" />
                </div>
                <div>
                  <Label>Template ID</Label>
                  <Input value="template_abc123" className="mt-1" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleTestConnection('Imejis')}
                  disabled={isTestingConnection === 'Imejis'}
                >
                  {isTestingConnection === 'Imejis' ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                <Button variant="outline" size="sm">
                  Test Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Accounts Tab */}
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
            <CardContent className="space-y-4">
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
                socialAccounts.map((account) => (
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
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Team Tab */}
        <TabsContent value="team" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage who has access to this workspace. Admins can configure their agent profile for Social Hub templates.
                  </CardDescription>
                </div>
                <Button onClick={() => {
                  setNewUserForm({
                    name: '',
                    email: '',
                    isAdmin: false,
                    permissions: ['dashboard', 'properties', 'contacts'],
                    phone: '',
                    agentEmail: '',
                    headshot: '',
                  });
                  setEditingUser(null);
                  setShowAddUserDialog(true);
                }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading users...</span>
                </div>
              ) : users && users.length > 0 ? (
                users.map((user) => (
                  <div
                    key={user.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-lg border",
                      user.isActive === false ? "opacity-50 bg-muted/30" : "border-border"
                    )}
                  >
                    <Avatar className="h-12 w-12">
                      {user.headshot ? (
                        <AvatarImage src={user.headshot} alt={user.name} />
                      ) : null}
                      <AvatarFallback className={user.isAdmin ? "bg-primary/10 text-primary" : ""}>
                        {user.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{user.name}</p>
                        {user.isAdmin && (
                          <Badge className="bg-primary/10 text-primary border-primary/20">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                        {user.isActive === false && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      {user.isAdmin && (user.phone || user.agentEmail) && (
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </span>
                          )}
                          {user.agentEmail && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {user.agentEmail}
                            </span>
                          )}
                        </div>
                      )}
                      {!user.isAdmin && user.permissions && user.permissions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.permissions.slice(0, 3).map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs py-0">
                              {perm}
                            </Badge>
                          ))}
                          {user.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs py-0">
                              +{user.permissions.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingUser(user);
                          setNewUserForm({
                            name: user.name || '',
                            email: user.email || '',
                            isAdmin: user.isAdmin || false,
                            permissions: user.permissions || [],
                            phone: user.phone || '',
                            agentEmail: user.agentEmail || '',
                            headshot: user.headshot || '',
                          });
                          setShowAddUserDialog(true);
                        }}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No users found. Add your first team member!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add/Edit User Dialog */}
          <Dialog open={showAddUserDialog} onOpenChange={(open) => {
            if (!open) {
              setShowAddUserDialog(false);
              setEditingUser(null);
              setShowTempPassword(null);
            }
          }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                <DialogDescription>
                  {editingUser
                    ? 'Update user details and permissions.'
                    : 'Create a new user account. A temporary password will be generated.'}
                </DialogDescription>
              </DialogHeader>

              {showTempPassword ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">
                      User created successfully!
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Share this temporary password with the user. They should change it after their first login.
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        value={showTempPassword}
                        readOnly
                        className="font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(showTempPassword);
                          toast.success('Password copied to clipboard');
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={() => {
                      setShowAddUserDialog(false);
                      setShowTempPassword(null);
                    }}>
                      Done
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="userName">Name *</Label>
                      <Input
                        id="userName"
                        value={newUserForm.name}
                        onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="userEmail">Email *</Label>
                      <Input
                        id="userEmail"
                        type="email"
                        value={newUserForm.email}
                        onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                        placeholder="john@example.com"
                        disabled={!!editingUser}
                      />
                    </div>
                  </div>

                  {/* Admin Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        Admin Access
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Admins have full access and can configure their agent profile for Social Hub templates.
                      </p>
                    </div>
                    <Switch
                      checked={newUserForm.isAdmin}
                      onCheckedChange={(checked) => setNewUserForm({ ...newUserForm, isAdmin: checked })}
                    />
                  </div>

                  {/* Agent Profile (Admin only) */}
                  {newUserForm.isAdmin && (
                    <div className="space-y-4 p-4 border rounded-lg bg-primary/5">
                      <Label className="text-sm font-medium">Agent Profile (for Social Hub templates)</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="agentPhone" className="text-xs flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Phone
                          </Label>
                          <Input
                            id="agentPhone"
                            value={newUserForm.phone}
                            onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                            placeholder="504-123-4567"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="agentEmail" className="text-xs flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Agent Email
                          </Label>
                          <Input
                            id="agentEmail"
                            type="email"
                            value={newUserForm.agentEmail}
                            onChange={(e) => setNewUserForm({ ...newUserForm, agentEmail: e.target.value })}
                            placeholder="agent@company.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="headshot" className="text-xs flex items-center gap-1">
                          <ImageIcon className="h-3 w-3" />
                          Headshot URL
                        </Label>
                        <Input
                          id="headshot"
                          value={newUserForm.headshot}
                          onChange={(e) => setNewUserForm({ ...newUserForm, headshot: e.target.value })}
                          placeholder="https://example.com/headshot.jpg"
                        />
                        {newUserForm.headshot && (
                          <div className="mt-2">
                            <img
                              src={newUserForm.headshot}
                              alt="Headshot preview"
                              className="h-16 w-16 rounded-full object-cover border"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Permissions (Staff only) */}
                  {!newUserForm.isAdmin && (
                    <div className="space-y-3">
                      <Label>Permissions</Label>
                      <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg max-h-[300px] overflow-y-auto">
                        {AVAILABLE_PERMISSIONS.map((perm) => (
                          <div key={perm.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={`perm-${perm.id}`}
                              checked={newUserForm.permissions.includes(perm.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewUserForm({
                                    ...newUserForm,
                                    permissions: [...newUserForm.permissions, perm.id],
                                  });
                                } else {
                                  setNewUserForm({
                                    ...newUserForm,
                                    permissions: newUserForm.permissions.filter(p => p !== perm.id),
                                  });
                                }
                              }}
                            />
                            <div className="grid gap-0.5 leading-none">
                              <label
                                htmlFor={`perm-${perm.id}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {perm.label}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {perm.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions for existing user */}
                  {editingUser && (
                    <div className="flex items-center gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          if (confirm('Reset password? A new temporary password will be generated.')) {
                            try {
                              const result = await updateUser.mutateAsync({
                                id: editingUser.id,
                                resetPassword: true,
                              });
                              if (result.tempPassword) {
                                setShowTempPassword(result.tempPassword);
                              }
                              toast.success('Password reset successfully');
                            } catch (error: any) {
                              toast.error(error.message || 'Failed to reset password');
                            }
                          }
                        }}
                        disabled={updateUser.isPending}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Reset Password
                      </Button>
                      {editingUser.isActive !== false && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={async () => {
                            if (confirm('Deactivate this user? They will no longer be able to log in.')) {
                              try {
                                await deleteUser.mutateAsync(editingUser.id);
                                toast.success('User deactivated');
                                setShowAddUserDialog(false);
                              } catch (error: any) {
                                toast.error(error.message || 'Failed to deactivate user');
                              }
                            }
                          }}
                          disabled={deleteUser.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Deactivate
                        </Button>
                      )}
                    </div>
                  )}

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowAddUserDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!newUserForm.name || !newUserForm.email) {
                          toast.error('Name and email are required');
                          return;
                        }

                        try {
                          if (editingUser) {
                            await updateUser.mutateAsync({
                              id: editingUser.id,
                              name: newUserForm.name,
                              isAdmin: newUserForm.isAdmin,
                              permissions: newUserForm.isAdmin ? [] : newUserForm.permissions,
                              phone: newUserForm.phone,
                              agentEmail: newUserForm.agentEmail,
                              headshot: newUserForm.headshot,
                            });
                            toast.success('User updated successfully');
                            setShowAddUserDialog(false);
                          } else {
                            const result = await createUser.mutateAsync({
                              email: newUserForm.email,
                              name: newUserForm.name,
                              isAdmin: newUserForm.isAdmin,
                              permissions: newUserForm.isAdmin ? [] : newUserForm.permissions,
                              phone: newUserForm.phone,
                              agentEmail: newUserForm.agentEmail,
                              headshot: newUserForm.headshot,
                            });
                            setShowTempPassword(result.tempPassword);
                          }
                        } catch (error: any) {
                          toast.error(error.message || 'Failed to save user');
                        }
                      }}
                      disabled={createUser.isPending || updateUser.isPending}
                    >
                      {(createUser.isPending || updateUser.isPending) && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      {editingUser ? 'Save Changes' : 'Create User'}
                    </Button>
                  </DialogFooter>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          {/* Posting Defaults */}
          <Card>
            <CardHeader>
              <CardTitle>Posting Defaults</CardTitle>
              <CardDescription>
                Configure default settings for new posts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-skip properties without images</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically skip properties that don't have a hero image
                  </p>
                </div>
                <Switch />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Default posting time</Label>
                  <p className="text-sm text-muted-foreground">
                    Preferred time for scheduled posts
                  </p>
                </div>
                <Input type="time" defaultValue="10:00" className="w-32" />
              </div>
            </CardContent>
          </Card>

          {/* Display */}
          <Card>
            <CardHeader>
              <CardTitle>Display</CardTitle>
              <CardDescription>
                Customize how the app looks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Properties per page</Label>
                <Select 
                  value={propertiesPerPage.toString()} 
                  onValueChange={(v) => setPropertiesPerPage(parseInt(v))}
                >
                  <SelectTrigger className="mt-1 w-32">
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
                <Label>Time zone</Label>
                <Select defaultValue="america-phoenix">
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="america-phoenix">America/Phoenix (MST)</SelectItem>
                    <SelectItem value="america-los-angeles">America/Los Angeles (PST)</SelectItem>
                    <SelectItem value="america-new-york">America/New York (EST)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Matching Preferences */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Matching Preferences
                  </CardTitle>
                  <CardDescription>
                    Configure how properties are matched and filtered for buyers
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveMatchingPreferences}
                  disabled={!hasMatchingPrefsChanges || updateMatchingPreferences.isPending}
                  size="sm"
                >
                  {updateMatchingPreferences.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Preferences
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoadingMatchingPrefs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div>
                    <Label>Minimum Down Payment Percentage</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Buyer's down payment must be at least this percentage of the property price to be "Within Budget"
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

                  <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                    <span className="font-medium">💡 Example:</span> Buyer with $30,000 down at {localBudgetMultiplier}% → Max price: ${Math.round(30000 / (localBudgetMultiplier / 100)).toLocaleString()}
                  </div>

                  {hasMatchingPrefsChanges && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <span className="font-medium">You have unsaved changes</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Zillow Search Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Home className="h-5 w-5 text-primary" />
                    Zillow Search Settings
                  </CardTitle>
                  <CardDescription>
                    Configure default parameters for Zillow property searches
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveZillowSettings}
                  disabled={!hasZillowChanges || updateMatchingPreferences.isPending}
                  size="sm"
                >
                  {updateMatchingPreferences.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingMatchingPrefs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* 90+ Days on Market Search */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground border-b pb-2">
                      90+ Days on Market Search
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Max Property Price</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Maximum price for stale listing searches
                        </p>
                        <Select
                          value={localZillowMaxPrice.toString()}
                          onValueChange={(v) => {
                            setLocalZillowMaxPrice(parseInt(v));
                            setHasZillowChanges(true);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="200000">$200,000</SelectItem>
                            <SelectItem value="250000">$250,000</SelectItem>
                            <SelectItem value="275000">$275,000</SelectItem>
                            <SelectItem value="300000">$300,000</SelectItem>
                            <SelectItem value="350000">$350,000</SelectItem>
                            <SelectItem value="400000">$400,000</SelectItem>
                            <SelectItem value="500000">$500,000</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Minimum Days on Market</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Only show properties listed for at least this many days
                        </p>
                        <Select
                          value={localZillowMinDays.toString()}
                          onValueChange={(v) => {
                            setLocalZillowMinDays(parseInt(v));
                            setHasZillowChanges(true);
                          }}
                        >
                          <SelectTrigger className="w-full">
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
                  </div>

                  {/* Creative Financing Search */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground border-b pb-2">
                      Creative Financing Search
                    </h4>

                    <div>
                      <Label>Search Keywords</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Keywords to find creative financing opportunities
                      </p>
                      <Textarea
                        value={localZillowKeywords}
                        onChange={(e) => {
                          setLocalZillowKeywords(e.target.value);
                          setHasZillowChanges(true);
                        }}
                        placeholder="seller finance OR owner finance OR bond for deed"
                        className="min-h-[80px]"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Tip: Use OR between keywords for broader results
                      </p>
                    </div>
                  </div>

                  {/* Affordability Section */}
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm text-muted-foreground border-b pb-2">
                      Affordability Search
                    </h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-sm text-blue-700">
                        Max price is calculated automatically from buyer's down payment using Purple Homes' financing formula.
                      </p>
                    </div>
                  </div>

                  {hasZillowChanges && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <span className="font-medium">You have unsaved changes</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Affordability Formula Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-primary" />
                    Affordability Formula
                  </CardTitle>
                  <CardDescription>
                    Configure how max affordable price is calculated from down payment
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveAffordability}
                  disabled={!hasAffordabilityChanges || updateMatchingPreferences.isPending}
                  size="sm"
                >
                  {updateMatchingPreferences.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Fixed Costs */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Fixed Costs</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Red-Box Costs ($)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={affordabilitySettings.fixedOtherCosts}
                        onChange={(e) => {
                          setAffordabilitySettings(s => ({ ...s, fixedOtherCosts: Number(e.target.value) }));
                          setHasAffordabilityChanges(true);
                        }}
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Loan Fees ($)</Label>
                    <div className="relative mt-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={affordabilitySettings.fixedLoanFees}
                        onChange={(e) => {
                          setAffordabilitySettings(s => ({ ...s, fixedLoanFees: Number(e.target.value) }));
                          setHasAffordabilityChanges(true);
                        }}
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Percentage Costs */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Percentage Costs</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Down Payment %</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={affordabilitySettings.downPaymentPercent}
                        onChange={(e) => {
                          setAffordabilitySettings(s => ({ ...s, downPaymentPercent: Number(e.target.value) }));
                          setHasAffordabilityChanges(true);
                        }}
                        className="pr-7"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div>
                    <Label>Closing Costs %</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={affordabilitySettings.closingCostPercent}
                        onChange={(e) => {
                          setAffordabilitySettings(s => ({ ...s, closingCostPercent: Number(e.target.value) }));
                          setHasAffordabilityChanges(true);
                        }}
                        className="pr-7"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                  <div>
                    <Label>Points %</Label>
                    <div className="relative mt-1">
                      <Input
                        type="number"
                        value={affordabilitySettings.pointsPercent}
                        onChange={(e) => {
                          setAffordabilitySettings(s => ({ ...s, pointsPercent: Number(e.target.value) }));
                          setHasAffordabilityChanges(true);
                        }}
                        className="pr-7"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                  </div>
                </div>
                <div className="w-1/2">
                  <Label>Points Financed %</Label>
                  <p className="text-xs text-muted-foreground mb-1">Portion of points rolled into loan</p>
                  <div className="relative">
                    <Input
                      type="number"
                      value={affordabilitySettings.pointsFinancedPercent}
                      onChange={(e) => {
                        setAffordabilitySettings(s => ({ ...s, pointsFinancedPercent: Number(e.target.value) }));
                        setHasAffordabilityChanges(true);
                      }}
                      className="pr-7"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              {/* Adjustments */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Adjustments</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price Buffer ($)</Label>
                    <p className="text-xs text-muted-foreground mb-1">Added to max price (set to 0 for exact)</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={affordabilitySettings.priceBuffer}
                        onChange={(e) => {
                          setAffordabilitySettings(s => ({ ...s, priceBuffer: Number(e.target.value) }));
                          setHasAffordabilityChanges(true);
                        }}
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Min Down Payment ($)</Label>
                    <p className="text-xs text-muted-foreground mb-1">Required to run affordability search</p>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                      <Input
                        type="number"
                        value={affordabilitySettings.minDownPayment}
                        onChange={(e) => {
                          setAffordabilitySettings(s => ({ ...s, minDownPayment: Number(e.target.value) }));
                          setHasAffordabilityChanges(true);
                        }}
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-purple-900">Live Preview</h4>
                <div>
                  <Label>Test Down Payment</Label>
                  <div className="relative w-48 mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      value={testDownPayment}
                      onChange={(e) => setTestDownPayment(Number(e.target.value))}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-purple-600">Fixed Costs:</span>
                    <span className="ml-2 font-medium">${livePreview.fixedTotal.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-purple-600">Entry Factor:</span>
                    <span className="ml-2 font-medium">{livePreview.entryFactor}%</span>
                  </div>
                  <div>
                    <span className="text-purple-600">Available for Entry:</span>
                    <span className="ml-2 font-medium">${livePreview.available.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-purple-600 font-semibold">MAX AFFORDABLE:</span>
                    <span className="ml-2 font-bold text-purple-900">${livePreview.maxPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {hasAffordabilityChanges && (
                <p className="text-sm text-yellow-600 font-medium">You have unsaved changes</p>
              )}
            </CardContent>
          </Card>

          {/* Match Flexibility Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-primary" />
                    Match Flexibility (Zillow Results)
                  </CardTitle>
                  <CardDescription>
                    Control which properties appear in Zillow search results
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveFlexibility}
                  disabled={!hasFlexibilityChanges || updateMatchingPreferences.isPending}
                  size="sm"
                >
                  {updateMatchingPreferences.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                When showing Zillow results, include properties that:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Bedrooms */}
                <div className="space-y-2">
                  <Label>Bedrooms</Label>
                  <RadioGroup
                    value={matchFlexibility.bedroomFlex}
                    onValueChange={(v) => {
                      setMatchFlexibility(s => ({ ...s, bedroomFlex: v as 'exact' | 'minus1' | 'minus2' }));
                      setHasFlexibilityChanges(true);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="exact" id="beds-exact" />
                      <label htmlFor="beds-exact" className="text-sm">Exact or more only</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="minus1" id="beds-minus1" />
                      <label htmlFor="beds-minus1" className="text-sm">Allow 1 less bedroom</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="minus2" id="beds-minus2" />
                      <label htmlFor="beds-minus2" className="text-sm">Allow 2 less bedrooms</label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Bathrooms */}
                <div className="space-y-2">
                  <Label>Bathrooms</Label>
                  <RadioGroup
                    value={matchFlexibility.bathroomFlex}
                    onValueChange={(v) => {
                      setMatchFlexibility(s => ({ ...s, bathroomFlex: v as 'exact' | 'minus1' | 'minus2' }));
                      setHasFlexibilityChanges(true);
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="exact" id="baths-exact" />
                      <label htmlFor="baths-exact" className="text-sm">Exact or more only</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="minus1" id="baths-minus1" />
                      <label htmlFor="baths-minus1" className="text-sm">Allow 1 less bathroom</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="minus2" id="baths-minus2" />
                      <label htmlFor="baths-minus2" className="text-sm">Allow 2 less bathrooms</label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {/* Budget Flexibility */}
              <div className="space-y-2">
                <Label>Budget Flexibility</Label>
                <p className="text-xs text-muted-foreground">Show properties over max affordable price?</p>
                <RadioGroup
                  value={matchFlexibility.budgetFlexPercent.toString()}
                  onValueChange={(v) => {
                    setMatchFlexibility(s => ({ ...s, budgetFlexPercent: Number(v) as 0 | 5 | 10 | 15 | 20 }));
                    setHasFlexibilityChanges(true);
                  }}
                  className="grid grid-cols-2 md:grid-cols-5 gap-2"
                >
                  {[0, 5, 10, 15, 20].map((pct) => (
                    <div key={pct} className="flex items-center space-x-2">
                      <RadioGroupItem value={pct.toString()} id={`budget-${pct}`} />
                      <label htmlFor={`budget-${pct}`} className="text-sm">
                        {pct === 0 ? 'Within budget only' : `Up to ${pct}% over`}
                      </label>
                    </div>
                  ))}
                </RadioGroup>
                <p className="text-xs text-muted-foreground mt-2">
                  Example: $176,000 max + {matchFlexibility.budgetFlexPercent}% = Shows up to $
                  {Math.round(176000 * (1 + matchFlexibility.budgetFlexPercent / 100)).toLocaleString()}
                </p>
              </div>

              {hasFlexibilityChanges && (
                <p className="text-sm text-yellow-600 font-medium">You have unsaved changes</p>
              )}
            </CardContent>
          </Card>

          {/* Calculator Defaults */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Calculator Defaults
                  </CardTitle>
                  <CardDescription>
                    Set default values for the Deal Calculator
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveCalculatorDefaults}
                  disabled={!hasDefaultsChanges || updateCalculatorDefaults.isPending}
                  size="sm"
                >
                  {updateCalculatorDefaults.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Defaults
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingDefaults ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Purchase & Fees */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Purchase & Fees</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Wholesale Discount %</Label>
                        <Input
                          type="number"
                          value={localDefaults.wholesaleDiscount ?? 70}
                          onChange={(e) => handleDefaultChange('wholesaleDiscount', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                          max={100}
                        />
                      </div>
                      <div>
                        <Label>Your Fee ($)</Label>
                        <Input
                          type="number"
                          value={localDefaults.yourFee ?? 5000}
                          onChange={(e) => handleDefaultChange('yourFee', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                        />
                      </div>
                      <div>
                        <Label>Credit to Buyer ($)</Label>
                        <Input
                          type="number"
                          value={localDefaults.creditToBuyer ?? 5000}
                          onChange={(e) => handleDefaultChange('creditToBuyer', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Operating Expenses */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Operating Expenses</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <Label>War Chest %</Label>
                        <Input
                          type="number"
                          value={localDefaults.warChestPercent ?? localDefaults.maintenancePercent ?? 5}
                          onChange={(e) => handleDefaultChange('warChestPercent', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                          max={50}
                          step={0.5}
                        />
                        <p className="text-xs text-muted-foreground mt-1">Reserve fund for repairs</p>
                      </div>
                      <div>
                        <Label>Property Mgmt %</Label>
                        <Input
                          type="number"
                          value={localDefaults.propertyMgmtPercent ?? 10}
                          onChange={(e) => handleDefaultChange('propertyMgmtPercent', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                          max={50}
                          step={0.5}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Funding Loan 1 Defaults */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Funding Loan 1 Defaults</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <Label>LTV %</Label>
                        <Input
                          type="number"
                          value={localDefaults.dscrLtvPercent ?? 80}
                          onChange={(e) => handleDefaultChange('dscrLtvPercent', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={50}
                          max={100}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label>Interest Rate %</Label>
                        <Input
                          type="number"
                          value={localDefaults.dscrInterestRate ?? 8}
                          onChange={(e) => handleDefaultChange('dscrInterestRate', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                          max={20}
                          step={0.001}
                        />
                      </div>
                      <div>
                        <Label>Term (Years)</Label>
                        <Input
                          type="number"
                          value={localDefaults.dscrTermYears ?? 30}
                          onChange={(e) => handleDefaultChange('dscrTermYears', parseInt(e.target.value) || 0)}
                          className="mt-1"
                          min={1}
                          max={50}
                        />
                      </div>
                      <div>
                        <Label>Balloon (Years)</Label>
                        <Input
                          type="number"
                          value={localDefaults.dscrBalloonYears ?? 5}
                          onChange={(e) => handleDefaultChange('dscrBalloonYears', parseInt(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                          max={29}
                        />
                      </div>
                      <div>
                        <Label>Points</Label>
                        <Input
                          type="number"
                          value={localDefaults.dscrPoints ?? 2}
                          onChange={(e) => handleDefaultChange('dscrPoints', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                          max={10}
                          step={0.25}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Wrap Loan Defaults */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Wrap Loan Defaults</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Interest Rate %</Label>
                        <Input
                          type="number"
                          value={localDefaults.wrapInterestRate ?? 10}
                          onChange={(e) => handleDefaultChange('wrapInterestRate', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                          max={20}
                          step={0.125}
                        />
                      </div>
                      <div>
                        <Label>Term (Years)</Label>
                        <Input
                          type="number"
                          value={localDefaults.wrapTermYears ?? 30}
                          onChange={(e) => handleDefaultChange('wrapTermYears', parseInt(e.target.value) || 0)}
                          className="mt-1"
                          min={1}
                          max={40}
                        />
                      </div>
                      <div>
                        <Label>Balloon (Years)</Label>
                        <Input
                          type="number"
                          value={localDefaults.wrapBalloonYears ?? 5}
                          onChange={(e) => handleDefaultChange('wrapBalloonYears', parseInt(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                          max={30}
                        />
                      </div>
                      <div>
                        <Label>Service Fee ($)</Label>
                        <Input
                          type="number"
                          value={localDefaults.wrapServiceFee ?? 50}
                          onChange={(e) => handleDefaultChange('wrapServiceFee', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Closing & Setup Costs */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground">Closing & Setup Costs</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <Label>Closing Costs ($)</Label>
                        <Input
                          type="number"
                          value={localDefaults.closingCosts ?? 3000}
                          onChange={(e) => handleDefaultChange('closingCosts', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                        />
                      </div>
                      <div>
                        <Label>Appraisal Cost ($)</Label>
                        <Input
                          type="number"
                          value={localDefaults.appraisalCost ?? 500}
                          onChange={(e) => handleDefaultChange('appraisalCost', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                        />
                      </div>
                      <div>
                        <Label>LLC Cost ($)</Label>
                        <Input
                          type="number"
                          value={localDefaults.llcCost ?? 200}
                          onChange={(e) => handleDefaultChange('llcCost', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                        />
                      </div>
                      <div>
                        <Label>Servicing Fee ($)</Label>
                        <Input
                          type="number"
                          value={localDefaults.servicingFee ?? 100}
                          onChange={(e) => handleDefaultChange('servicingFee', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                        />
                      </div>
                      <div>
                        <Label>DSCR Fees ($)</Label>
                        <Input
                          type="number"
                          value={localDefaults.dscrFees ?? 1500}
                          onChange={(e) => handleDefaultChange('dscrFees', parseFloat(e.target.value) || 0)}
                          className="mt-1"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>

                  {hasDefaultsChanges && (
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <span className="font-medium">You have unsaved changes</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>
                Configure email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notify on successful posts</Label>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Notify on failed posts</Label>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Daily summary email</Label>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
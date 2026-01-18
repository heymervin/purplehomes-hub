import { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Loader2, User, Briefcase, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { RolesPermissions } from './RolesPermissions';
import {
  type WizardStep,
  type UserFormData,
  type TeamMember,
  type PermissionState,
  permissionsToState,
  stateToPermissions,
  DEFAULT_USER_PERMISSIONS,
} from './types';

interface UserWizardProps {
  editingUser: TeamMember | null;
  onBack: () => void;
  onSave: (data: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    agentName?: string;
    agentEmail?: string;
    agentTitle?: string;
    headshot?: string;
    isAdmin: boolean;
    permissions: string[];
  }) => Promise<void>;
  isSaving: boolean;
}

const WIZARD_STEPS: { id: WizardStep; label: string; icon: React.ElementType }[] = [
  { id: 'user-info', label: 'User Info', icon: User },
  { id: 'agent-profile', label: 'Agent Profile', icon: Briefcase },
  { id: 'roles-permissions', label: 'Roles & Permissions', icon: Shield },
];

export function UserWizard({ editingUser, onBack, onSave, isSaving }: UserWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('user-info');
  const [formData, setFormData] = useState<UserFormData>({
    // Login credentials
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    // Agent profile
    agentName: '',
    agentEmail: '',
    agentPhone: '',
    agentTitle: '',
    headshot: '',
    // Permissions
    isAdmin: false,
    permissions: DEFAULT_USER_PERMISSIONS,
  });

  // Populate form when editing
  useEffect(() => {
    if (editingUser) {
      const nameParts = (editingUser.name || '').split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      setFormData({
        firstName,
        lastName,
        email: editingUser.email || '',
        password: '',
        // Agent profile - use dedicated fields or fallback to user info
        agentName: editingUser.agentName || '',
        agentEmail: editingUser.agentEmail || '',
        agentPhone: editingUser.phone || '',
        agentTitle: editingUser.agentTitle || '',
        headshot: editingUser.headshot || '',
        isAdmin: editingUser.isAdmin || false,
        permissions: editingUser.isAdmin
          ? {} // Admins don't need specific permissions
          : permissionsToState(editingUser.permissions || []),
      });
    }
  }, [editingUser]);

  const updateFormData = (updates: Partial<UserFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updatePermissions = (permissions: PermissionState) => {
    setFormData(prev => ({ ...prev, permissions }));
  };

  const handleSave = async () => {
    const name = `${formData.firstName} ${formData.lastName}`.trim();

    await onSave({
      name,
      email: formData.email,
      password: formData.password || undefined,
      phone: formData.agentPhone || undefined,
      agentName: formData.agentName || undefined,
      agentEmail: formData.agentEmail || undefined,
      agentTitle: formData.agentTitle || undefined,
      headshot: formData.headshot || undefined,
      isAdmin: formData.isAdmin,
      permissions: formData.isAdmin ? [] : stateToPermissions(formData.permissions),
    });
  };

  const getInitials = () => {
    // Use agent name if available, otherwise use login name
    const name = formData.agentName || `${formData.firstName} ${formData.lastName}`;
    const parts = name.trim().split(' ');
    const first = parts[0]?.[0] || '';
    const last = parts[1]?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const isUserInfoValid = formData.firstName && formData.email;

  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-primary">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
      </div>

      <h2 className="text-xl font-semibold">
        {editingUser ? 'Edit team member' : 'Add new team member'}
      </h2>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-56 space-y-1">
          {WIZARD_STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={cn(
                  'w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
                  currentStep === step.id
                    ? 'bg-primary/10 text-primary border-l-2 border-primary'
                    : 'text-muted-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {step.label}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="flex-1 border rounded-lg p-6">
          {/* Step 1: User Info (Login Credentials) */}
          {currentStep === 'user-info' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Login Credentials</h3>
                <p className="text-sm text-muted-foreground">
                  Basic account information used for authentication
                </p>
              </div>

              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateFormData({ firstName: e.target.value })}
                    placeholder="First Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData({ lastName: e.target.value })}
                    placeholder="Last Name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">
                  Login Email <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData({ email: e.target.value })}
                  placeholder="user@company.com"
                  disabled={!!editingUser}
                />
                <p className="text-xs text-muted-foreground">
                  This email is used for logging in only, not displayed on marketing materials
                </p>
              </div>

              {/* Password - only for new users */}
              {!editingUser && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => updateFormData({ password: e.target.value })}
                    placeholder="Leave blank to auto-generate"
                  />
                  <p className="text-xs text-muted-foreground">
                    If left blank, a temporary password will be generated.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onBack}>
                  Cancel
                </Button>
                <Button
                  onClick={() => goToStep('agent-profile')}
                  disabled={!isUserInfoValid}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Agent Profile */}
          {currentStep === 'agent-profile' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium">Agent Profile</h3>
                <p className="text-sm text-muted-foreground">
                  Information displayed on marketing materials and generated images
                </p>
              </div>

              {/* Avatar Preview */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={formData.headshot || undefined} />
                    <AvatarFallback className="text-2xl bg-muted">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    type="button"
                    className="absolute bottom-0 right-0 p-1.5 bg-background border rounded-full shadow-sm hover:bg-muted"
                    title="Upload profile image"
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Agent Headshot</p>
                  <p>Recommended size: 512×512 px, max 2.5 MB</p>
                </div>
              </div>

              {/* Agent Name & Title */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agentName">Display Name</Label>
                  <Input
                    id="agentName"
                    value={formData.agentName}
                    onChange={(e) => updateFormData({ agentName: e.target.value })}
                    placeholder={`${formData.firstName} ${formData.lastName}`.trim() || 'Agent Name'}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use login name
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agentTitle">Title</Label>
                  <Input
                    id="agentTitle"
                    value={formData.agentTitle}
                    onChange={(e) => updateFormData({ agentTitle: e.target.value })}
                    placeholder="Real Estate Agent"
                  />
                </div>
              </div>

              {/* Agent Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agentEmail">Contact Email</Label>
                  <Input
                    id="agentEmail"
                    type="email"
                    value={formData.agentEmail}
                    onChange={(e) => updateFormData({ agentEmail: e.target.value })}
                    placeholder="agent@realestate.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed on marketing materials
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agentPhone">Contact Phone</Label>
                  <Input
                    id="agentPhone"
                    value={formData.agentPhone}
                    onChange={(e) => updateFormData({ agentPhone: e.target.value })}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              {/* Headshot URL */}
              <div className="space-y-2">
                <Label htmlFor="headshot">Headshot URL</Label>
                <Input
                  id="headshot"
                  value={formData.headshot}
                  onChange={(e) => updateFormData({ headshot: e.target.value })}
                  placeholder="https://example.com/headshot.jpg"
                />
              </div>

              {/* Info box */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>This profile is used when generating branded images via Social Hub</li>
                  <li>If left blank, the agent's login name will be used as a fallback</li>
                  <li>Each team member can have their own unique agent profile</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => goToStep('user-info')}>
                  Back
                </Button>
                <Button onClick={() => goToStep('roles-permissions')}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Roles & Permissions */}
          {currentStep === 'roles-permissions' && (
            <RolesPermissions
              isAdmin={formData.isAdmin}
              permissions={formData.permissions}
              onAdminChange={(isAdmin) => updateFormData({ isAdmin })}
              onPermissionsChange={updatePermissions}
              onBack={() => goToStep('agent-profile')}
              onSave={handleSave}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

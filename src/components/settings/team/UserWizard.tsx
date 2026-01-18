import { useState, useEffect } from 'react';
import { ArrowLeft, Camera, Loader2 } from 'lucide-react';
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
    headshot?: string;
    isAdmin: boolean;
    permissions: string[];
  }) => Promise<void>;
  isSaving: boolean;
}

const WIZARD_STEPS: { id: WizardStep; label: string }[] = [
  { id: 'user-info', label: 'User Info' },
  { id: 'roles-permissions', label: 'Roles & Permissions' },
];

export function UserWizard({ editingUser, onBack, onSave, isSaving }: UserWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('user-info');
  const [formData, setFormData] = useState<UserFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    headshot: '',
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
        phone: editingUser.phone || '',
        password: '',
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
      phone: formData.phone || undefined,
      headshot: formData.headshot || undefined,
      isAdmin: formData.isAdmin,
      permissions: formData.isAdmin ? [] : stateToPermissions(formData.permissions),
    });
  };

  const getInitials = () => {
    const first = formData.firstName?.[0] || '';
    const last = formData.lastName?.[0] || '';
    return (first + last).toUpperCase() || '?';
  };

  const isUserInfoValid = formData.firstName && formData.email;

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
        {editingUser ? 'Edit or manage your team' : 'Add new team member'}
      </h2>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-56 space-y-1">
          {WIZARD_STEPS.map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={cn(
                'w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                currentStep === step.id
                  ? 'bg-primary/10 text-primary border-l-2 border-primary'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              {step.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 border rounded-lg p-6">
          {currentStep === 'user-info' && (
            <div className="space-y-6">
              {/* Profile Image */}
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
                  <p className="font-medium text-foreground">Profile Image</p>
                  <p>The proposed size is 512*512 px no bigger than 2.5 MB</p>
                </div>
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

              {/* Email and Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData({ email: e.target.value })}
                    placeholder="Email"
                    disabled={!!editingUser}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => updateFormData({ phone: e.target.value })}
                    placeholder="Phone"
                  />
                </div>
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

              {/* Headshot URL */}
              <div className="space-y-2">
                <Label htmlFor="headshot">Profile Image URL</Label>
                <Input
                  id="headshot"
                  value={formData.headshot}
                  onChange={(e) => updateFormData({ headshot: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={onBack}>
                  Cancel
                </Button>
                <Button
                  onClick={() => setCurrentStep('roles-permissions')}
                  disabled={!isUserInfoValid}
                >
                  Next
                </Button>
              </div>
            </div>
          )}

          {currentStep === 'roles-permissions' && (
            <RolesPermissions
              isAdmin={formData.isAdmin}
              permissions={formData.permissions}
              onAdminChange={(isAdmin) => updateFormData({ isAdmin })}
              onPermissionsChange={updatePermissions}
              onBack={() => setCurrentStep('user-info')}
              onSave={handleSave}
              isSaving={isSaving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

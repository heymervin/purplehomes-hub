import { useState } from 'react';
import { toast } from 'sonner';
import { StaffList } from './StaffList';
import { UserWizard } from './UserWizard';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, User } from '@/services/authApi';
import { useAuthStore } from '@/store/useAuthStore';
import { logUserCreated, logUserUpdated, logPasswordReset } from '@/store/useActivityStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import type { TeamMember } from './types';

interface TeamManagementProps {
  enabled: boolean;
}

export function TeamManagement({ enabled }: TeamManagementProps) {
  const { data: users, isLoading } = useUsers(enabled);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const { user: currentUser, updateCurrentUser } = useAuthStore();

  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [editingUser, setEditingUser] = useState<TeamMember | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Convert API users to TeamMember format
  const teamMembers: TeamMember[] = (users || []).map((user: User) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    headshot: user.headshot,
    role: user.role || 'User',
    isAdmin: user.isAdmin || false,
    isActive: user.isActive !== false,
    permissions: user.permissions || [],
    agentEmail: user.agentEmail,
    agentName: user.agentName,
    agentTitle: user.agentTitle,
    createdAt: user.createdAt,
  }));

  const handleAddUser = () => {
    setEditingUser(null);
    setView('wizard');
  };

  const handleEditUser = (member: TeamMember) => {
    setEditingUser(member);
    setView('wizard');
  };

  const handleDeleteUser = async (id: string) => {
    try {
      await deleteUser.mutateAsync(id);
      toast.success('User deactivated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to deactivate user');
    }
  };

  const handleBack = () => {
    setEditingUser(null);
    setView('list');
  };

  const handleSave = async (data: {
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
  }) => {
    try {
      if (editingUser) {
        // Update existing user
        await updateUser.mutateAsync({
          id: editingUser.id,
          name: data.name,
          isAdmin: data.isAdmin,
          permissions: data.permissions,
          phone: data.phone,
          agentName: data.agentName,
          agentEmail: data.agentEmail,
          agentTitle: data.agentTitle,
          headshot: data.headshot,
        });

        // If updating current user, refresh their session
        if (currentUser && editingUser.email === currentUser.email) {
          updateCurrentUser({
            name: data.name,
            role: data.isAdmin ? 'Admin' : 'User',
            isAdmin: data.isAdmin,
            permissions: data.isAdmin ? [] : data.permissions,
            agentName: data.agentName,
            agentEmail: data.agentEmail,
            agentTitle: data.agentTitle,
            headshot: data.headshot,
            phone: data.phone,
          });
        }

        // Log the update
        const changes: string[] = [];
        if (data.name !== editingUser.name) changes.push('name');
        if (data.isAdmin !== editingUser.isAdmin) changes.push('role');
        if (data.agentName !== editingUser.agentName) changes.push('agent name');
        if (data.agentEmail !== editingUser.agentEmail) changes.push('agent email');
        if (data.agentTitle !== editingUser.agentTitle) changes.push('agent title');
        logUserUpdated(data.name, changes.length > 0 ? changes : undefined);

        toast.success('User updated successfully');
        setView('list');
        setEditingUser(null);
      } else {
        // Create new user
        const result = await createUser.mutateAsync({
          email: data.email,
          name: data.name,
          password: data.password,
          isAdmin: data.isAdmin,
          permissions: data.permissions,
          phone: data.phone,
          agentName: data.agentName,
          agentEmail: data.agentEmail,
          agentTitle: data.agentTitle,
          headshot: data.headshot,
        });

        // Log the creation
        logUserCreated(data.name, data.email, data.isAdmin);

        // Show temp password if one was generated
        if (result.tempPassword && !data.password) {
          setTempPassword(result.tempPassword);
        } else {
          toast.success('User created successfully');
          setView('list');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to save user');
      throw error;
    }
  };

  const handleCopyPassword = () => {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCloseTempPassword = () => {
    setTempPassword(null);
    setView('list');
  };

  const handleResetPassword = async (userId: string) => {
    setIsResettingPassword(true);
    try {
      const result = await updateUser.mutateAsync({
        id: userId,
        resetPassword: true,
      });

      // Log password reset - find the user name
      const userToReset = teamMembers.find(m => m.id === userId);
      if (userToReset) {
        logPasswordReset(userToReset.name);
      }

      if (result.tempPassword) {
        setTempPassword(result.tempPassword);
      } else {
        toast.success('Password reset successfully');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsResettingPassword(false);
    }
  };

  return (
    <div>
      {view === 'list' ? (
        <StaffList
          members={teamMembers}
          isLoading={isLoading}
          onAddUser={handleAddUser}
          onEditUser={handleEditUser}
          onDeleteUser={handleDeleteUser}
        />
      ) : (
        <UserWizard
          editingUser={editingUser}
          onBack={handleBack}
          onSave={handleSave}
          onResetPassword={handleResetPassword}
          isSaving={createUser.isPending || updateUser.isPending}
          isResettingPassword={isResettingPassword}
        />
      )}

      {/* Temp Password Dialog */}
      <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUser ? 'Password Reset' : 'User Created Successfully'}
            </DialogTitle>
            <DialogDescription>
              Share this temporary password with the user. They should change it after their next login.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Input
              value={tempPassword || ''}
              readOnly
              className="font-mono"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyPassword}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={handleCloseTempPassword}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

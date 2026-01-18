import { useState } from 'react';
import { toast } from 'sonner';
import { StaffList } from './StaffList';
import { UserWizard } from './UserWizard';
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser, User } from '@/services/authApi';
import { useAuthStore } from '@/store/useAuthStore';
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
          headshot: data.headshot,
        });

        // If updating current user, refresh their session
        if (currentUser && editingUser.email === currentUser.email) {
          updateCurrentUser({
            name: data.name,
            role: data.isAdmin ? 'Admin' : 'User',
            isAdmin: data.isAdmin,
            permissions: data.isAdmin ? [] : data.permissions,
          });
        }

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
          headshot: data.headshot,
        });

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
          isSaving={createUser.isPending || updateUser.isPending}
        />
      )}

      {/* Temp Password Dialog */}
      <Dialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>User Created Successfully</DialogTitle>
            <DialogDescription>
              Share this temporary password with the new user. They should change it after their first login.
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

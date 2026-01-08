/**
 * BuyerEditModal - Edit buyer preferences with dual sync to Airtable and GHL
 */

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User,
  Home,
  DollarSign,
  Loader2,
  Save,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useUpdateBuyer, useRematchBuyer } from '@/services/buyersApi';
import type { BuyerRecord, BuyerFormData } from '@/types/buyer';
import {
  LANGUAGE_OPTIONS,
  BEDS_OPTIONS,
  BATHS_OPTIONS,
  buyerToFormData,
  formatCurrency,
} from '@/types/buyer';

interface BuyerEditModalProps {
  buyer: BuyerRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

export function BuyerEditModal({
  buyer,
  open,
  onOpenChange,
  onSaved,
}: BuyerEditModalProps) {
  const updateBuyer = useUpdateBuyer();
  const rematchBuyer = useRematchBuyer();

  // Form state
  const [formData, setFormData] = useState<BuyerFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    language: 'English',
    desiredBeds: '',
    desiredBaths: '',
    preferredLocation: '',
    preferredZipCodes: '',
    city: '',
    state: '',
    buyerType: '',
    downPayment: '',
    monthlyIncome: '',
    monthlyLiabilities: '',
    qualified: false,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('contact');
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  // Initialize form when buyer changes
  useEffect(() => {
    if (buyer) {
      setFormData(buyerToFormData(buyer));
      setHasChanges(false);
      setActiveTab('contact');
    }
  }, [buyer]);

  // Update form field
  const updateField = (field: keyof BuyerFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // Handle currency input with formatting
  const handleCurrencyChange = (field: keyof BuyerFormData, value: string) => {
    updateField(field, formatCurrency(value));
  };

  // Handle save
  const handleSave = async () => {
    if (!buyer) return;

    try {
      await updateBuyer.mutateAsync({
        recordId: buyer.recordId,
        contactId: buyer.contactId,
        fields: formData,
        syncToGhl: true,
      });

      toast.success('Buyer saved & synced to GHL');
      setHasChanges(false);
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  // Handle save & re-match
  const handleSaveAndRematch = async () => {
    if (!buyer) return;

    try {
      await updateBuyer.mutateAsync({
        recordId: buyer.recordId,
        contactId: buyer.contactId,
        fields: formData,
        syncToGhl: true,
      });

      toast.success('Buyer saved, running matching...');
      setHasChanges(false);

      await rematchBuyer.mutateAsync(buyer.recordId);
      toast.success('Matching complete!');
      onSaved?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save or re-match');
    }
  };

  // Handle close attempt
  const handleCloseAttempt = () => {
    if (hasChanges) {
      setShowCloseWarning(true);
    } else {
      onOpenChange(false);
    }
  };

  // Confirm discard changes
  const handleConfirmClose = () => {
    setShowCloseWarning(false);
    setHasChanges(false);
    onOpenChange(false);
  };

  if (!buyer) return null;

  const isLoading = updateBuyer.isPending || rematchBuyer.isPending;

  return (
    <>
      <Dialog open={open} onOpenChange={handleCloseAttempt}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Edit Buyer: {buyer.firstName} {buyer.lastName}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-4">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="contact" className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  Contact
                </TabsTrigger>
                <TabsTrigger value="preferences" className="flex items-center gap-1">
                  <Home className="h-4 w-4" />
                  Preferences
                </TabsTrigger>
                <TabsTrigger value="financials" className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  Financials
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6 py-4">
              {/* Contact Info Tab */}
              <TabsContent value="contact" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => updateField('firstName', e.target.value)}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) => updateField('lastName', e.target.value)}
                      placeholder="Smith"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField('email', e.target.value)}
                      placeholder="john@email.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={formData.language}
                    onValueChange={(v) => updateField('language', v as 'English' | 'Spanish')}
                  >
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* Preferences Tab */}
              <TabsContent value="preferences" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="desiredBeds">Bedrooms</Label>
                    <Select
                      value={formData.desiredBeds}
                      onValueChange={(v) => updateField('desiredBeds', v)}
                    >
                      <SelectTrigger id="desiredBeds">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BEDS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desiredBaths">Bathrooms</Label>
                    <Select
                      value={formData.desiredBaths}
                      onValueChange={(v) => updateField('desiredBaths', v)}
                    >
                      <SelectTrigger id="desiredBaths">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {BATHS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredLocation">Preferred City</Label>
                  <Input
                    id="preferredLocation"
                    value={formData.preferredLocation}
                    onChange={(e) => updateField('preferredLocation', e.target.value)}
                    placeholder="New Orleans, Metairie, Baton Rouge"
                  />
                  <p className="text-xs text-muted-foreground">Multiple values can be entered, separated by commas</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="preferredZipCodes">Preferred ZIP Codes</Label>
                  <Input
                    id="preferredZipCodes"
                    value={formData.preferredZipCodes}
                    onChange={(e) => updateField('preferredZipCodes', e.target.value)}
                    placeholder="70001, 70002, 70003"
                  />
                  <p className="text-xs text-muted-foreground">Comma-separated ZIP codes</p>
                </div>

              </TabsContent>

              {/* Financials Tab */}
              <TabsContent value="financials" className="mt-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="downPayment">Down Payment</Label>
                    <Input
                      id="downPayment"
                      value={formData.downPayment}
                      onChange={(e) => handleCurrencyChange('downPayment', e.target.value)}
                      placeholder="$40,000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthlyIncome">Monthly Income</Label>
                    <Input
                      id="monthlyIncome"
                      value={formData.monthlyIncome}
                      onChange={(e) => handleCurrencyChange('monthlyIncome', e.target.value)}
                      placeholder="$15,000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyLiabilities">Monthly Liabilities</Label>
                  <Input
                    id="monthlyLiabilities"
                    value={formData.monthlyLiabilities}
                    onChange={(e) => handleCurrencyChange('monthlyLiabilities', e.target.value)}
                    placeholder="$4,000"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-4">
                  <Checkbox
                    id="qualified"
                    checked={formData.qualified}
                    onCheckedChange={(checked) => updateField('qualified', checked === true)}
                  />
                  <Label htmlFor="qualified" className="cursor-pointer">
                    Buyer is qualified for financing
                  </Label>
                </div>
              </TabsContent>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t p-4 flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                {hasChanges && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Unsaved changes
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={handleCloseAttempt} disabled={isLoading}>
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  onClick={handleSaveAndRematch}
                  disabled={isLoading || !hasChanges}
                >
                  {rematchBuyer.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Save & Re-Match
                </Button>
                <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
                  {updateBuyer.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning */}
      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close without saving?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose}>
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

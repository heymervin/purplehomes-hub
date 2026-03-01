import { useState, useMemo } from 'react';
import { Mail, Phone, MapPin, Eye, EyeOff, Bed, Bath, DollarSign, Send, Building2, Maximize2, Tag, X, Plus, Search, Loader2, Check, Calculator, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { SendInventoryModal } from './SendInventoryModal';
import { DealCalculatorModal } from '@/components/calculator';
import { useTags, useUpdateContactTags } from '@/services/ghlApi';
import { useDeleteBuyer } from '@/services/buyersApi';
import { toast } from 'sonner';
import type { Buyer, ChecklistItem } from '@/types';


interface BuyerDetailModalProps {
  buyer: Buyer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdateChecklist: (buyerId: string, section: 'bcClosing' | 'postClose' | 'activeBuyer', itemId: string, completed: boolean) => void;
  onUpdate?: () => void;
}

export function BuyerDetailModal({ buyer, open, onOpenChange, onUpdateChecklist, onUpdate }: BuyerDetailModalProps) {
  const [hideEmpty, setHideEmpty] = useState(false);
  const [sendInventoryOpen, setSendInventoryOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [tagsOpen, setTagsOpen] = useState(false);
  const [savingTagId, setSavingTagId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch all available tags
  const { data: tagsData } = useTags();
  const availableTags = tagsData?.tags || [];

  // Update contact tags mutation
  const updateTagsMutation = useUpdateContactTags();

  // Delete buyer mutation
  const deleteBuyer = useDeleteBuyer();

  // Get current tags from buyer's contact - MUST be before early return
  const currentTags: string[] = useMemo(() => {
    if (!buyer) return [];
    // Try different possible locations for tags
    const tags = (buyer as any).contact?.tags 
      || (buyer as any).contactTags 
      || (buyer as any).tags 
      || [];
    return Array.isArray(tags) ? tags : [];
  }, [buyer]);

  // Early return AFTER all hooks
  if (!buyer) return null;

  const handleDeleteBuyer = async () => {
    const recordId = (buyer as any).recordId || buyer.id;
    const contactId = (buyer as any).contactId || buyer.id;
    if (!recordId) return;

    try {
      await deleteBuyer.mutateAsync({ recordId, contactId });
      toast.success('Buyer deleted successfully');
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onUpdate?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete buyer');
    }
  };

  const filteredAvailableTags = availableTags.filter((tag: any) =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const handleToggleTag = async (tagName: string) => {
    const contactId = (buyer as any).contactId || buyer.id;
    if (!contactId) {
      toast.error('Contact ID not available');
      return;
    }

    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((tag: string) => tag !== tagName)
      : [...currentTags, tagName];
    
    setSavingTagId(tagName);
    
    try {
      await updateTagsMutation.mutateAsync({ contactId, tags: newTags });
      toast.success(currentTags.includes(tagName) ? 'Tag removed' : 'Tag added');
      setTagsOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update tags:', error);
      toast.error('Failed to update tags');
    } finally {
      setSavingTagId(null);
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    const contactId = (buyer as any).contactId || buyer.id;
    if (!contactId) return;
    
    const newTags = currentTags.filter((tag: string) => tag !== tagName);
    
    setSavingTagId(tagName);
    
    try {
      await updateTagsMutation.mutateAsync({ contactId, tags: newTags });
      toast.success('Tag removed');
      onUpdate?.();
    } catch (error) {
      console.error('Failed to remove tag:', error);
      toast.error('Failed to remove tag');
    } finally {
      setSavingTagId(null);
    }
  };

  const contactPrefs = (buyer as any).contactPropertyPreferences || {};
  const hasBeds = contactPrefs.bedCount !== undefined;
  const hasBaths = contactPrefs.bathCount !== undefined;
  const hasSqft = contactPrefs.squareFeet !== undefined;
  const hasPropertyType = contactPrefs.propertyType !== undefined;

  const renderChecklistSection = (
    title: string,
    items: ChecklistItem[],
    section: 'bcClosing' | 'postClose' | 'activeBuyer'
  ) => {
    const displayItems = hideEmpty ? items.filter(item => item.completed) : items;
    const completedCount = items.filter(i => i.completed).length;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-foreground">{title}</h4>
          <span className="text-xs text-muted-foreground">
            {completedCount}/{items.length} completed
          </span>
        </div>
        <div className="space-y-2">
          {displayItems.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <Checkbox
                id={item.id}
                checked={item.completed}
                onCheckedChange={(checked) => 
                  onUpdateChecklist(buyer.id, section, item.id, checked as boolean)
                }
              />
              <label
                htmlFor={item.id}
                className={`text-sm cursor-pointer ${
                  item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                }`}
              >
                {item.label}
              </label>
            </div>
          ))}
          {hideEmpty && displayItems.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No completed items</p>
          )}
        </div>
      </div>
    );
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'under-contract': return 'Under Contract';
      case 'escrow-opened': return 'Escrow Opened';
      case 'closing-scheduled': return 'Closing Scheduled';
      default: return stage;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-status-posted/20 text-status-posted';
      case 'qualified': return 'bg-status-scheduled/20 text-status-scheduled';
      case 'pending': return 'bg-status-pending/20 text-status-pending';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl">{buyer.name}</DialogTitle>
            <DialogDescription className="sr-only">Buyer details and preferences</DialogDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getStatusColor(buyer.status)}>
                {buyer.status}
              </Badge>
              <Badge variant="outline">{buyer.dealType}</Badge>
              <Badge variant="secondary">{getStageLabel(buyer.stage)}</Badge>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-120px)]">
            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{buyer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{buyer.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{buyer.location}</span>
                </div>
              </div>

              <Separator />

              {/* Tags Section */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </h3>
                
                {/* Current Tags */}
                <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border border-border rounded-lg bg-muted/30">
                  {currentTags.length > 0 ? (
                    currentTags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          disabled={savingTagId === tag}
                          className="ml-1 hover:text-destructive rounded-full p-0.5 hover:bg-destructive/10"
                        >
                          {savingTagId === tag ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <X className="h-3 w-3" />
                          )}
                        </button>
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">No tags assigned</span>
                  )}
                </div>

                {/* Add Tags Popover */}
                <Popover open={tagsOpen} onOpenChange={setTagsOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Tags
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-80 p-0" 
                    align="start"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search tags..."
                          value={tagSearch}
                          onChange={(e) => setTagSearch(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto p-2">
                      {filteredAvailableTags.length > 0 ? (
                        <div className="space-y-1">
                          {filteredAvailableTags.map((tag: any) => {
                            const isSelected = currentTags.includes(tag.name);
                            const isSaving = savingTagId === tag.name;
                            
                            return (
                              <div
                                key={tag.id}
                                className={`flex items-center justify-between p-2 hover:bg-muted rounded-md cursor-pointer ${
                                  isSelected ? 'bg-primary/10' : ''
                                }`}
                                onClick={() => !isSaving && handleToggleTag(tag.name)}
                              >
                                <span className="text-sm">{tag.name}</span>
                                {isSaving ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                ) : isSelected ? (
                                  <Check className="h-4 w-4 text-primary" />
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No tags found
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <Separator />

              {/* Buyer Preferences Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Buyer Preferences</h3>
                
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4 space-y-4">
                    {/* Beds & Baths - SHOW FROM CONTACT ONLY */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Bed className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Bedrooms</p>
                          <p className="font-semibold text-lg">
                            {hasBeds ? `${contactPrefs.bedCount} beds` : '-'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Bath className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Bathrooms</p>
                          <p className="font-semibold text-lg">
                            {hasBaths ? `${contactPrefs.bathCount} baths` : '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Square Feet & Property Type */}
                    {(hasSqft || hasPropertyType) && (
                      <div className="grid grid-cols-2 gap-4">
                        {hasSqft && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Maximize2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Square Feet</p>
                              <p className="font-semibold text-lg">{contactPrefs.squareFeet.toLocaleString()} sqft</p>
                            </div>
                          </div>
                        )}
                        {hasPropertyType && (
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Building2 className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Property Type</p>
                              <p className="font-semibold text-lg">{contactPrefs.propertyType}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Price Range - ONLY IF EXISTS */}
                    {(buyer.preferences.minPrice || buyer.preferences.maxPrice) && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <DollarSign className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Price Range</p>
                          <p className="font-semibold">
                            ${buyer.preferences.minPrice?.toLocaleString() || '0'} - ${buyer.preferences.maxPrice?.toLocaleString() || '0'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Zip Codes */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Preferred Zip Codes</p>
                      <div className="flex flex-wrap gap-2">
                        {buyer.preferredZipCodes.map((zip) => (
                          <Badge key={zip} variant="secondary" className="text-sm">
                            {zip}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Matches */}
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <p className="text-2xl font-bold text-primary">{buyer.matches.internal}</p>
                        <p className="text-xs text-muted-foreground">Internal Matches</p>
                      </div>
                      <div className="text-center p-3 bg-background rounded-lg border">
                        <p className="text-2xl font-bold text-status-scheduled">{buyer.matches.external}</p>
                        <p className="text-xs text-muted-foreground">Zillow Matches</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="lg"
                    onClick={() => setSendInventoryOpen(true)}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Property List
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setCalculatorOpen(true)}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Deal Calculator
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Buyer
                </Button>
              </div>

              <Separator />

              {/* Deal Type Selector */}
              <div className="space-y-2">
                <Label>Deal Type</Label>
                <Select defaultValue={buyer.dealType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Deal Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lease Option">Lease Option</SelectItem>
                    <SelectItem value="Bond for Deed">Bond for Deed</SelectItem>
                    <SelectItem value="Assignment">Assignment</SelectItem>
                    <SelectItem value="Traditional Sale">Traditional Sale</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Hide Empty Toggle */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Buyer Closing Checklist</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setHideEmpty(!hideEmpty)}
                  className="text-muted-foreground"
                >
                  {hideEmpty ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                  {hideEmpty ? 'Show All' : 'Hide Empty Fields'}
                </Button>
              </div>

              {/* B-C Closing Checklist */}
              {renderChecklistSection('B-C Closing Checklist', buyer.checklist.bcClosing, 'bcClosing')}

              <Separator />

              {/* Post Close Actions */}
              {renderChecklistSection('Post Close Actions: Checklist', buyer.checklist.postClose, 'postClose')}

              <Separator />

              {/* Active Buyer Checklist */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Active Buyer Checklist</h3>
                
                {renderChecklistSection('Deploy Deal Finder', buyer.checklist.activeBuyer, 'activeBuyer')}

                {/* Sent Buyer Deals for Review */}
                <div className="space-y-2 mt-4">
                  <Label>Sent Buyer Deals for Review</Label>
                  <Textarea
                    placeholder="Sent Buyer Deals for Review"
                    defaultValue={buyer.sentDealsForReview}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Send Inventory Modal */}
      <SendInventoryModal
        buyer={buyer}
        open={sendInventoryOpen}
        onOpenChange={setSendInventoryOpen}
      />

      {/* Deal Calculator Modal */}
      <DealCalculatorModal
        open={calculatorOpen}
        onOpenChange={setCalculatorOpen}
        buyerContactId={(buyer as any).contactId || buyer.id}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Buyer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will also remove related match records and the GHL contact. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteBuyer.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBuyer}
              disabled={deleteBuyer.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteBuyer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Buyer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
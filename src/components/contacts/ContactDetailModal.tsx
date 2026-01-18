import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Phone, MapPin, Building2, Bed, Bath, Maximize2, Tag, Calendar, X, Plus, Search, Loader2, Check, Sparkles, Home, Handshake, ShoppingBag, ExternalLink, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useTags, useUpdateContactTags, useContactRelationships } from '@/services/ghlApi';
import { useRunBuyerMatching } from '@/services/matchingApi';
import { toast } from 'sonner';
import type { Contact } from '@/types';
import { format } from 'date-fns';

interface ContactDetailModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

export function ContactDetailModal({ contact, open, onOpenChange, onUpdate }: ContactDetailModalProps) {
  const navigate = useNavigate();
  const [tagSearch, setTagSearch] = useState('');
  const [tagsOpen, setTagsOpen] = useState(false);
  const [savingTagId, setSavingTagId] = useState<string | null>(null);
  const [localTags, setLocalTags] = useState<string[] | null>(null); // Local state for optimistic updates

  // Fetch all available tags
  const { data: tagsData } = useTags();

  // Fetch contact relationships
  const { data: relationships, isLoading: isLoadingRelationships } = useContactRelationships(contact?.id);
  const availableTags = tagsData?.tags || [];

  // Update contact tags mutation
  const updateTagsMutation = useUpdateContactTags();

  // Run buyer matching mutation
  const runBuyerMatchingMutation = useRunBuyerMatching();

  // Get current tags - use local state if available, otherwise from contact
  const currentTags = useMemo(() => {
    if (localTags !== null) return localTags;
    if (!contact) return [];
    return contact.tags || [];
  }, [localTags, contact]);

  // Reset local tags when contact changes
  useMemo(() => {
    if (contact?.id) {
      setLocalTags(null); // Reset to use contact.tags
    }
  }, [contact?.id]);

  if (!contact) return null;

  const filteredAvailableTags = availableTags.filter((tag) =>
    tag.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  const handleToggleTag = async (tagName: string) => {
    if (!contact.id) {
      toast.error('Contact ID not available');
      return;
    }

    const newTags = currentTags.includes(tagName)
      ? currentTags.filter((tag) => tag !== tagName)
      : [...currentTags, tagName];
    
    setSavingTagId(tagName);
    
    // Optimistic update - update local state immediately
    setLocalTags(newTags);
    
    try {
      await updateTagsMutation.mutateAsync({ contactId: contact.id, tags: newTags });
      toast.success(currentTags.includes(tagName) ? 'Tag removed' : 'Tag added');
      setTagsOpen(false);
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update tags:', error);
      toast.error('Failed to update tags');
      // Rollback on error
      setLocalTags(currentTags);
    } finally {
      setSavingTagId(null);
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    if (!contact.id) return;
    
    const newTags = currentTags.filter((tag) => tag !== tagName);
    
    setSavingTagId(tagName);
    
    // Optimistic update
    setLocalTags(newTags);
    
    try {
      await updateTagsMutation.mutateAsync({ contactId: contact.id, tags: newTags });
      toast.success('Tag removed');
      onUpdate?.();
    } catch (error) {
      console.error('Failed to remove tag:', error);
      toast.error('Failed to remove tag');
      // Rollback
      setLocalTags(currentTags);
    } finally {
      setSavingTagId(null);
    }
  };

  const handleFindMatches = async () => {
    if (!contact?.id) {
      toast.error('Contact ID is required');
      return;
    }

    try {
      const result = await runBuyerMatchingMutation.mutateAsync({
        contactId: contact.id,
        minScore: 60,
      });
      toast.success(result.message);
    } catch (error) {
      console.error('Failed to find matches:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to find matches');
    }
  };


  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'seller': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'buyer': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'agent': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'wholesaler': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/10 text-emerald-500';
      case 'inactive': return 'bg-gray-500/10 text-gray-500';
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'closed': return 'bg-blue-500/10 text-blue-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const hasPropertyPreferences = contact.propertyPreferences && (
    contact.propertyPreferences.bedCount ||
    contact.propertyPreferences.bathCount ||
    contact.propertyPreferences.squareFeet ||
    contact.propertyPreferences.propertyType
  );


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className={`text-lg ${getTypeColor(contact.type)}`}>
                  {getInitials(contact.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl">{contact.name}</DialogTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className={`capitalize ${getTypeColor(contact.type)}`}>
                    {contact.type}
                  </Badge>
                  <Badge className={`capitalize ${getStatusColor(contact.status)}`}>
                    {contact.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Contact Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h3>
            <div className="grid gap-3">
              {contact.email && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="font-medium">{contact.email}</p>
                  </div>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{contact.phone}</p>
                  </div>
                </div>
              )}
              {contact.company && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Company</p>
                    <p className="font-medium">{contact.company}</p>
                  </div>
                </div>
              )}
              {contact.zipCodes && contact.zipCodes.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-2">Zip Codes</p>
                    <div className="flex flex-wrap gap-2">
                      {contact.zipCodes.map((zip) => (
                        <Badge key={zip} variant="secondary" className="text-xs">
                          {zip}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Property Preferences - SHOW FOR ALL CONTACTS IF DATA EXISTS */}
          {hasPropertyPreferences && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Property Preferences</h3>
                <div className="grid grid-cols-2 gap-3">
                  {contact.propertyPreferences?.bedCount && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Bed className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Bedrooms</p>
                        <p className="text-lg font-semibold">{contact.propertyPreferences.bedCount}</p>
                      </div>
                    </div>
                  )}
                  {contact.propertyPreferences?.bathCount && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Bath className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Bathrooms</p>
                        <p className="text-lg font-semibold">{contact.propertyPreferences.bathCount}</p>
                      </div>
                    </div>
                  )}
                  {contact.propertyPreferences?.squareFeet && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Maximize2 className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Square Feet</p>
                        <p className="text-lg font-semibold">{contact.propertyPreferences.squareFeet.toLocaleString()} sqft</p>
                      </div>
                    </div>
                  )}
                  {contact.propertyPreferences?.propertyType && (
                    <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                      <Building2 className="h-6 w-6 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Property Type</p>
                        <p className="text-lg font-semibold">{contact.propertyPreferences.propertyType}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Activity & Stats */}
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Activity & Stats</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Created</p>
                  <p className="font-medium text-sm">{format(new Date(contact.createdAt), 'MMM d, yyyy')}</p>
                </div>
              </div>
              {contact.lastActivityAt && (
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Last Activity</p>
                    <p className="font-medium text-sm">{format(new Date(contact.lastActivityAt), 'MMM d, yyyy')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tags Section - WITH ADD/REMOVE FUNCTIONALITY */}
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Tag className="h-4 w-4" />
              Tags
            </h3>
            
            {/* Current Tags */}
            <div className="flex flex-wrap gap-2 min-h-[40px] p-3 border border-border rounded-lg bg-muted/30">
              {currentTags.length > 0 ? (
                currentTags.map((tag) => (
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
                      {filteredAvailableTags.map((tag) => {
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

          {/* Connected To Section - Shows related properties, deals, buyer dispositions */}
          <Separator />
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              Connected To
            </h3>

            {isLoadingRelationships ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading relationships...</span>
              </div>
            ) : relationships && relationships.totalCount > 0 ? (
              <div className="space-y-2">
                {/* Properties (Seller Acquisition) */}
                {relationships.properties.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Home className="h-3 w-3" />
                      Properties ({relationships.properties.length})
                    </p>
                    {relationships.properties.map((prop) => (
                      <button
                        key={prop.id}
                        onClick={() => {
                          onOpenChange(false);
                          navigate('/property-pipeline');
                        }}
                        className="w-full flex items-center justify-between p-2 bg-orange-500/5 hover:bg-orange-500/10 border border-orange-500/20 rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Home className="h-4 w-4 text-orange-500" />
                          <div>
                            <p className="text-sm font-medium">{prop.name}</p>
                            {prop.value && prop.value > 0 && (
                              <p className="text-xs text-muted-foreground">
                                ${prop.value.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Deals */}
                {relationships.deals.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <Handshake className="h-3 w-3" />
                      Deals ({relationships.deals.length})
                    </p>
                    {relationships.deals.map((deal) => (
                      <button
                        key={deal.id}
                        onClick={() => {
                          onOpenChange(false);
                          navigate('/deal-pipeline');
                        }}
                        className="w-full flex items-center justify-between p-2 bg-green-500/5 hover:bg-green-500/10 border border-green-500/20 rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Handshake className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-sm font-medium">{deal.name}</p>
                            {deal.value && deal.value > 0 && (
                              <p className="text-xs text-muted-foreground">
                                ${deal.value.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Buyer Dispositions */}
                {relationships.buyerDispositions.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                      <ShoppingBag className="h-3 w-3" />
                      Buyer Interests ({relationships.buyerDispositions.length})
                    </p>
                    {relationships.buyerDispositions.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          onOpenChange(false);
                          navigate('/buyer-dispositions');
                        }}
                        className="w-full flex items-center justify-between p-2 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/20 rounded-lg text-left transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <ShoppingBag className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">{item.name}</p>
                            {item.value && item.value > 0 && (
                              <p className="text-xs text-muted-foreground">
                                ${item.value.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-muted/30 rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground text-center">
                  No connections found in pipelines
                </p>
              </div>
            )}
          </div>

          {/* Notes */}
          {contact.notes && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Notes</h3>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm">{contact.notes}</p>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-between items-center gap-2 mt-6 pt-6 border-t">
          <div className="flex items-center gap-2">
            {contact.type === 'buyer' && (
              <Button
                variant="outline"
                onClick={handleFindMatches}
                disabled={runBuyerMatchingMutation.isPending}
              >
                {runBuyerMatchingMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Finding Matches...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Find Matches
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button>
              Edit Contact
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
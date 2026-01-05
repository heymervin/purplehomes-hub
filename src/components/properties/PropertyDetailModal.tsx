import { useState, useEffect, useMemo } from 'react';
import {
  Save, Loader2, Home, Bed, Bath, Square, MapPin, DollarSign,
  Image as ImageIcon, Tag, Calendar, RefreshCw, Calculator,
  Search, Filter, ExternalLink, Settings, Share2, MessageSquare, CheckCircle
} from 'lucide-react';
import { PropertyImageGallery } from './PropertyImageGallery';
import { CustomFieldFolder } from './CustomFieldFolder';
import { CustomFieldInput } from './CustomFieldInput';
import { QuickStatsBar } from './QuickStatsBar';
import { LocationFields } from './LocationFields';
import { FieldSection } from './FieldSection';
import { AICaptionGenerator } from '@/components/social/AICaptionGenerator';
import { groupFieldsByFolder, filterFields, calculateCompletionStats } from '@/lib/customFieldsUtils';
import type { GHLCustomField } from '@/types/customFields';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/ui/status-badge';
import { SocialStatusBadge } from '@/components/ui/social-status-badge';
import { CurrencyInput } from '@/components/ui/currency-input';
import { toast } from 'sonner';
import type { Property, PropertyCondition, PropertyType, PropertyStatus } from '@/types';
import { useUpdateProperty, useCustomFields, useProperty, PROPERTY_CUSTOM_FIELDS, extractCustomFieldValue } from '@/services/ghlApi';
import { useUpdateAirtableProperty } from '@/services/matchingApi';
import { DealCalculatorModal } from '@/components/calculator';

interface PropertyDetailModalProps {
  property: Property | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const PROPERTY_CONDITIONS: PropertyCondition[] = [
  'Excellent', 'Great', 'Good', 'Fair', 'Poor', 'Terrible', 'Needs some Repair'
];

const PROPERTY_TYPES: PropertyType[] = [
  'Single Family', 'Duplex', 'Multi Family', 'Condo', 'Lot',
  'Mobile Home', 'Town House', 'Commercial', 'Triplex', '4-plex'
];

const STATUS_OPTIONS: PropertyStatus[] = [
  'pending', 'posted', 'scheduled', 'skipped', 'deleted', 'processing'
];
// Parse combined city field into separate city, state, zip
function parseCityField(cityField: string | undefined): { city: string; state: string; zip: string } {
  if (!cityField) return { city: '', state: '', zip: '' };

  // Expected format: "Phoenix, AZ 85001" or "Phoenix, AZ" or just "Phoenix"
  const parts = cityField.split(',');
  const city = parts[0]?.trim() || '';

  if (parts.length > 1) {
    const stateZip = parts[1]?.trim() || '';
    const stateZipParts = stateZip.split(' ');
    const state = stateZipParts[0] || '';
    const zip = stateZipParts[1] || '';
    return { city, state, zip };
  }

  return { city, state: '', zip: '' };
}

// Combine separate fields back into city field format
function combineCityField(city: string, state: string, zip: string): string {
  if (!city && !state && !zip) return '';
  let combined = city;
  if (state || zip) {
    combined += state ? `, ${state}` : '';
    combined += zip ? ` ${zip}` : '';
  }
  return combined.trim();
}

export function PropertyDetailModal({
  property: initialProperty,
  open,
  onOpenChange,
  onSaved,
}: PropertyDetailModalProps) {
  const updateProperty = useUpdateProperty();
  const updateAirtableProperty = useUpdateAirtableProperty();

  // Fetch custom field definitions for the folders/inputs
  const { data: customFieldsData, refetch: refetchCustomFields, isLoading: isLoadingCustomFields, error: customFieldsError } = useCustomFields('all');

  // Fetch raw opportunity data to get current custom field values
  const { data: opportunityData } = useProperty(initialProperty?.ghlOpportunityId || '');

  // Local form state
  const [formData, setFormData] = useState<Partial<Property>>({});
  const [locationData, setLocationData] = useState({ city: '', state: '', zip: '' });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);

  // Custom fields tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmptyOnly, setShowEmptyOnly] = useState(false);
  const [modelFilter, setModelFilter] = useState<'all' | 'opportunity' | 'contact'>('all');

  // Populate form when property changes
  useEffect(() => {
    if (initialProperty) {
      console.log('[PropertyDetailModal] Loading property:', {
        propertyCode: initialProperty.propertyCode,
        propertyType: initialProperty.propertyType,
        condition: initialProperty.condition,
        price: initialProperty.price,
        monthlyPayment: initialProperty.monthlyPayment,
        downPayment: initialProperty.downPayment,
      });
      setFormData(initialProperty);

      // Parse combined city field into separate fields
      const parsed = parseCityField(initialProperty.city);
      // Also check if state is already separate
      setLocationData({
        city: parsed.city,
        state: initialProperty.state || parsed.state,
        zip: parsed.zip,
      });

      setHasChanges(false);
    }
  }, [initialProperty]);

  // Populate custom field values from the raw opportunity data
  useEffect(() => {
    if (opportunityData?.opportunity?.customFields) {
      const values: Record<string, string> = {};
      for (const cf of opportunityData.opportunity.customFields) {
        const value = extractCustomFieldValue(cf);
        if (value) {
          values[cf.id] = value;
        }
      }
      console.log('[PropertyDetailModal] Loaded custom field values:', Object.keys(values).length);
      setCustomFieldValues(values);
    }
  }, [opportunityData]);

  // Debug: Log custom fields data
  useEffect(() => {
    console.log('[PropertyDetailModal] Custom fields data:', {
      isLoading: isLoadingCustomFields,
      hasError: !!customFieldsError,
      error: customFieldsError,
      hasData: !!customFieldsData,
      fieldCount: customFieldsData?.customFields?.length || 0,
      fields: customFieldsData?.customFields?.slice(0, 3).map(f => ({ id: f.id, name: f.name }))
    });
  }, [customFieldsData, isLoadingCustomFields, customFieldsError]);

  const handleFieldChange = (field: keyof Property, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleLocationChange = (field: 'city' | 'state' | 'zip', value: string) => {
    setLocationData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleCustomFieldChange = (fieldId: string, value: string) => {
    setCustomFieldValues(prev => ({ ...prev, [fieldId]: value }));
    setHasChanges(true);
  };

  // Handle close attempt with unsaved changes
  const handleCloseAttempt = () => {
    if (hasChanges) {
      setShowCloseWarning(true);
    } else {
      onOpenChange(false);
    }
  };

  // Handle discard
  const handleDiscard = () => {
    setShowCloseWarning(false);
    onOpenChange(false);
  };

  const handleSave = async () => {
    console.log('[PropertyDetailModal] Save attempt:', {
      propertyId: initialProperty?.id,
      ghlOpportunityId: initialProperty?.ghlOpportunityId,
    });

    // Require GHL Opportunity ID to save to GHL
    if (!initialProperty?.ghlOpportunityId) {
      toast.error('Cannot save - property is missing GHL Opportunity ID');
      console.error('[PropertyDetailModal] Missing ghlOpportunityId for property:', initialProperty);
      return;
    }

    try {
      // Combine location data for city field
      const combinedCity = combineCityField(locationData.city, locationData.state, locationData.zip);

      // Build custom fields update for GHL
      const customFieldsUpdate: Record<string, string> = {};

      // Map form data to custom fields
      if (formData.address) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.address] = formData.address;
      if (combinedCity) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.city] = combinedCity;
      if (formData.beds !== undefined) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.beds] = String(formData.beds);
      if (formData.baths !== undefined) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.baths] = String(formData.baths);
      if (formData.sqft !== undefined) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.sqft] = String(formData.sqft);
      if (formData.condition) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.condition] = formData.condition;
      if (formData.propertyType) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.propertyType] = formData.propertyType;
      if (formData.heroImage) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.heroImage] = formData.heroImage;
      if (formData.caption) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.caption] = formData.caption;
      if (formData.downPayment !== undefined) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.downPayment] = String(formData.downPayment);
      if (formData.monthlyPayment !== undefined) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.monthlyPayment] = String(formData.monthlyPayment);

      // Status mapping
      if (formData.status) {
        const statusMap: Record<PropertyStatus, string> = {
          pending: 'SM-Pending',
          posted: 'SM-Posted',
          scheduled: 'SM-Scheduled',
          skipped: 'SM-Skipped',
          deleted: 'SM-Deleted',
          processing: 'SM-Processing',
        };
        customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.status] = statusMap[formData.status];
      }

      // Include any other custom field values
      Object.entries(customFieldValues).forEach(([key, value]) => {
        if (!Object.values(PROPERTY_CUSTOM_FIELDS).includes(key)) {
          customFieldsUpdate[key] = value;
        }
      });

      // Save to GHL (source of truth)
      const ghlPayload = {
        id: initialProperty.ghlOpportunityId,
        monetaryValue: formData.price,
        customFields: customFieldsUpdate,
      };
      console.log('[PropertyDetailModal] Sending GHL update:', ghlPayload);

      const ghlResult = await updateProperty.mutateAsync(ghlPayload);
      console.log('[PropertyDetailModal] GHL update result:', ghlResult);

      // Verify the update was applied by checking the returned customFields
      if (ghlResult?.customFields) {
        console.log('[PropertyDetailModal] GHL returned customFields:', ghlResult.customFields);
      } else {
        console.warn('[PropertyDetailModal] GHL response missing customFields - update may not have applied');
      }

      // Also save to Airtable for immediate UI update (GHL sync takes time)
      if (initialProperty.id) {
        try {
          await updateAirtableProperty.mutateAsync({
            recordId: initialProperty.id,
            fields: {
              address: formData.address,
              city: locationData.city,
              state: locationData.state,
              price: formData.price,
              beds: formData.beds,
              baths: formData.baths,
              sqft: formData.sqft,
              condition: formData.condition,
              propertyType: formData.propertyType,
              monthlyPayment: formData.monthlyPayment,
              downPayment: formData.downPayment,
            },
          });
        } catch (airtableError) {
          // Log but don't fail - GHL update succeeded
          console.warn('[PropertyDetailModal] Airtable update failed:', airtableError);
        }
      }

      toast.success('Property saved!');
      setHasChanges(false);
      onSaved?.();
    } catch (error) {
      console.error('[PropertyDetailModal] Save error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save');
    }
  };

  // Group and filter custom fields by folder
  const { folders, ungroupedFields } = useMemo(() => {
    const allFields: GHLCustomField[] = (customFieldsData?.customFields || []).map(cf => ({
      id: cf.id,
      name: cf.name,
      fieldKey: cf.fieldKey,
      dataType: cf.dataType,
      placeholder: cf.placeholder,
      position: cf.position,
      parentId: cf.parentId,
      isFolder: cf.isFolder,
      // Map GHL's model values to our types ('all' -> 'both')
      model: (cf.model === 'all' ? 'both' : cf.model) as 'contact' | 'opportunity' | 'both' | undefined,
      // GHL returns options as 'picklistOptions'
      options: cf.picklistOptions,
      // Mark as required if field name contains "Required" in parent folder
      required: false, // Will be determined by folder name
    }));
    return groupFieldsByFolder(allFields, modelFilter);
  }, [customFieldsData, modelFilter]);

  // Apply search and empty filter
  const filteredFolders = useMemo(() => {
    return folders.map(folder => ({
      ...folder,
      fields: filterFields(folder.fields, searchQuery).filter(f => {
        if (showEmptyOnly) {
          return !customFieldValues[f.id];
        }
        return true;
      }),
    })).filter(folder => folder.fields.length > 0 || (!searchQuery && !showEmptyOnly));
  }, [folders, searchQuery, showEmptyOnly, customFieldValues]);

  // Calculate completion stats
  const completionStats = useMemo(() => {
    return calculateCompletionStats(folders, ungroupedFields, customFieldValues);
  }, [folders, ungroupedFields, customFieldValues]);

  const property = formData;

  return (
    <Dialog open={open} onOpenChange={handleCloseAttempt}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl font-bold">
                {property.propertyCode || 'Property Details'}
              </DialogTitle>
              {property.status && <StatusBadge status={property.status} />}
              {property.isDemo && (
                <Badge variant="secondary" className="bg-accent">DEMO</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {property.isDemo && (
                <Badge variant="outline" className="text-yellow-500 border-yellow-500/50">
                  Demo Mode
                </Badge>
              )}
              {onSaved && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSaved()}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="max-h-[calc(90vh-180px)]">
            <div className="p-6 space-y-6">
              {/* Image Gallery */}
              <PropertyImageGallery
                images={formData.images || []}
                heroImage={formData.heroImage || '/placeholder.svg'}
                onHeroChange={(url) => handleFieldChange('heroImage', url)}
                onImagesChange={(imgs) => {
                  setFormData(prev => ({ ...prev, images: imgs }));
                  setHasChanges(true);
                }}
              />

              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-purple-50/50 p-1 rounded-lg">
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm rounded-md transition-all"
                  >
                    <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                    Property Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="social"
                    className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm rounded-md transition-all"
                  >
                    <Share2 className="h-4 w-4 mr-2" aria-hidden="true" />
                    Social Media
                  </TabsTrigger>
                  <TabsTrigger
                    value="custom"
                    className="data-[state=active]:bg-white data-[state=active]:text-purple-700 data-[state=active]:shadow-sm rounded-md transition-all"
                  >
                    <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                    Custom Fields
                  </TabsTrigger>
                </TabsList>

                {/* Details Tab */}
                <TabsContent value="details" className="space-y-6 mt-4">
                  {/* Quick Stats Bar */}
                  <QuickStatsBar
                    price={property.price}
                    beds={property.beds}
                    baths={property.baths}
                    sqft={property.sqft}
                    address={property.address}
                  />

                  {/* Location Section */}
                  <LocationFields
                    address={property.address || ''}
                    city={locationData.city}
                    state={locationData.state}
                    zip={locationData.zip}
                    onAddressChange={(v) => handleFieldChange('address', v)}
                    onCityChange={(v) => handleLocationChange('city', v)}
                    onStateChange={(v) => handleLocationChange('state', v)}
                    onZipChange={(v) => handleLocationChange('zip', v)}
                  />

                  {/* Property Specs Section */}
                  <FieldSection title="Property Specs" icon={Home} iconColor="text-blue-600">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="beds">
                          <Bed className="h-4 w-4 inline mr-2" aria-hidden="true" />
                          Bedrooms
                        </Label>
                        <Input
                          id="beds"
                          type="number"
                          min={0}
                          value={property.beds || ''}
                          onChange={(e) => handleFieldChange('beds', parseInt(e.target.value) || undefined)}
                          placeholder="3"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="baths">
                          <Bath className="h-4 w-4 inline mr-2" aria-hidden="true" />
                          Bathrooms
                        </Label>
                        <Input
                          id="baths"
                          type="number"
                          min={0}
                          step={0.5}
                          value={property.baths || ''}
                          onChange={(e) => handleFieldChange('baths', parseFloat(e.target.value) || undefined)}
                          placeholder="2"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sqft">
                          <Square className="h-4 w-4 inline mr-2" aria-hidden="true" />
                          Square Feet
                        </Label>
                        <Input
                          id="sqft"
                          type="number"
                          min={0}
                          value={property.sqft || ''}
                          onChange={(e) => handleFieldChange('sqft', parseInt(e.target.value) || undefined)}
                          placeholder="1,450"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="propertyType">Property Type</Label>
                        <Select
                          value={property.propertyType || ''}
                          onValueChange={(v) => handleFieldChange('propertyType', v as PropertyType)}
                        >
                          <SelectTrigger id="propertyType">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {PROPERTY_TYPES.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Condition - Full Width */}
                    <div className="mt-4">
                      <Label htmlFor="condition">
                        <Tag className="h-4 w-4 inline mr-2" aria-hidden="true" />
                        Condition
                      </Label>
                      <Select
                        value={property.condition || ''}
                        onValueChange={(v) => handleFieldChange('condition', v as PropertyCondition)}
                      >
                        <SelectTrigger id="condition" className="mt-2">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_CONDITIONS.map(cond => (
                            <SelectItem key={cond} value={cond}>{cond}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </FieldSection>

                  {/* Pricing Section */}
                  <FieldSection title="Pricing" icon={DollarSign} iconColor="text-green-600">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <CurrencyInput
                        id="price"
                        label="Listing Price"
                        value={property.price}
                        onChange={(v) => handleFieldChange('price', v)}
                        icon={<DollarSign className="h-4 w-4 text-green-600" aria-hidden="true" />}
                      />

                      <CurrencyInput
                        id="downPayment"
                        label="Down Payment"
                        value={property.downPayment}
                        onChange={(v) => handleFieldChange('downPayment', v)}
                      />

                      <CurrencyInput
                        id="monthlyPayment"
                        label="Monthly Payment"
                        value={property.monthlyPayment}
                        onChange={(v) => handleFieldChange('monthlyPayment', v)}
                      />
                    </div>
                  </FieldSection>
                </TabsContent>

                {/* Social Media Tab */}
                <TabsContent value="social" className="space-y-6 mt-4">
                  {/* Status Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-purple-50/50 rounded-lg border border-purple-100">
                    <div className="flex items-center gap-3">
                      <Share2 className="h-5 w-5 text-purple-600" />
                      <div>
                        <h4 className="font-semibold text-purple-700">Social Media Status</h4>
                        <p className="text-sm text-muted-foreground">Manage social media posting for this property</p>
                      </div>
                    </div>
                    <SocialStatusBadge status={property.status || 'pending'} />
                  </div>

                  {/* Status Selection */}
                  <FieldSection title="Posting Status" icon={Tag} iconColor="text-purple-600">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="socialStatus">Current Status</Label>
                        <Select
                          value={property.status || 'pending'}
                          onValueChange={(v) => handleFieldChange('status', v as PropertyStatus)}
                        >
                          <SelectTrigger id="socialStatus">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map(status => (
                              <SelectItem key={status} value={status}>
                                <span className="capitalize">{status}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Dates Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="scheduledDate">
                            <Calendar className="h-4 w-4 inline mr-2" aria-hidden="true" />
                            Scheduled Date
                          </Label>
                          <Input
                            id="scheduledDate"
                            type="date"
                            value={property.scheduledDate || ''}
                            onChange={(e) => handleFieldChange('scheduledDate', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="postedDate">
                            <CheckCircle className="h-4 w-4 inline mr-2" aria-hidden="true" />
                            Posted Date
                          </Label>
                          <Input
                            id="postedDate"
                            type="date"
                            value={property.postedDate || ''}
                            onChange={(e) => handleFieldChange('postedDate', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </FieldSection>

                  {/* Images Section */}
                  <FieldSection title="Images" icon={ImageIcon} iconColor="text-blue-600">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Hero Image */}
                      <div className="space-y-2">
                        <Label htmlFor="heroImage">Hero Image URL</Label>
                        <Input
                          id="heroImage"
                          value={property.heroImage || ''}
                          onChange={(e) => handleFieldChange('heroImage', e.target.value)}
                          placeholder="https://..."
                        />
                        {property.heroImage && property.heroImage !== '/placeholder.svg' && (
                          <div className="mt-2 rounded-lg overflow-hidden border">
                            <img
                              src={property.heroImage}
                              alt="Hero preview"
                              className="w-full h-32 object-cover"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          </div>
                        )}
                      </div>

                      {/* Branded Image */}
                      <div className="space-y-2">
                        <Label htmlFor="brandedImage">Branded Image URL</Label>
                        <Input
                          id="brandedImage"
                          value={property.brandedImage || ''}
                          onChange={(e) => handleFieldChange('brandedImage', e.target.value)}
                          placeholder="https://..."
                        />
                        {property.brandedImage && (
                          <div className="mt-2 rounded-lg overflow-hidden border">
                            <img
                              src={property.brandedImage}
                              alt="Branded preview"
                              className="w-full h-32 object-cover"
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </FieldSection>

                  {/* Caption Section with AI Generator */}
                  <FieldSection title="Social Caption" icon={MessageSquare} iconColor="text-green-600">
                    <div className="space-y-4">
                      {/* AI Caption Generator */}
                      <div className="flex items-center justify-between">
                        <Label className="text-sm text-muted-foreground">Generate with AI</Label>
                        <AICaptionGenerator
                          property={formData}
                          onCaptionGenerated={(platform, caption) => {
                            handleFieldChange('caption', caption);
                          }}
                        />
                      </div>

                      {/* Caption Textarea */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="socialCaption">Caption Text</Label>
                          <span className="text-xs text-muted-foreground">
                            {(property.caption || '').length} / 2200 characters
                          </span>
                        </div>
                        <Textarea
                          id="socialCaption"
                          value={property.caption || ''}
                          onChange={(e) => handleFieldChange('caption', e.target.value)}
                          placeholder="Write your social media caption here..."
                          className="min-h-[150px]"
                          maxLength={2200}
                        />
                      </div>
                    </div>
                  </FieldSection>
                </TabsContent>

                {/* Custom Fields Tab */}
                <TabsContent value="custom" className="mt-4 space-y-4">
                  {/* Header with Progress */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">GHL Custom Fields</span>
                      <span className="text-sm text-muted-foreground">
                        {completionStats.filledFields}/{completionStats.totalFields} completed
                      </span>
                    </div>
                    <Progress value={completionStats.completionPercent} className="w-32 h-2" />
                  </div>

                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    {/* Search */}
                    <div className="relative flex-1 w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search fields..."
                        className="pl-9"
                      />
                    </div>

                    {/* Model Filter Toggle */}
                    <div className="flex items-center border rounded-lg overflow-hidden text-sm">
                      {(['all', 'opportunity', 'contact'] as const).map((model) => (
                        <button
                          key={model}
                          onClick={() => setModelFilter(model)}
                          className={`px-3 py-1.5 transition-colors capitalize ${
                            model !== 'all' ? 'border-l' : ''
                          } ${
                            modelFilter === model
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-background text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          {model === 'all' ? 'All' : model === 'opportunity' ? 'Opportunity' : 'Contact'}
                        </button>
                      ))}
                    </div>

                    {/* Empty Only Filter */}
                    <Button
                      variant={showEmptyOnly ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setShowEmptyOnly(!showEmptyOnly)}
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Empty Only
                    </Button>

                    {/* Refresh */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => refetchCustomFields()}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Folders */}
                  <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                    {filteredFolders.map((folder, index) => (
                      <CustomFieldFolder
                        key={folder.id}
                        folder={folder}
                        values={customFieldValues}
                        onChange={handleCustomFieldChange}
                        defaultOpen={index === 0}
                      />
                    ))}

                    {/* Ungrouped Fields */}
                    {ungroupedFields.length > 0 && (
                      <div className="rounded-xl border p-4 space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground">Other Fields</h4>
                        {ungroupedFields.map((field) => (
                          <CustomFieldInput
                            key={field.id}
                            field={field}
                            value={customFieldValues[field.id] || ''}
                            onChange={handleCustomFieldChange}
                          />
                        ))}
                      </div>
                    )}

                    {/* Loading State */}
                    {isLoadingCustomFields && (
                      <div className="text-center py-12">
                        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
                        <p className="text-muted-foreground font-medium">Loading custom fields...</p>
                      </div>
                    )}

                    {/* Error State */}
                    {customFieldsError && !isLoadingCustomFields && (
                      <div className="text-center py-12">
                        <Tag className="h-12 w-12 mx-auto text-destructive/30 mb-3" />
                        <p className="text-destructive font-medium">Failed to load custom fields</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {customFieldsError instanceof Error ? customFieldsError.message : 'An error occurred'}
                        </p>
                        <button
                          onClick={() => refetchCustomFields()}
                          className="mt-4 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* Empty State */}
                    {!isLoadingCustomFields && !customFieldsError && filteredFolders.length === 0 && ungroupedFields.length === 0 && (
                      <div className="text-center py-12">
                        <Tag className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                        <p className="text-muted-foreground font-medium">
                          {searchQuery ? 'No fields match your search' : 'No custom fields found'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {searchQuery ? 'Try a different search term' : 'Custom fields from GHL will appear here'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Fields synced from GoHighLevel
                    </p>
                    <a
                      href="https://app.gohighlevel.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Manage in GHL
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-6 border-t bg-gray-50/50">
          {/* Left Side - Secondary Actions */}
          <div className="flex items-center gap-3 order-2 sm:order-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCalculatorOpen(true)}
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Deal Calculator
            </Button>

            {/* Unsaved Changes Indicator */}
            {hasChanges && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse" />
                Unsaved changes
              </Badge>
            )}
          </div>

          {/* Right Side - Primary Actions */}
          <div className="flex items-center justify-end gap-2 order-1 sm:order-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCloseAttempt}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSave}
              disabled={updateProperty.isPending || updateAirtableProperty.isPending || !hasChanges}
              className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 min-w-[140px]"
            >
              {(updateProperty.isPending || updateAirtableProperty.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Unsaved Changes Dialog */}
      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDiscard}
              className="bg-red-600 hover:bg-red-700"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deal Calculator Modal */}
      <DealCalculatorModal
        open={calculatorOpen}
        onOpenChange={setCalculatorOpen}
        property={{
          price: formData.price,
          beds: formData.beds,
          baths: formData.baths,
          sqft: formData.sqft,
          address: formData.address,
          propertyCode: formData.propertyCode,
          recordId: initialProperty?.ghlOpportunityId,
        }}
        onSaved={() => {
          // Optionally refresh data
        }}
      />
    </Dialog>
  );
}

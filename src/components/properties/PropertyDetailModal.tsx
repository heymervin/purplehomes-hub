import { useState, useEffect } from 'react';
import {
  Save, Loader2, Home, Bed, Bath, Square, DollarSign,
  Image as ImageIcon, Tag, Calendar, RefreshCw, Calculator,
  ExternalLink, Share2, MessageSquare, CheckCircle, FileText
} from 'lucide-react';
import { PropertyImageGallery } from './PropertyImageGallery';
import { QuickStatsBar } from './QuickStatsBar';
import { LocationFields } from './LocationFields';
import { FieldSection } from './FieldSection';
import { AICaptionGenerator } from '@/components/social/AICaptionGenerator';
import { getGhlOpportunityUrl } from '@/lib/ghlUrls';
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
import { useUpdateProperty, useProperty, PROPERTY_CUSTOM_FIELDS } from '@/services/ghlApi';
import { useUpdateAirtableProperty } from '@/services/matchingApi';
import { PropertyCalculator } from '@/components/calculator';
import { FunnelContentEditor } from './FunnelContentEditor';

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

  // Fetch raw opportunity data to get current custom field values
  const { data: opportunityData } = useProperty(initialProperty?.ghlOpportunityId || '');

  // Local form state
  const [formData, setFormData] = useState<Partial<Property>>({});
  const [locationData, setLocationData] = useState({ city: '', state: '', zip: '' });
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  // Funnel tab save state
  const [funnelHasChanges, setFunnelHasChanges] = useState(false);
  const [funnelIsSaving, setFunnelIsSaving] = useState(false);
  const [funnelSaveHandler, setFunnelSaveHandler] = useState<(() => void) | null>(null);

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

  const handleFieldChange = (field: keyof Property, value: string | number | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleLocationChange = (field: 'city' | 'state' | 'zip', value: string) => {
    setLocationData(prev => ({ ...prev, [field]: value }));
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
      if (formData.socialMediaPropertyDescription !== undefined) customFieldsUpdate[PROPERTY_CUSTOM_FIELDS.socialMediaDescription] = formData.socialMediaPropertyDescription;
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

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-purple-50/50 dark:bg-purple-950/30 p-1 rounded-lg">
                  <TabsTrigger
                    value="details"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 data-[state=active]:shadow-sm rounded-md transition-all"
                  >
                    <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger
                    value="social"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 data-[state=active]:shadow-sm rounded-md transition-all"
                  >
                    <Share2 className="h-4 w-4 mr-2" aria-hidden="true" />
                    Social
                  </TabsTrigger>
                  <TabsTrigger
                    value="funnel"
                    className="data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-300 data-[state=active]:shadow-sm rounded-md transition-all"
                  >
                    <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
                    Funnel
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

                  {/* Social Media Description - Context for AI */}
                  <FieldSection title="Context for AI" icon={MessageSquare} iconColor="text-green-600">
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Describe property highlights for AI-generated captions. This will be used in the Social Hub when creating posts.
                      </p>

                      {/* Social Media Description Textarea */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="socialMediaDescription">Property Description for Social Media</Label>
                          <span className="text-xs text-muted-foreground">
                            {(formData.socialMediaPropertyDescription || '').length} / 2000 characters
                          </span>
                        </div>
                        <Textarea
                          id="socialMediaDescription"
                          value={formData.socialMediaPropertyDescription || ''}
                          onChange={(e) => handleFieldChange('socialMediaPropertyDescription', e.target.value)}
                          placeholder="E.g., '3bed/2bath, newly renovated kitchen with granite counters, near top-rated schools, owner financing available, ~$1,500/mo, move-in ready!'"
                          className="min-h-[150px]"
                          maxLength={2000}
                        />
                        <p className="text-xs text-muted-foreground">
                          Include: beds, baths, monthly payment, unique features, financing options, and any selling points.
                        </p>
                      </div>
                    </div>
                  </FieldSection>
                </TabsContent>

                {/* Funnel Tab */}
                <TabsContent value="funnel" className="mt-4">
                  <FunnelContentEditor
                    property={property}
                    onSaveStateChange={(hasChanges, isSaving, onSave) => {
                      setFunnelHasChanges(hasChanges);
                      setFunnelIsSaving(isSaving);
                      setFunnelSaveHandler(() => onSave);
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 p-4 sm:p-6 border-t bg-gray-50/50 dark:bg-gray-900/50">
          {/* Left Side - Secondary Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCalculatorOpen(true)}
              className="border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950"
            >
              <Calculator className="h-4 w-4 mr-2" />
              Calculator
            </Button>

            {initialProperty?.ghlOpportunityId && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.open(getGhlOpportunityUrl(initialProperty.ghlOpportunityId!), '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                CRM
              </Button>
            )}
          </div>

          {/* Right Side - Primary Actions */}
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 hidden sm:flex">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse" />
                Unsaved
              </Badge>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCloseAttempt}
            >
              Cancel
            </Button>
            {/* Show appropriate save button based on active tab */}
            {activeTab === 'funnel' ? (
              <Button
                type="button"
                size="sm"
                onClick={() => funnelSaveHandler?.()}
                disabled={funnelIsSaving || !funnelHasChanges}
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
              >
                {funnelIsSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Funnel
                  </>
                )}
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                onClick={handleSave}
                disabled={updateProperty.isPending || updateAirtableProperty.isPending || !hasChanges}
                className="bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700"
              >
                {(updateProperty.isPending || updateAirtableProperty.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            )}
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

      {/* Deal Calculator Modal - saves to Properties table */}
      {initialProperty?.id && (
        <PropertyCalculator
          open={calculatorOpen}
          onOpenChange={setCalculatorOpen}
          property={{
            recordId: initialProperty.id,
            address: formData.address || '',
            listingPrice: formData.price,
            downPayment: formData.downPayment,
            monthlyPayment: formData.monthlyPayment,
          }}
        />
      )}
    </Dialog>
  );
}

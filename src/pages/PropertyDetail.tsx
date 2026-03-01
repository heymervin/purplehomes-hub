import { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bed, 
  Bath, 
  Square, 
  ExternalLink, 
  RefreshCw, 
  Send, 
  Calendar, 
  SkipForward,
  Trash2,
  Image as ImageIcon,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/status-badge';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { demoProperties, mockProperties } from '@/data/mockData.backup';
import { useDeleteProperty } from '@/services/matchingApi';
import { toast } from 'sonner';
import { format } from 'date-fns';

const toneOptions = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'exciting', label: 'Exciting' },
  { value: 'luxury', label: 'Luxury' },
];

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get the referring page from state, default to /properties
  const fromPage = (location.state as { from?: string })?.from || '/properties';
  
  const allProperties = [...demoProperties, ...mockProperties];
  const property = allProperties.find(p => p.id === id);

  const [selectedTone, setSelectedTone] = useState('professional');
  const [caption, setCaption] = useState(property?.caption || '');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [heroImage, setHeroImage] = useState(property?.heroImage || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteProperty = useDeleteProperty();

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground mb-4">Property not found</p>
        <Button onClick={() => navigate('/properties')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Properties
        </Button>
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleRegenerateCaption = async () => {
    setIsRegenerating(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newCaption = `🏠 ${property.beds}BR/${property.baths}BA in ${property.city} - Only ${formatPrice(property.price)}! Perfect investment opportunity with great ROI potential. DM for details! #RealEstate #Wholesale #Arizona`;
    setCaption(newCaption);
    setIsRegenerating(false);
    toast.success('Caption regenerated!');
  };

  const handlePost = async () => {
    if (property.isDemo) {
      toast.error('Cannot post demo properties');
      return;
    }
    
    setIsPosting(true);
    // Simulate posting
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsPosting(false);
    toast.success('Posted successfully!', {
      description: 'Your property has been posted to social media.',
    });
    navigate('/properties');
  };

  const handleImageSelect = (imageUrl: string) => {
    setHeroImage(imageUrl);
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteProperty.mutateAsync(id);
      toast.success('Property deleted successfully');
      navigate('/properties');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete property');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate(fromPage)}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Images & Details */}
        <div className="space-y-6">
          {/* Hero Image */}
          <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
            <img
              src={heroImage}
              alt={property.address}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Image Gallery */}
          {property.images.length > 1 && (
            <div className="grid grid-cols-3 gap-2">
              {property.images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => handleImageSelect(image)}
                  className={`aspect-[4/3] rounded-lg overflow-hidden border-2 transition-all ${
                    heroImage === image ? 'border-primary' : 'border-transparent hover:border-primary/50'
                  }`}
                >
                  <img
                    src={image}
                    alt={`View ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          {/* Property Details Card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="inline-flex items-center rounded-md bg-primary px-2.5 py-1 text-sm font-medium text-primary-foreground">
                    {property.propertyCode}
                  </span>
                  {property.isDemo && (
                    <span className="ml-2 inline-flex items-center rounded-md bg-accent px-2.5 py-1 text-sm font-bold text-accent-foreground">
                      DEMO
                    </span>
                  )}
                </div>
                <StatusBadge status={property.status} />
              </div>

              <h1 className="text-2xl font-bold mb-1">{property.address}</h1>
              <p className="text-muted-foreground mb-4">{property.city}</p>

              <p className="text-4xl font-bold mb-6">{formatPrice(property.price)}</p>

              <div className="flex items-center gap-6 text-muted-foreground mb-6">
                <span className="flex items-center gap-2">
                  <Bed className="h-5 w-5" />
                  {property.beds} beds
                </span>
                <span className="flex items-center gap-2">
                  <Bath className="h-5 w-5" />
                  {property.baths} baths
                </span>
                {property.sqft && (
                  <span className="flex items-center gap-2">
                    <Square className="h-5 w-5" />
                    {property.sqft.toLocaleString()} sqft
                  </span>
                )}
              </div>

              {property.description && (
                <p className="text-muted-foreground mb-6">{property.description}</p>
              )}

              <Button variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                View in CRM
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Caption & Actions */}
        <div className="space-y-6">
          {/* AI Caption Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-accent" />
                AI Caption
              </CardTitle>
              <Select value={selectedTone} onValueChange={setSelectedTone}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {toneOptions.map((tone) => (
                    <SelectItem key={tone.value} value={tone.value}>
                      {tone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Generate a caption for this property..."
                className="min-h-[150px] mb-2"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {caption.length}/2000 characters
                </span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRegenerateCaption}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Caption is cached and won't regenerate unless you click Regenerate
              </p>
            </CardContent>
          </Card>

          {/* Branded Image Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Branded Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              {property.brandedImage ? (
                <div className="aspect-video rounded-lg overflow-hidden bg-muted mb-4">
                  <img
                    src={property.brandedImage}
                    alt="Branded"
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-lg bg-muted flex items-center justify-center mb-4">
                  <p className="text-muted-foreground">No branded image generated</p>
                </div>
              )}
              <Button variant="outline" className="w-full">
                <ImageIcon className="h-4 w-4 mr-2" />
                Generate Branded Image
              </Button>
            </CardContent>
          </Card>

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Pending', completed: true, date: property.createdAt },
                  { label: 'Processing', completed: property.status === 'posted' || property.status === 'scheduled' },
                  { label: property.status === 'scheduled' ? 'Scheduled' : 'Posted', completed: property.status === 'posted' || property.status === 'scheduled', date: property.postedDate || property.scheduledDate },
                ].map((step, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${step.completed ? 'bg-success' : 'bg-muted'}`} />
                    <div className="flex-1">
                      <p className={`text-sm ${step.completed ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {step.label}
                      </p>
                      {step.date && step.completed && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(step.date), 'MMM d, yyyy h:mm a')}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="sticky bottom-6 space-y-3">
            <Button 
              className="w-full gradient-primary text-primary-foreground"
              size="lg"
              onClick={handlePost}
              disabled={property.status !== 'pending' || property.isDemo || isPosting}
            >
              {isPosting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {isPosting ? 'Posting...' : 'Post Now'}
            </Button>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="secondary"
                disabled={property.status !== 'pending'}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Post
              </Button>
              <Button 
                variant="outline"
                disabled={property.status !== 'pending'}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Skip Property
              </Button>
            </div>
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will also remove related match records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteProperty.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteProperty.isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteProperty.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Property'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

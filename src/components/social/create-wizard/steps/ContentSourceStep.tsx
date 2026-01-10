import React from 'react';
import { Building2, ImageIcon, FileText, Info } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAirtableProperties } from '@/services/matchingApi';
import type { WizardState, PostType } from '../types';
import type { Property } from '@/types';

interface ContentSourceStepProps {
  state: WizardState;
  updateState: (updates: Partial<WizardState>) => void;
}

const POST_TYPES: { id: PostType; icon: React.ReactNode; title: string; description: string }[] = [
  {
    id: 'property',
    icon: <Building2 className="h-8 w-8" />,
    title: 'Property Post',
    description: 'Create a post for a specific property listing',
  },
  {
    id: 'custom',
    icon: <ImageIcon className="h-8 w-8" />,
    title: 'Custom Post',
    description: 'Upload your own image (value post, tips, etc.)',
  },
  {
    id: 'text-only',
    icon: <FileText className="h-8 w-8" />,
    title: 'Text Only',
    description: 'Create a post without an image',
  },
];

export default function ContentSourceStep({ state, updateState }: ContentSourceStepProps) {
  const { data: propertiesData, isLoading } = useAirtableProperties(200);
  const [searchQuery, setSearchQuery] = React.useState('');

  // Transform PropertyDetails to Property type
  const properties: Property[] = React.useMemo(() => {
    if (!propertiesData?.properties) return [];
    return propertiesData.properties.map((p) => ({
      id: p.recordId,
      propertyCode: p.propertyCode || '',
      address: p.address || '',
      city: p.city || '',
      state: p.state,
      price: p.price || 0,
      beds: p.beds || 0,
      baths: p.baths || 0,
      sqft: p.sqft,
      heroImage: p.heroImage || '',
      images: p.images || [],
      status: 'pending' as const,
      createdAt: p.createdAt || new Date().toISOString(),
      description: p.notes,
      socialMediaPropertyDescription: p.socialMediaPropertyDescription,
      condition: p.condition as Property['condition'],
      propertyType: p.propertyType as Property['propertyType'],
    }));
  }, [propertiesData]);

  const filteredProperties = React.useMemo(() => {
    if (!searchQuery.trim()) return properties;
    const query = searchQuery.toLowerCase();
    return properties.filter(
      (p) =>
        p.address?.toLowerCase().includes(query) ||
        p.propertyCode?.toLowerCase().includes(query) ||
        p.city?.toLowerCase().includes(query)
    );
  }, [properties, searchQuery]);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Content Source</h2>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent>
              Choose what type of post you want to create
            </TooltipContent>
          </Tooltip>
        </div>

        <p className="text-muted-foreground">
          What type of post are you creating?
        </p>

        {/* Post Type Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {POST_TYPES.map((type) => (
            <Card
              key={type.id}
              onClick={() => updateState({
                postType: type.id,
                selectedProperty: type.id !== 'property' ? null : state.selectedProperty,
              })}
              className={cn(
                "cursor-pointer transition-all hover:border-purple-400",
                state.postType === type.id && "border-purple-600 ring-2 ring-purple-200 bg-purple-50 dark:bg-purple-950/20"
              )}
            >
              <CardContent className="p-6 text-center">
                <div className={cn(
                  "mx-auto mb-3 text-muted-foreground",
                  state.postType === type.id && "text-purple-600"
                )}>
                  {type.icon}
                </div>
                <h3 className="font-semibold mb-1">{type.title}</h3>
                <p className="text-xs text-muted-foreground">{type.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Property Selector (shown when Property Post selected) */}
        {state.postType === 'property' && (
          <div className="space-y-3">
            <Label>Select Property</Label>

            {/* Search */}
            <Input
              type="text"
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />

            {/* Property List */}
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading properties...
                </div>
              ) : filteredProperties.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  No properties found
                </div>
              ) : (
                <div className="divide-y">
                  {filteredProperties.map((property) => (
                    <div
                      key={property.id}
                      onClick={() => updateState({
                        selectedProperty: property,
                        postContext: property.socialMediaPropertyDescription || '',
                      })}
                      className={cn(
                        "p-3 cursor-pointer hover:bg-muted/50 flex items-center gap-3",
                        state.selectedProperty?.id === property.id && "bg-purple-50 dark:bg-purple-950/20"
                      )}
                    >
                      {/* Radio indicator */}
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        state.selectedProperty?.id === property.id
                          ? "border-purple-600"
                          : "border-muted-foreground/30"
                      )}>
                        {state.selectedProperty?.id === property.id && (
                          <div className="w-2 h-2 rounded-full bg-purple-600" />
                        )}
                      </div>

                      {/* Property thumbnail */}
                      {property.heroImage && (
                        <img
                          src={property.heroImage}
                          alt=""
                          className="w-12 h-12 rounded object-cover flex-shrink-0"
                        />
                      )}

                      {/* Property info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {property.propertyCode}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {property.address}
                        </p>
                      </div>

                      {/* Price */}
                      {property.price > 0 && (
                        <span className="text-sm font-medium text-purple-600 flex-shrink-0">
                          ${property.price.toLocaleString()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected property indicator */}
            {state.selectedProperty && (
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Selected: {state.selectedProperty.propertyCode} - {state.selectedProperty.address}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

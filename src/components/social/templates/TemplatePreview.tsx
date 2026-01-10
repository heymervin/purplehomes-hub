import React from 'react';
import { Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TemplateProfile, ResolvedFieldValue } from '@/lib/templates/types';

interface TemplatePreviewProps {
  template: TemplateProfile;
  resolvedFields: Map<string, ResolvedFieldValue>;
}

export function TemplatePreview({
  template,
  resolvedFields,
}: TemplatePreviewProps) {
  // Get field values for preview
  const getFieldValue = (key: string): string => {
    return resolvedFields.get(key)?.value || '';
  };

  // Render preview based on template type
  const renderPreview = () => {
    switch (template.id) {
      case 'just-listed':
        return <JustListedPreview getFieldValue={getFieldValue} />;
      case 'just-sold':
        return <JustSoldPreview getFieldValue={getFieldValue} />;
      case 'open-house':
        return <OpenHousePreview getFieldValue={getFieldValue} />;
      case 'personal-value':
        return <PersonalValuePreview getFieldValue={getFieldValue} />;
      case 'success-story':
        return <SuccessStoryPreview getFieldValue={getFieldValue} />;
      default:
        return <GenericPreview template={template} getFieldValue={getFieldValue} />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Live Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="aspect-square bg-muted rounded-lg overflow-hidden">
          {renderPreview()}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          This is a simplified preview. Final image may vary.
        </p>
      </CardContent>
    </Card>
  );
}

// Preview components for each template
function JustListedPreview({ getFieldValue }: { getFieldValue: (key: string) => string }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 p-4 flex flex-col justify-between text-white">
      <div className="flex justify-between items-start">
        <div className="w-16 h-8 bg-white/20 rounded flex items-center justify-center text-xs">
          LOGO
        </div>
        <span className="text-xs bg-white/20 px-2 py-1 rounded">JUST LISTED</span>
      </div>
      <div>
        <p className="text-lg font-bold">{getFieldValue('address') || 'Property Address'}</p>
        <p className="text-2xl font-bold mt-1">{getFieldValue('price') || '$XXX,XXX'}</p>
      </div>
      <div className="flex justify-end">
        <div className="w-12 h-12 bg-white rounded flex items-center justify-center text-xs text-gray-500">
          QR
        </div>
      </div>
    </div>
  );
}

function JustSoldPreview({ getFieldValue }: { getFieldValue: (key: string) => string }) {
  const heroImage = getFieldValue('heroImage');
  return (
    <div className="w-full h-full relative">
      {heroImage ? (
        <img src={heroImage} alt="Property" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
          <span className="text-gray-500">Property Image</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 text-white">
        <span className="text-xs bg-green-500 px-2 py-1 rounded self-start mb-2">SOLD!</span>
        <p className="text-lg font-bold">{getFieldValue('address') || 'Property Address'}</p>
      </div>
    </div>
  );
}

function OpenHousePreview({ getFieldValue }: { getFieldValue: (key: string) => string }) {
  const heroImage = getFieldValue('heroImage');
  return (
    <div className="w-full h-full relative">
      {heroImage ? (
        <img src={heroImage} alt="Property" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-300 flex items-center justify-center">
          <span className="text-gray-500">Property Image</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4 text-white">
        <span className="text-xs bg-purple-500 px-2 py-1 rounded self-start mb-2">OPEN HOUSE</span>
        <p className="font-bold">{getFieldValue('address') || 'Property Address'}</p>
        <p className="text-sm mt-1">{getFieldValue('dateTime') || 'Date & Time TBD'}</p>
      </div>
    </div>
  );
}

function PersonalValuePreview({ getFieldValue }: { getFieldValue: (key: string) => string }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-700 p-4 flex flex-col text-white">
      <h3 className="text-lg font-bold mb-4">
        {getFieldValue('header') || '3 Tips for Homebuyers'}
      </h3>
      <div className="flex-1 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-2">
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">
              {i}
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {getFieldValue(`tip${i}Header`) || `Tip ${i} Title`}
              </p>
              <p className="text-xs text-white/70 line-clamp-1">
                {getFieldValue(`tip${i}Body`) || 'Description...'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuccessStoryPreview({ getFieldValue }: { getFieldValue: (key: string) => string }) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 p-4 flex flex-col justify-center text-white">
      <span className="text-3xl mb-2">⭐</span>
      <p className="text-sm italic leading-relaxed line-clamp-4">
        "{getFieldValue('testimonial') || 'Client testimonial will appear here...'}"
      </p>
      <p className="text-sm font-bold mt-4">
        — {getFieldValue('clientNameLocation') || 'Client Name, Location'}
      </p>
    </div>
  );
}

function GenericPreview({
  template,
  getFieldValue
}: {
  template: TemplateProfile;
  getFieldValue: (key: string) => string;
}) {
  return (
    <div className="w-full h-full bg-gray-200 flex items-center justify-center">
      <div className="text-center">
        <span className="text-4xl">{template.icon}</span>
        <p className="text-sm text-gray-600 mt-2">{template.name}</p>
      </div>
    </div>
  );
}

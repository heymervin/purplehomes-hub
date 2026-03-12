/**
 * EmailPreview - Collapsible email preview component
 *
 * Shows a preview of what the email will look like before sending.
 */

import { useState } from 'react';
import { ChevronDown, Mail, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ScoredProperty, BuyerCriteria } from '@/types/matching';

interface EmailPreviewProps {
  buyer: BuyerCriteria;
  properties: ScoredProperty[];
  customMessage?: string;
  className?: string;
}

export function EmailPreview({
  buyer,
  properties,
  customMessage,
  className,
}: EmailPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  const subject = `🏡 Homes we found for you`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={className}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Preview Email</span>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="mt-2 rounded-lg border bg-card max-h-64 overflow-y-auto">
          {/* Email Header */}
          <div className="border-b bg-muted/30 p-3 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <span className="font-medium text-muted-foreground w-12">To:</span>
              <span>
                {buyer.firstName} {buyer.lastName} &lt;{buyer.email}&gt;
              </span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <span className="font-medium text-muted-foreground w-12">Subject:</span>
              <span className="font-medium">{subject}</span>
            </div>
          </div>

          {/* Email Body Preview */}
          <div className="p-4 space-y-3 text-sm">
            <p>Hello {buyer.firstName},</p>

            <p className="text-muted-foreground leading-relaxed">
              We found some homes that could be a great fit based on what you told us. Take a quick look below and see if any stand out to you.
            </p>

            {customMessage && (
              <p className="italic text-muted-foreground border-l-2 border-purple-300 pl-3">
                {customMessage}
              </p>
            )}

            {/* Property Cards Preview */}
            <div className="space-y-2">
              {properties.map((sp, i) => (
                <div
                  key={sp.property.code || i}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className="p-2 rounded bg-purple-100">
                    <Home className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">
                      {properties.length > 1 ? `${i + 1}. ` : ''}{sp.property.address}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sp.property.beds ? `${sp.property.beds} bd` : ''}{sp.property.baths ? ` • ${sp.property.baths} ba` : ''}
                      {sp.property.downPayment ? ` • $${sp.property.downPayment.toLocaleString()} down` : ''}
                      {sp.property.monthlyPayment ? ` • $${sp.property.monthlyPayment.toLocaleString()}/mo` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-muted-foreground leading-relaxed">
              If one catches your eye, let me know and we can schedule a time for you to see it in person.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              If none of these feel right, that is completely fine. Just let us know and we will adjust things and send you better options.
            </p>

            <p>
              Talk soon,<br />
              <strong>Krista</strong>
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default EmailPreview;

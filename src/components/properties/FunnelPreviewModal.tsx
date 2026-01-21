/**
 * Funnel Preview Modal
 *
 * Shows a styled preview of funnel content exactly as it will appear on the public page.
 * Used in FunnelContentEditor for quick preview without opening a new tab.
 */

import { X, ExternalLink, Quote, MapPin, Users, CreditCard, Video, HelpCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { FunnelContent } from '@/types/funnel';

interface FunnelPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: FunnelContent | null;
  publicUrl?: string;
}

export function FunnelPreviewModal({
  open,
  onOpenChange,
  content,
  publicUrl,
}: FunnelPreviewModalProps) {
  if (!content) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Funnel Preview</DialogTitle>
            <div className="flex items-center gap-2">
              {publicUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(publicUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open Public Page
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-80px)]">
          <div className="p-6 space-y-6 bg-white">
            {/* Hook - Attention Grabbing Headline */}
            {content.hook && (
              <Card className="bg-gradient-to-br from-purple-600 to-purple-800 text-white overflow-hidden">
                <CardContent className="p-8 text-center">
                  <h2 className="text-2xl sm:text-3xl font-bold leading-tight whitespace-pre-wrap">
                    {content.hook}
                  </h2>
                </CardContent>
              </Card>
            )}

            {/* Problem - Pain Points */}
            {content.problem && (
              <div className="bg-gray-50 rounded-xl p-6 border-l-4 border-orange-400">
                <h3 className="font-semibold text-gray-900 mb-3 text-lg">The Challenge</h3>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {content.problem}
                </p>
              </div>
            )}

            {/* Solution - Purple Homes Approach */}
            {content.solution && (
              <div className="bg-purple-50 rounded-xl p-6 border-l-4 border-purple-500">
                <h3 className="font-semibold text-purple-900 mb-3 text-lg">Our Solution</h3>
                <p className="text-purple-800 whitespace-pre-wrap leading-relaxed">
                  {content.solution}
                </p>
              </div>
            )}

            {/* Property Showcase - Detailed Description */}
            {content.propertyShowcase && (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-lg">Why This Home?</h3>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {content.propertyShowcase}
                </p>
              </div>
            )}

            {/* Social Proof - Testimonials */}
            {content.socialProof && (
              <Card className="bg-gray-50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <Quote className="h-5 w-5 text-purple-600" />
                    </div>
                    <blockquote className="text-gray-700 italic whitespace-pre-wrap leading-relaxed">
                      {content.socialProof}
                    </blockquote>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Call to Action - Urgency */}
            {content.callToAction && (
              <div className="text-center bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-6">
                <p className="text-purple-900 font-medium text-lg whitespace-pre-wrap">
                  {content.callToAction}
                </p>
              </div>
            )}

            {/* Optional Sections */}

            {/* Location & Nearby */}
            {content.locationNearby && (
              <div className="bg-blue-50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-blue-900 text-lg">Location & Nearby</h3>
                </div>
                <div className="text-blue-800 whitespace-pre-wrap leading-relaxed">
                  {content.locationNearby}
                </div>
              </div>
            )}

            {/* Qualifier - Perfect For You If... */}
            {content.qualifier && (
              <div className="bg-purple-50 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-purple-900 text-lg">This Home is Perfect For You If...</h3>
                </div>
                <div className="text-purple-800 whitespace-pre-wrap leading-relaxed">
                  {content.qualifier}
                </div>
              </div>
            )}

            {/* Pricing Options */}
            {content.pricingOptions && (
              <Card className="border-green-200 overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-green-600" />
                    </div>
                    <h3 className="font-semibold text-green-900 text-lg">Payment Options</h3>
                  </div>
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed font-mono text-sm bg-gray-50 rounded-lg p-4">
                    {content.pricingOptions}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Virtual Tour */}
            {content.virtualTourUrl && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Video className="h-4 w-4 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg">Virtual Tour</h3>
                </div>
                <div className="aspect-video rounded-xl overflow-hidden bg-gray-100">
                  {content.virtualTourUrl.includes('youtube.com') || content.virtualTourUrl.includes('youtu.be') ? (
                    <iframe
                      src={content.virtualTourUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Property Virtual Tour"
                    />
                  ) : content.virtualTourUrl.includes('vimeo.com') ? (
                    <iframe
                      src={content.virtualTourUrl.replace('vimeo.com/', 'player.vimeo.com/video/')}
                      className="w-full h-full"
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      title="Property Virtual Tour"
                    />
                  ) : content.virtualTourUrl.includes('matterport.com') ? (
                    <iframe
                      src={content.virtualTourUrl}
                      className="w-full h-full"
                      allowFullScreen
                      title="Property 3D Tour"
                    />
                  ) : (
                    <iframe
                      src={content.virtualTourUrl}
                      className="w-full h-full"
                      allowFullScreen
                      title="Property Virtual Tour"
                    />
                  )}
                </div>
              </div>
            )}

            {/* FAQ */}
            {content.faq && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <HelpCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-lg">Frequently Asked Questions</h3>
                </div>
                <div className="space-y-3">
                  {(() => {
                    // Handle both string and array formats for FAQ
                    const faqData = content.faq;

                    // If it's an array of objects with question/answer
                    if (Array.isArray(faqData)) {
                      return faqData.map((item: { question?: string; Q?: string; answer?: string; A?: string }, index: number) => {
                        const question = item.question || item.Q || '';
                        const answer = item.answer || item.A || '';
                        if (!question) return null;
                        return (
                          <details key={index} className="group bg-amber-50 rounded-lg overflow-hidden">
                            <summary className="flex items-center justify-between cursor-pointer p-4 font-medium text-amber-900 hover:bg-amber-100 transition-colors">
                              <span>{question}</span>
                              <ChevronDown className="h-4 w-4 text-amber-600 group-open:rotate-180 transition-transform" />
                            </summary>
                            {answer && (
                              <div className="px-4 pb-4 text-amber-800 leading-relaxed">
                                {answer}
                              </div>
                            )}
                          </details>
                        );
                      });
                    }

                    // If it's a string, parse it
                    if (typeof faqData === 'string') {
                      return faqData.split(/(?=Q:)/g).filter(Boolean).map((qa, index) => {
                        const questionMatch = qa.match(/Q:\s*(.+?)(?=A:|$)/s);
                        const answerMatch = qa.match(/A:\s*(.+)/s);
                        const question = questionMatch?.[1]?.trim();
                        const answer = answerMatch?.[1]?.trim();

                        if (!question) return null;

                        return (
                          <details key={index} className="group bg-amber-50 rounded-lg overflow-hidden">
                            <summary className="flex items-center justify-between cursor-pointer p-4 font-medium text-amber-900 hover:bg-amber-100 transition-colors">
                              <span>{question}</span>
                              <ChevronDown className="h-4 w-4 text-amber-600 group-open:rotate-180 transition-transform" />
                            </summary>
                            {answer && (
                              <div className="px-4 pb-4 text-amber-800 leading-relaxed">
                                {answer}
                              </div>
                            )}
                          </details>
                        );
                      });
                    }

                    return null;
                  })()}
                </div>
              </div>
            )}

            {/* A/B Variants Notice */}
            {(content.hookVariantB || content.ctaVariantB) && (
              <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                <p className="text-sm text-indigo-700">
                  <strong>Note:</strong> This property has A/B test variants. The public page will show the primary version.
                  Variant B content is available in the editor.
                </p>
              </div>
            )}

            {/* Empty State */}
            {!content.hook && !content.problem && !content.solution && (
              <div className="text-center py-12 text-gray-500">
                <p>No funnel content to preview yet.</p>
                <p className="text-sm mt-1">Generate content to see the preview.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default FunnelPreviewModal;

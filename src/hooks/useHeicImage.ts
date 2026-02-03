import { useState, useEffect } from 'react';
import { convertHeicToJpeg, isHeicUrl } from '@/lib/heicConverter';
import { isGhlDocumentUrl, getProxiedImageUrl } from '@/lib/ghlUrls';

interface UseHeicImageResult {
  src: string;
  isConverting: boolean;
  isHeic: boolean;
  error: boolean;
}

/**
 * Hook to handle HEIC image conversion and GHL document URL proxying
 * - Proxies GHL document URLs through our authenticated endpoint
 * - Converts HEIC images to JPEG for browser display
 */
export function useHeicImage(originalUrl: string): UseHeicImageResult {
  const [src, setSrc] = useState(originalUrl);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState(false);

  const isHeic = isHeicUrl(originalUrl);
  const isGhlDoc = isGhlDocumentUrl(originalUrl);

  useEffect(() => {
    if (!originalUrl) {
      setSrc('/placeholder.svg');
      return;
    }

    // Handle GHL document URLs - proxy them for authentication
    if (isGhlDoc) {
      setSrc(getProxiedImageUrl(originalUrl));
      return;
    }

    if (!isHeic) {
      setSrc(originalUrl);
      return;
    }

    // Convert HEIC image
    setIsConverting(true);
    setError(false);

    convertHeicToJpeg(originalUrl)
      .then((convertedUrl) => {
        setSrc(convertedUrl);
        setIsConverting(false);
      })
      .catch(() => {
        setError(true);
        setIsConverting(false);
        setSrc('/placeholder.svg');
      });
  }, [originalUrl, isHeic, isGhlDoc]);

  return { src, isConverting, isHeic, error };
}

/**
 * Hook to handle multiple images with HEIC conversion and GHL document URL proxying
 * - Proxies GHL document URLs through our authenticated endpoint
 * - Converts HEIC images to JPEG for browser display
 */
export function useHeicImages(originalUrls: string[]): {
  images: string[];
  isConverting: boolean;
  convertedCount: number;
} {
  const [images, setImages] = useState<string[]>(originalUrls);
  const [isConverting, setIsConverting] = useState(false);
  const [convertedCount, setConvertedCount] = useState(0);

  useEffect(() => {
    if (!originalUrls.length) {
      setImages([]);
      return;
    }

    const heicUrls = originalUrls.filter(isHeicUrl);
    const ghlDocUrls = originalUrls.filter(isGhlDocumentUrl);
    const needsProcessing = heicUrls.length > 0 || ghlDocUrls.length > 0;

    if (!needsProcessing) {
      setImages(originalUrls);
      return;
    }

    setIsConverting(true);
    setConvertedCount(0);

    // Process all images - proxy GHL docs and convert HEIC
    Promise.all(
      originalUrls.map(async (url) => {
        // GHL document URLs get proxied
        if (isGhlDocumentUrl(url)) {
          setConvertedCount((prev) => prev + 1);
          return getProxiedImageUrl(url);
        }
        // HEIC images get converted
        if (isHeicUrl(url)) {
          const converted = await convertHeicToJpeg(url);
          setConvertedCount((prev) => prev + 1);
          return converted;
        }
        return url;
      })
    )
      .then((processedUrls) => {
        setImages(processedUrls);
        setIsConverting(false);
      })
      .catch(() => {
        // On error, still try to proxy GHL URLs at minimum
        const fallbackUrls = originalUrls.map(url =>
          isGhlDocumentUrl(url) ? getProxiedImageUrl(url) : url
        );
        setImages(fallbackUrls);
        setIsConverting(false);
      });
  }, [originalUrls.join(',')]); // Stringify for dependency comparison

  return { images, isConverting, convertedCount };
}

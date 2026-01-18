/**
 * ImageUrlInput - Input component for image URLs with GHL Media upload support
 *
 * Allows users to either:
 * 1. Paste an image URL directly
 * 2. Upload an image file to GHL Media Library
 *
 * Uploaded images are automatically organized into the "Uploaded Images" folder.
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Upload, Image as ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { findOrCreateFolder } from '@/services/ghlApi';
import { logMediaUploaded } from '@/store/useActivityStore';

interface ImageUrlInputProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function ImageUrlInput({
  value,
  onChange,
  placeholder = 'Paste image URL or upload...',
  className,
  disabled = false,
}: ImageUrlInputProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setIsUploading(true);

    try {
      // Get or create the "Uploaded Images" folder
      const folderId = await findOrCreateFolder('Uploaded Images');

      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload to GHL Media
      const uploadResponse = await fetch('/api/ghl?resource=media&action=upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base64Data,
          name: file.name,
          contentType: file.type,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      const uploadedFile = await uploadResponse.json();

      // Move to folder
      if (folderId && uploadedFile.id) {
        await fetch(`/api/ghl?resource=media&action=move&id=${uploadedFile.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId }),
        });
      }

      // Get the URL from the uploaded file
      const imageUrl = uploadedFile.url || uploadedFile.fileUrl;
      if (imageUrl) {
        onChange(imageUrl);
        toast.success('Image uploaded successfully');
        // Log successful upload
        logMediaUploaded(file.name);
      } else {
        throw new Error('No URL returned');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
      // Log failed upload
      logMediaUploaded(file.name, false, error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        title="Upload image to GHL Media"
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
      </Button>
      <div className="flex-1 relative">
        <Input
          type="url"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(value && 'pr-10')}
          disabled={disabled || isUploading}
        />
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {value && value.startsWith('http') && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => window.open(value, '_blank')}
          title="Preview image"
          disabled={disabled}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default ImageUrlInput;

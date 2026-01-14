import { useState, useRef, useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export default function VoiceInput({ onTranscript, disabled, className }: VoiceInputProps) {
  const [state, setState] = useState<RecordingState>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });

      // Determine best supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        if (chunksRef.current.length === 0) {
          setState('idle');
          return;
        }

        setState('processing');

        try {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });

          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);

          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];

            // Send to transcription API
            const response = await fetch('/api/ai?action=transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audio: base64Audio,
                mimeType,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.text) {
                onTranscript(data.text);
                toast.success('Voice transcribed successfully');
              } else {
                toast.error('No speech detected. Please try again.');
              }
            } else {
              const error = await response.json();
              toast.error(error.error || 'Transcription failed');
            }

            setState('idle');
          };

          reader.onerror = () => {
            toast.error('Failed to process audio');
            setState('idle');
          };
        } catch (error) {
          console.error('Transcription error:', error);
          toast.error('Transcription failed');
          setState('idle');
        }
      };

      mediaRecorder.start();
      setState('recording');
    } catch (error) {
      console.error('Microphone access error:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        toast.error('Could not access microphone');
      }
      setState('idle');
    }
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [state]);

  const handleClick = () => {
    if (state === 'idle') {
      startRecording();
    } else if (state === 'recording') {
      stopRecording();
    }
  };

  return (
    <Button
      type="button"
      variant={state === 'recording' ? 'destructive' : 'outline'}
      size="icon"
      onClick={handleClick}
      disabled={disabled || state === 'processing'}
      className={cn(
        'relative transition-all',
        state === 'recording' && 'animate-pulse ring-2 ring-red-400 ring-offset-2',
        className
      )}
      title={
        state === 'idle'
          ? 'Click to start voice input'
          : state === 'recording'
            ? 'Click to stop recording'
            : 'Processing...'
      }
    >
      {state === 'processing' ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : state === 'recording' ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}

      {/* Recording indicator */}
      {state === 'recording' && (
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
        </span>
      )}
    </Button>
  );
}

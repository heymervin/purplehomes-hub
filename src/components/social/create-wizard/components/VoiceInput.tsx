import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, Loader2, Check, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}

type ModalState = 'closed' | 'recording' | 'processing' | 'review';

export default function VoiceInput({ onTranscript, disabled, className }: VoiceInputProps) {
  const [modalState, setModalState] = useState<ModalState>('closed');
  const [interimText, setInterimText] = useState('');
  const [finalText, setFinalText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      recognitionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // Audio level visualization
  const startAudioVisualization = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(average / 255);
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (e) {
      console.error('Audio visualization error:', e);
    }
  }, []);

  // Start browser speech recognition for real-time feedback
  const startBrowserRecognition = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return; // Browser doesn't support speech recognition
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }

      if (final) {
        setInterimText(prev => prev + final);
      }
      // Show interim results in a different style
      if (interim) {
        setFinalText(interim);
      } else {
        setFinalText('');
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      console.error('Failed to start speech recognition:', e);
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setInterimText('');
      setFinalText('');
      setEditedText('');
      setModalState('recording');

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        }
      });
      streamRef.current = stream;

      // Start audio visualization
      startAudioVisualization(stream);

      // Start browser speech recognition for real-time feedback
      startBrowserRecognition();

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
        // Stop browser recognition
        if (recognitionRef.current) {
          try {
            recognitionRef.current.stop();
          } catch (e) {
            // Ignore
          }
        }

        // Stop visualization
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        if (chunksRef.current.length === 0) {
          setModalState('closed');
          cleanup();
          return;
        }

        setModalState('processing');

        try {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });

          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);

          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];

            // Send to transcription API (Whisper)
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
                setEditedText(data.text);
                setModalState('review');
              } else {
                toast.error('No speech detected. Please try again.');
                setModalState('closed');
                cleanup();
              }
            } else {
              const error = await response.json();
              toast.error(error.error || 'Transcription failed');
              setModalState('closed');
              cleanup();
            }
          };

          reader.onerror = () => {
            toast.error('Failed to process audio');
            setModalState('closed');
            cleanup();
          };
        } catch (error) {
          console.error('Transcription error:', error);
          toast.error('Transcription failed');
          setModalState('closed');
          cleanup();
        }
      };

      mediaRecorder.start();
    } catch (error) {
      console.error('Microphone access error:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access in your browser settings.');
      } else {
        toast.error('Could not access microphone');
      }
      setModalState('closed');
      cleanup();
    }
  }, [cleanup, startAudioVisualization, startBrowserRecognition]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && modalState === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, [modalState]);

  const handleConfirm = useCallback(() => {
    if (editedText.trim()) {
      onTranscript(editedText.trim());
      toast.success('Voice input added');
    }
    setModalState('closed');
    cleanup();
  }, [editedText, onTranscript, cleanup]);

  const handleCancel = useCallback(() => {
    setModalState('closed');
    cleanup();
  }, [cleanup]);

  const handleOpenModal = () => {
    startRecording();
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleOpenModal}
        disabled={disabled || modalState !== 'closed'}
        className={cn('relative transition-all', className)}
        title="Click to start voice input"
      >
        <Mic className="h-4 w-4" />
      </Button>

      <Dialog open={modalState !== 'closed'} onOpenChange={(open) => {
        if (!open && modalState === 'recording') {
          stopRecording();
        } else if (!open) {
          handleCancel();
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalState === 'recording' && (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Recording...
                </>
              )}
              {modalState === 'processing' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Transcribing with AI...
                </>
              )}
              {modalState === 'review' && (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  Review Your Text
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {modalState === 'recording' && 'Speak clearly into your microphone. Click Stop when done.'}
              {modalState === 'processing' && 'Please wait while we transcribe your voice...'}
              {modalState === 'review' && 'Edit if needed, then click Use Text to add it.'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {/* Recording State */}
            {modalState === 'recording' && (
              <div className="space-y-4">
                {/* Audio level visualization */}
                <div className="flex items-center justify-center gap-1 h-16">
                  {[...Array(20)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 bg-purple-500 rounded-full transition-all duration-75"
                      style={{
                        height: `${Math.max(8, Math.min(64, (audioLevel * 64 * (0.5 + Math.random() * 0.5))))}px`,
                        opacity: 0.5 + audioLevel * 0.5,
                      }}
                    />
                  ))}
                </div>

                {/* Real-time text display */}
                <div className="min-h-[100px] p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-start gap-2">
                    <Volume2 className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      {interimText && (
                        <p className="text-sm">{interimText}</p>
                      )}
                      {finalText && (
                        <p className="text-sm text-muted-foreground italic">{finalText}</p>
                      )}
                      {!interimText && !finalText && (
                        <p className="text-sm text-muted-foreground">Listening... Start speaking</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stop button */}
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
              </div>
            )}

            {/* Processing State */}
            {modalState === 'processing' && (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Converting your voice to text with Whisper AI...
                </p>
                {interimText && (
                  <div className="w-full p-3 rounded-lg bg-muted/50 border">
                    <p className="text-xs text-muted-foreground mb-1">Preview (browser):</p>
                    <p className="text-sm">{interimText}</p>
                  </div>
                )}
              </div>
            )}

            {/* Review State */}
            {modalState === 'review' && (
              <div className="space-y-4">
                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  rows={5}
                  className="resize-none"
                  placeholder="Your transcribed text will appear here..."
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Tip: You can edit the text above before adding it.
                </p>
              </div>
            )}
          </div>

          {modalState === 'review' && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={!editedText.trim()}>
                <Check className="h-4 w-4 mr-2" />
                Use Text
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

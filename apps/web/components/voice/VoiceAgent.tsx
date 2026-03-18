'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, MicOff, X, Minimize2, Phone } from 'lucide-react';
import {
  getMicrophoneStream,
  createAudioStreamer,
  AudioPlayer,
  parseMessage,
} from '@/lib/voice/audio-utils';

type VoiceStatus = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

interface TranscriptEntry {
  role: 'user' | 'agent';
  text: string;
}

interface VoiceAgentProps {
  /** Market slug for market-specific knowledge */
  market: string;
  /** Position of the floating button */
  position?: 'bottom-right' | 'bottom-left';
  /** Custom greeting (defaults to market-specific greeting) */
  greeting?: string;
}

export default function VoiceAgent({
  market,
  position = 'bottom-right',
}: VoiceAgentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioStreamerRef = useRef<ReturnType<typeof createAudioStreamer> | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const disconnect = useCallback(() => {
    // Stop audio streaming
    audioStreamerRef.current?.stop();
    audioStreamerRef.current = null;

    // Stop audio playback
    audioPlayerRef.current?.destroy();
    audioPlayerRef.current = null;

    // Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.send(JSON.stringify({ type: 'end' }));
      } catch {
        // ignore if already closed
      }
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    setStatus('idle');
  }, []);

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      setError(null);
      setTranscript([]);
      setDuration(0);

      // Get microphone access
      const stream = await getMicrophoneStream();

      // Get WebSocket URL from our API
      const connectRes = await fetch('/api/voice/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market }),
      });

      if (!connectRes.ok) {
        throw new Error('Failed to get voice agent connection');
      }

      const { wsUrl } = await connectRes.json();

      // Connect WebSocket
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Set up audio player
      const player = new AudioPlayer();
      audioPlayerRef.current = player;
      player.setOnPlaybackEnd(() => {
        setStatus((prev) => prev === 'speaking' ? 'listening' : prev);
      });

      ws.onopen = () => {
        // Send config
        ws.send(JSON.stringify({
          type: 'config',
          marketSlug: market,
          sourceUrl: window.location.href,
          utmSource: new URLSearchParams(window.location.search).get('utm_source') || '',
          utmMedium: new URLSearchParams(window.location.search).get('utm_medium') || '',
          utmCampaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
        }));

        // Start streaming mic audio
        const streamer = createAudioStreamer(stream, (chunk) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(chunk);
          }
        });
        audioStreamerRef.current = streamer;
        streamer.start();

        // Start duration timer
        const startTime = Date.now();
        durationIntervalRef.current = setInterval(() => {
          setDuration(Math.floor((Date.now() - startTime) / 1000));
        }, 1000);
      };

      ws.onmessage = async (event) => {
        // Binary data = TTS audio
        if (event.data instanceof Blob) {
          const buffer = await event.data.arrayBuffer();
          player.enqueueAudioData(buffer);
          return;
        }

        if (event.data instanceof ArrayBuffer) {
          player.enqueueAudioData(event.data);
          return;
        }

        // Text data = JSON messages
        const msg = parseMessage(event.data);

        switch (msg.type) {
          case 'ready':
            setStatus('listening');
            break;

          case 'status':
            setStatus(msg.status as VoiceStatus);
            break;

          case 'transcript':
            setTranscript((prev) => [
              ...prev,
              { role: msg.role as 'user' | 'agent', text: msg.text as string },
            ]);
            break;

          case 'tool_call':
            // Could show tool call activity in UI
            console.log('Tool call:', msg.name, msg.result);
            break;

          case 'error':
            setError(msg.message as string);
            break;

          case 'done':
            disconnect();
            break;

          case 'audio_end':
            // TTS finished, ready for next input
            break;
        }
      };

      ws.onerror = () => {
        setError('Connection error. Please try again.');
        setStatus('error');
      };

      ws.onclose = () => {
        setStatus('idle');
      };

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect';
      setError(message);
      setStatus('error');
      disconnect();
    }
  }, [market, disconnect]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      disconnect();
      setIsOpen(false);
      setIsMinimized(false);
    } else {
      setIsOpen(true);
      connect();
    }
  }, [isOpen, connect, disconnect]);

  const handleEnd = useCallback(() => {
    disconnect();
    setIsOpen(false);
    setIsMinimized(false);
  }, [disconnect]);

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const positionClasses = position === 'bottom-right' ? 'right-6 bottom-6' : 'left-6 bottom-6';

  // Floating button (when closed)
  if (!isOpen) {
    return (
      <button
        onClick={handleToggle}
        className={`fixed ${positionClasses} z-50 flex items-center gap-2 px-5 py-3 bg-tastelanc-accent hover:bg-tastelanc-accent-hover text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 group`}
        aria-label="Talk to us"
      >
        <Phone className="w-5 h-5" />
        <span className="font-medium text-sm">Talk to Us</span>
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
      </button>
    );
  }

  // Minimized state
  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`fixed ${positionClasses} z-50 flex items-center gap-2 px-4 py-2 bg-tastelanc-surface border border-tastelanc-surface-light text-tastelanc-text-primary rounded-full shadow-lg`}
      >
        <StatusIndicator status={status} />
        <span className="text-sm font-medium">{formatDuration(duration)}</span>
        <Mic className="w-4 h-4 text-tastelanc-accent" />
      </button>
    );
  }

  // Full voice panel
  return (
    <div
      className={`fixed ${positionClasses} z-50 w-80 sm:w-96 bg-tastelanc-bg border border-tastelanc-surface-light rounded-2xl shadow-2xl flex flex-col overflow-hidden`}
      style={{ maxHeight: '500px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-tastelanc-surface border-b border-tastelanc-surface-light">
        <div className="flex items-center gap-2">
          <StatusIndicator status={status} />
          <span className="text-sm font-medium text-tastelanc-text-primary">
            {status === 'connecting' && 'Connecting...'}
            {status === 'listening' && 'Listening...'}
            {status === 'thinking' && 'Thinking...'}
            {status === 'speaking' && 'Speaking...'}
            {status === 'idle' && 'Ready'}
            {status === 'error' && 'Error'}
          </span>
          {duration > 0 && (
            <span className="text-xs text-tastelanc-text-secondary">{formatDuration(duration)}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1.5 hover:bg-tastelanc-surface-light rounded-md transition-colors"
            aria-label="Minimize"
          >
            <Minimize2 className="w-4 h-4 text-tastelanc-text-secondary" />
          </button>
          <button
            onClick={handleEnd}
            className="p-1.5 hover:bg-red-500/20 rounded-md transition-colors"
            aria-label="End conversation"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>

      {/* Recording notice */}
      <div className="px-4 py-1.5 bg-tastelanc-surface/50 border-b border-tastelanc-surface-light">
        <p className="text-[10px] text-tastelanc-text-secondary text-center">
          This conversation is recorded to improve our service.
        </p>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px]">
        {transcript.map((entry, i) => (
          <div
            key={i}
            className={`flex ${entry.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 rounded-xl text-sm ${
                entry.role === 'user'
                  ? 'bg-tastelanc-accent text-white rounded-br-none'
                  : 'bg-tastelanc-surface text-tastelanc-text-primary rounded-bl-none'
              }`}
            >
              {entry.text}
            </div>
          </div>
        ))}

        {status === 'thinking' && (
          <div className="flex justify-start">
            <div className="bg-tastelanc-surface px-4 py-2 rounded-xl rounded-bl-none">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-tastelanc-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-tastelanc-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-tastelanc-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-2">
            <p className="text-xs text-red-400">{error}</p>
            <button
              onClick={() => { setError(null); connect(); }}
              className="text-xs text-tastelanc-accent hover:underline mt-1"
            >
              Try again
            </button>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </div>

      {/* Footer with mic indicator */}
      <div className="px-4 py-3 border-t border-tastelanc-surface-light bg-tastelanc-surface/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'listening' ? (
            <Mic className="w-5 h-5 text-tastelanc-accent animate-pulse" />
          ) : (
            <MicOff className="w-5 h-5 text-tastelanc-text-secondary" />
          )}
          <span className="text-xs text-tastelanc-text-secondary">
            {status === 'listening' ? 'Speak now...' : status === 'speaking' ? 'Agent is speaking...' : ''}
          </span>
        </div>
        <button
          onClick={handleEnd}
          className="px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-md transition-colors"
        >
          End Call
        </button>
      </div>
    </div>
  );
}

function StatusIndicator({ status }: { status: VoiceStatus }) {
  const colors: Record<VoiceStatus, string> = {
    idle: 'bg-gray-400',
    connecting: 'bg-yellow-400 animate-pulse',
    listening: 'bg-green-400 animate-pulse',
    thinking: 'bg-blue-400 animate-pulse',
    speaking: 'bg-tastelanc-accent animate-pulse',
    error: 'bg-red-400',
  };

  return <span className={`w-2 h-2 rounded-full ${colors[status]}`} />;
}

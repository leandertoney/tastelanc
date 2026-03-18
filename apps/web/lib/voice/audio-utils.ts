/**
 * Browser Audio Utilities for Voice Agent
 *
 * Handles microphone access, audio recording/streaming,
 * and playback of agent responses via Web Audio API.
 */

/**
 * Request microphone access and return a MediaStream.
 * Uses optimal settings for speech recognition (16kHz mono).
 */
export async function getMicrophoneStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Microphone access is not supported in this browser.');
  }

  return navigator.mediaDevices.getUserMedia({
    audio: {
      sampleRate: 16000,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

/**
 * Create an AudioWorklet processor for streaming mic audio as PCM16 chunks.
 * Falls back to ScriptProcessorNode if AudioWorklet is not available.
 */
export function createAudioStreamer(
  stream: MediaStream,
  onAudioChunk: (chunk: ArrayBuffer) => void
): { start: () => void; stop: () => void } {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const source = audioContext.createMediaStreamSource(stream);

  // Use ScriptProcessorNode (widely supported) for real-time PCM extraction
  // Buffer size of 4096 gives ~256ms chunks at 16kHz — good balance of latency vs efficiency
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  processor.onaudioprocess = (event) => {
    const inputData = event.inputBuffer.getChannelData(0);
    // Convert Float32 [-1, 1] to Int16 PCM
    const pcm16 = new Int16Array(inputData.length);
    for (let i = 0; i < inputData.length; i++) {
      const s = Math.max(-1, Math.min(1, inputData[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    onAudioChunk(pcm16.buffer);
  };

  return {
    start: () => {
      source.connect(processor);
      processor.connect(audioContext.destination);
    },
    stop: () => {
      processor.disconnect();
      source.disconnect();
      audioContext.close();
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

/**
 * Audio playback queue for agent responses.
 * Handles streaming audio chunks and playing them in sequence.
 */
export class AudioPlayer {
  private audioContext: AudioContext;
  private queue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private onPlaybackEnd: (() => void) | null = null;

  constructor() {
    this.audioContext = new AudioContext();
  }

  /** Set callback for when all queued audio finishes playing */
  setOnPlaybackEnd(callback: () => void) {
    this.onPlaybackEnd = callback;
  }

  /** Enqueue raw PCM16 audio data for playback */
  async enqueuePCM(pcmData: ArrayBuffer, sampleRate = 24000) {
    const int16 = new Int16Array(pcmData);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 0x7FFF;
    }

    const buffer = this.audioContext.createBuffer(1, float32.length, sampleRate);
    buffer.getChannelData(0).set(float32);
    this.queue.push(buffer);

    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /** Enqueue pre-decoded audio (e.g., from fetch response) */
  async enqueueAudioData(audioData: ArrayBuffer) {
    const buffer = await this.audioContext.decodeAudioData(audioData.slice(0));
    this.queue.push(buffer);

    if (!this.isPlaying) {
      this.playNext();
    }
  }

  /** Stop current playback and clear queue (for barge-in) */
  interrupt() {
    this.queue = [];
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.isPlaying = false;
  }

  private playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.onPlaybackEnd?.();
      return;
    }

    this.isPlaying = true;
    const buffer = this.queue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.audioContext.destination);

    source.onended = () => {
      this.currentSource = null;
      this.playNext();
    };

    this.currentSource = source;
    source.start();
  }

  /** Clean up audio context */
  async destroy() {
    this.interrupt();
    await this.audioContext.close();
  }

  get playing() {
    return this.isPlaying;
  }
}

/**
 * Encode a string message for WebSocket transmission.
 */
export function encodeMessage(type: string, data: Record<string, unknown>): string {
  return JSON.stringify({ type, ...data });
}

/**
 * Parse a WebSocket message from the voice agent server.
 */
export function parseMessage(data: string): { type: string; [key: string]: unknown } {
  try {
    return JSON.parse(data);
  } catch {
    return { type: 'error', message: 'Failed to parse server message' };
  }
}

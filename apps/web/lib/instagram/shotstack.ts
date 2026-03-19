/**
 * Shotstack video rendering utility.
 * Burns text overlays and closed captions into a video before Instagram posting.
 *
 * Requires SHOTSTACK_API_KEY in environment variables.
 * If not configured, returns null and the caller posts the raw video instead.
 *
 * Shotstack docs: https://shotstack.io/docs/api/
 */

interface CaptionWord {
  word: string;
  start: number;
  end: number;
}

interface TextOverlayInput {
  text: string;
  x: number;           // 0–1 normalized
  y: number;           // 0–1 normalized
  color: string;       // hex
  fontSize: number;    // px
}

interface BurnInOptions {
  videoUrl: string;
  durationSeconds: number;
  textOverlays?: TextOverlayInput[];
  captionWords?: CaptionWord[];
}

const SHOTSTACK_API = 'https://api.shotstack.io/v1';
const POLL_INTERVAL_MS = 3000;
const MAX_POLL_ATTEMPTS = 60; // 3 minutes max

/**
 * Render a video with burned-in text overlays and/or closed captions.
 * Returns the URL of the rendered video, or null if Shotstack is not configured
 * or if the render fails (caller should fall back to the raw video).
 */
export async function burnInOverlays(opts: BurnInOptions): Promise<string | null> {
  const apiKey = process.env.SHOTSTACK_API_KEY;
  if (!apiKey) {
    console.log('[Shotstack] SHOTSTACK_API_KEY not set — skipping burn-in, posting raw video');
    return null;
  }

  const { videoUrl, durationSeconds, textOverlays = [], captionWords = [] } = opts;

  if (textOverlays.length === 0 && captionWords.length === 0) {
    return null; // Nothing to burn in
  }

  try {
    const tracks = buildTracks(videoUrl, durationSeconds, textOverlays, captionWords);

    const renderRes = await fetch(`${SHOTSTACK_API}/render`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        timeline: { tracks },
        output: { format: 'mp4', resolution: 'mobile' },
      }),
    });

    if (!renderRes.ok) {
      const err = await renderRes.text();
      console.error('[Shotstack] Render submit failed:', err);
      return null;
    }

    const renderData = await renderRes.json();
    const renderId: string = renderData?.response?.id;
    if (!renderId) {
      console.error('[Shotstack] No render ID in response');
      return null;
    }

    // Poll until complete
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await sleep(POLL_INTERVAL_MS);

      const statusRes = await fetch(`${SHOTSTACK_API}/render/${renderId}`, {
        headers: { 'x-api-key': apiKey },
      });

      if (!statusRes.ok) continue;

      const statusData = await statusRes.json();
      const status: string = statusData?.response?.status;
      const url: string = statusData?.response?.url;

      if (status === 'done' && url) {
        console.log(`[Shotstack] Render complete: ${renderId}`);
        return url;
      }

      if (status === 'failed') {
        console.error('[Shotstack] Render failed:', statusData?.response?.error);
        return null;
      }
    }

    console.error('[Shotstack] Render timed out after', MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000, 's');
    return null;
  } catch (err: any) {
    console.error('[Shotstack] Unexpected error:', err.message);
    return null;
  }
}

// ─── Shotstack timeline builder ───────────────────────────────────────────────

function buildTracks(
  videoUrl: string,
  duration: number,
  textOverlays: TextOverlayInput[],
  captionWords: CaptionWord[],
) {
  const tracks: any[] = [];

  // Track 0: source video
  tracks.push({
    clips: [{
      asset: { type: 'video', src: videoUrl },
      start: 0,
      length: duration,
    }],
  });

  // Track 1: text overlays (static for the full video duration)
  if (textOverlays.length > 0) {
    tracks.push({
      clips: textOverlays.map(overlay => ({
        asset: {
          type: 'html',
          html: `<p style="font-family:sans-serif;font-weight:700;font-size:${overlay.fontSize}px;color:${overlay.color};text-shadow:1px 1px 3px rgba(0,0,0,0.8);margin:0;white-space:nowrap;">${escapeHtml(overlay.text)}</p>`,
          width: 600,
          height: 80,
        },
        start: 0,
        length: duration,
        position: 'custom',
        offset: {
          x: (overlay.x - 0.5) * 2,  // Shotstack uses -1 to 1 offset from center
          y: (0.5 - overlay.y) * 2,
        },
      })),
    });
  }

  // Track 2: closed captions — each word/group as a short clip
  if (captionWords.length > 0) {
    const chunks = buildCaptionChunks(captionWords, 5);
    tracks.push({
      clips: chunks.map(chunk => ({
        asset: {
          type: 'html',
          html: `<p style="font-family:sans-serif;font-weight:600;font-size:18px;color:#FFFFFF;text-shadow:1px 1px 3px rgba(0,0,0,0.9);margin:0;text-align:center;background:rgba(0,0,0,0.55);padding:4px 10px;border-radius:6px;">${escapeHtml(chunk.text)}</p>`,
          width: 700,
          height: 60,
        },
        start: chunk.start,
        length: Math.max(0.1, chunk.end - chunk.start),
        position: 'bottom',
        offset: { x: 0, y: 0.25 }, // Above the bottom edge
      })),
    });
  }

  return tracks;
}

function buildCaptionChunks(words: CaptionWord[], chunkSize: number) {
  const chunks: { text: string; start: number; end: number }[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    const group = words.slice(i, i + chunkSize);
    chunks.push({
      text: group.map(w => w.word).join(' ').trim(),
      start: group[0].start,
      end: group[group.length - 1].end,
    });
  }
  return chunks;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

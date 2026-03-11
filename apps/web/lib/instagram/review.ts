// AI Review for video recommendation content
// Full pipeline: audio transcription (Whisper) + visual analysis (GPT-4o) + caption review
// Screens for negativity, profanity, spam, and off-topic content before auto-posting to Instagram

import OpenAI from 'openai';
import { SupabaseClient } from '@supabase/supabase-js';
import { toFile } from 'openai/uploads';

interface ReviewResult {
  approved: boolean;
  notes: string;
  flags: string[];
  transcript?: string;
}

const REVIEW_SYSTEM_PROMPT = `You are a content moderator for a local restaurant discovery app. Your job is to review user-generated video recommendations before they are auto-posted to the app's official Instagram account.

You will receive up to three pieces of content to review:
1. The written caption (text the user typed)
2. The audio transcript (what the user said in the video, transcribed via Whisper)
3. A visual description (from analyzing the video thumbnail)

Review ALL provided content together. The video goes on our official business Instagram, so standards are high.

APPROVE if:
- Content is positive or neutral about the restaurant
- On-topic (about food, drinks, vibes, service, atmosphere)
- Free of profanity, slurs, or hate speech in BOTH text and spoken audio
- Not spam, self-promotion, or advertising
- No personal attacks or defamation

REJECT if ANY of the following appear in the caption, audio transcript, OR visual content:
- Profanity, vulgar language, or slurs (even mild ones like "damn" or "hell" — this goes on our official Instagram)
- Negative reviews, complaints, or insults about the restaurant, staff, or other customers
- Off-topic content unrelated to dining/restaurants
- Spam, URLs, phone numbers, or self-promotion
- Mentions of competitors in a promotional way
- Anything sexually suggestive, violent, or showing drug use
- Personal information about employees or other customers
- Obscene gestures or inappropriate imagery (from visual analysis)

Respond with a JSON object:
{
  "approved": true/false,
  "notes": "Brief explanation covering what you found across caption, audio, and visual (1-3 sentences)",
  "flags": ["list", "of", "specific", "issues"] // empty array if approved
}

IMPORTANT: Be reasonably lenient with casual tone, slang, and enthusiasm. Only reject content that would be genuinely inappropriate on a business Instagram account. When in doubt, approve. But ALWAYS reject profanity, negativity, or inappropriate visuals.`;

/**
 * Transcribe video audio using OpenAI Whisper.
 * Downloads the video from the public URL and sends to Whisper API.
 * Returns the transcript text, or null if transcription fails.
 */
async function transcribeVideoAudio(openai: OpenAI, videoUrl: string): Promise<string | null> {
  try {
    // Download video from public Supabase Storage URL
    const response = await fetch(videoUrl);
    if (!response.ok) {
      console.warn('[AI Review] Failed to download video for transcription:', response.status);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const file = await toFile(buffer, 'video.mp4', { type: 'video/mp4' });

    const transcription = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'en',
    });

    return transcription.text || null;
  } catch (err: any) {
    console.warn('[AI Review] Whisper transcription failed:', err.message);
    return null;
  }
}

/**
 * Analyze a video thumbnail for inappropriate visual content using GPT-4o vision.
 * Returns a text description of any concerns, or null if clean/failed.
 */
async function analyzeVisualContent(openai: OpenAI, thumbnailUrl: string): Promise<string | null> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a visual content moderator. Briefly describe what you see in this image from a restaurant video recommendation. Note any concerns: inappropriate gestures, nudity, violence, drug use, offensive text/symbols, or anything unsuitable for a business Instagram account. If everything looks fine, say "Clean — shows [brief description]". Keep response under 50 words.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: thumbnailUrl, detail: 'low' },
            },
          ],
        },
      ],
      max_tokens: 100,
    });

    return response.choices[0]?.message?.content || null;
  } catch (err: any) {
    console.warn('[AI Review] Visual analysis failed:', err.message);
    return null;
  }
}

/**
 * Full review pipeline: caption + audio transcript + visual analysis.
 * Runs Whisper transcription and vision analysis in parallel, then combines
 * all signals into a single moderation decision.
 */
export async function reviewRecommendation(
  videoUrl: string,
  thumbnailUrl: string | null,
  caption: string,
  captionTag?: string
): Promise<ReviewResult> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Run transcription and visual analysis in parallel
  const [transcript, visualNotes] = await Promise.all([
    transcribeVideoAudio(openai, videoUrl),
    thumbnailUrl ? analyzeVisualContent(openai, thumbnailUrl) : Promise.resolve(null),
  ]);

  // Build the review content with all available signals
  const reviewParts: string[] = [];

  if (captionTag) {
    reviewParts.push(`Caption tag: ${captionTag}`);
  }
  reviewParts.push(`Written caption: ${caption || '(no text caption)'}`);

  if (transcript) {
    reviewParts.push(`\nAudio transcript (what the user said in the video):\n"${transcript}"`);
  } else {
    reviewParts.push('\nAudio transcript: (not available — no speech detected or transcription failed)');
  }

  if (visualNotes) {
    reviewParts.push(`\nVisual analysis of video thumbnail:\n${visualNotes}`);
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: REVIEW_SYSTEM_PROMPT },
        { role: 'user', content: reviewParts.join('\n') },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1,
      max_tokens: 300,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { approved: false, notes: 'AI review failed — no response. Needs manual review.', flags: ['ai_error'], transcript: transcript || undefined };
    }

    const parsed = JSON.parse(content) as ReviewResult;
    return {
      approved: parsed.approved === true,
      notes: parsed.notes || '',
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      transcript: transcript || undefined,
    };
  } catch (err: any) {
    console.error('AI review error:', err.message);
    return { approved: false, notes: `AI review error: ${err.message}. Needs manual review.`, flags: ['ai_error'], transcript: transcript || undefined };
  }
}

/**
 * Legacy caption-only review (fallback if video URL is unavailable).
 */
export async function reviewCaption(caption: string, captionTag?: string): Promise<ReviewResult> {
  return reviewRecommendation('', null, caption, captionTag);
}

/**
 * Run full AI review on a newly inserted recommendation and update its ig_status.
 * If approved: sets ig_status='ai_approved' and ig_scheduled_at=now+30min.
 * If rejected: sets ig_status='rejected' with notes.
 */
export async function reviewAndUpdateRecommendation(
  supabase: SupabaseClient,
  recommendationId: string,
  caption: string | null,
  captionTag: string | null,
  videoUrl?: string | null,
  thumbnailUrl?: string | null
): Promise<ReviewResult> {
  // Use full pipeline if video URL is available, otherwise caption-only
  const result = videoUrl
    ? await reviewRecommendation(videoUrl, thumbnailUrl || null, caption || '', captionTag || undefined)
    : await reviewCaption(caption || '', captionTag || undefined);

  const scheduledAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // Build notes including transcript info if available
  let fullNotes = result.notes;
  if (result.transcript) {
    fullNotes += ` | Transcript: "${result.transcript.slice(0, 200)}${result.transcript.length > 200 ? '...' : ''}"`;
  }

  if (result.approved) {
    await supabase
      .from('restaurant_recommendations')
      .update({
        is_visible: true, // Make visible in the app now that it's approved
        ig_status: 'ai_approved',
        ig_scheduled_at: scheduledAt,
        ai_review_notes: fullNotes,
      })
      .eq('id', recommendationId);
  } else {
    await supabase
      .from('restaurant_recommendations')
      .update({
        is_visible: false, // Keep hidden — rejected content never shows in app
        ig_status: 'rejected',
        ai_review_notes: `${fullNotes}${result.flags.length ? ` [Flags: ${result.flags.join(', ')}]` : ''}`,
      })
      .eq('id', recommendationId);
  }

  return result;
}

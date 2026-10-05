import 'server-only';

// ElevenLabs text-to-speech. Optional: without ELEVENLABS_API_KEY the app falls back to the
// device's own voice (Web Speech API) on the client.
const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
// Multilingual model: covers Hindi, Tamil and the other Indic languages we offer.
const MODEL_ID = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

export function narrationAvailable() {
  return !!process.env.ELEVENLABS_API_KEY;
}

export async function narrate(text: string): Promise<ArrayBuffer> {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      // Slower, steadier delivery suits bedtime.
      voice_settings: { stability: 0.7, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true, speed: 0.9 },
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.arrayBuffer();
}

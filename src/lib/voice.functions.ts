import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Voice IDs from ElevenLabs Top Voices
const VOICES: Record<string, { female: string; male: string }> = {
  friendly: { female: "EXAVITQu4vr4xnSDxMaL", male: "JBFqnCBsd6RMkjVDRZzb" }, // Sarah / George
  strict: { female: "XrExE9yKIg1WjnnlVkGX", male: "onwK4e9ZLuTAKqWW03F9" }, // Matilda / Daniel
  faang: { female: "cgSgspJ2msm6clMCkdW9", male: "iP95p4xoKVk53GoZ742B" }, // Jessica / Chris
  founder: { female: "FGY2WhTYpPnrIDTdsKH5", male: "bIHbv24MWmeRgasZH58o" }, // Laura / Will
};

export const speakText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string; persona?: string; voiceGender?: "male" | "female" }) =>
    z.object({
      text: z.string().min(1).max(5000),
      persona: z.string().optional(),
      voiceGender: z.enum(["male", "female"]).optional(),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

    const personaKey = (data.persona && VOICES[data.persona]) ? data.persona : "friendly";
    const gender = data.voiceGender ?? "female";
    const voiceId = VOICES[personaKey][gender];

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: data.text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
        }),
      },
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `TTS failed: ${res.status}`);
    }

    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return { audio: base64, mime: "audio/mpeg" };
  });

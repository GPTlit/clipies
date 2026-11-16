import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { responsesJSON, transcribeAudio, GatewayError } from "./ai.server";
import { dispatchToWorker, workerConfigured } from "./worker.server";
import { checkClipQuota, checkProcessingQuota, getPlan } from "./plans";

function monthStart() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function friendly(e: unknown): never {
  if (e instanceof GatewayError) throw new Error(e.message);
  throw e instanceof Error ? e : new Error("Something went wrong");
}

export const checkQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { minutes: number }) => z.object({ minutes: z.number().min(0) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub } = await supabase.from("subscriptions").select("plan").eq("user_id", userId).maybeSingle();
    const plan = getPlan(sub?.plan);
    const { data: usage } = await supabase.from("usage_records").select("quantity").eq("kind", "processing_minutes").gte("created_at", monthStart());
    const used = (usage ?? []).reduce((a, r) => a + Number(r.quantity), 0);
    return { error: checkProcessingQuota(plan, used, data.minutes), used, limit: plan.processingMinutes };
  });

export const transcribeChunk = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { videoId: string; audio: string; language?: string }) =>
    z.object({ videoId: z.string().uuid(), audio: z.string().max(4_000_000), language: z.string().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: video } = await context.supabase.from("videos").select("id").eq("id", data.videoId).maybeSingle();
    if (!video) throw new Error("Video not found");
    const bin = Uint8Array.from(atob(data.audio), (c) => c.charCodeAt(0));
    try {
      return { text: await transcribeAudio(bin, data.language) };
    } catch (e) { friendly(e); }
  });

const CLIP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["clips"],
  properties: {
    clips: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["start_seconds", "end_seconds", "title", "description", "category", "score", "reason", "hashtags"],
        properties: {
          start_seconds: { type: "number" },
          end_seconds: { type: "number" },
          title: { type: "string" },
          description: { type: "string" },
          category: { type: "string", enum: ["insight", "story", "funny", "opinion", "argument", "surprise", "emotional", "educational", "quote", "high_energy"] },
          score: { type: "integer" },
          reason: { type: "string" },
          hashtags: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
};

type ClipOut = { start_seconds: number; end_seconds: number; title: string; description: string; category: string; score: number; reason: string; hashtags: string[] };

export const detectClips = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { videoId: string; count?: number; minSeconds?: number; maxSeconds?: number }) =>
    z.object({ videoId: z.string().uuid(), count: z.number().int().min(1).max(30).default(10), minSeconds: z.number().min(5).default(20), maxSeconds: z.number().max(180).default(75) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: video } = await supabase.from("videos").select("id,title,duration_seconds,project_id").eq("id", data.videoId).maybeSingle();
    if (!video) throw new Error("Video not found");
    const { data: tr } = await supabase.from("transcripts").select("segments").eq("video_id", data.videoId).maybeSingle();
    const segments = (tr?.segments as { start: number; end: number; text: string; speaker?: string }[] | null) ?? [];
    if (!segments.length) throw new Error("Transcribe the video before finding clips.");

    const { data: sub } = await supabase.from("subscriptions").select("plan").eq("user_id", userId).maybeSingle();
    const { count: usedClips } = await supabase.from("clips").select("id", { count: "exact", head: true }).gte("created_at", monthStart());
    const allowed = checkClipQuota(getPlan(sub?.plan), usedClips ?? 0, data.count);
    if (allowed === 0) throw new Error("You've reached this month's AI clip limit for your plan.");

    const { data: existing } = await supabase.from("clips").select("start_seconds,end_seconds").eq("video_id", data.videoId);
    const transcript = segments.map((s) => `[${s.start.toFixed(1)}-${s.end.toFixed(1)}]${s.speaker ? ` ${s.speaker}:` : ""} ${s.text}`).join("\n");
    const avoid = (existing ?? []).map((c) => `${c.start_seconds}-${c.end_seconds}`).join(", ");

    const job = await supabase.from("processing_jobs").insert({ user_id: userId, video_id: video.id, kind: "detect_moments", status: "running", started_at: new Date().toISOString() }).select("id").single();
    await supabase.from("videos").update({ status: "analyzing" }).eq("id", video.id);
    try {
      const out = await responsesJSON<{ clips: ClipOut[] }>({
        name: "clip_suggestions",
        schema: CLIP_SCHEMA,
        system:
          "You are a senior short-form video editor. From a timestamped transcript, pick self-contained moments that work as vertical social clips: strong opinions, arguments, funny moments, surprising statements, emotional reactions, clear explanations, stories, memorable quotes, high-energy exchanges. Each clip must start at the beginning of a thought and end on a payoff. Use only timestamps inside the transcript. Score 0-100 is your estimate of engagement potential relative to other moments in this video — never a guarantee. The reason must cite what happens in the moment. Titles under 70 characters, descriptions under 200 characters, 3-6 hashtags without spaces. Write in the transcript's language.",
        user: `Video: ${video.title}\nFind ${allowed} clips between ${data.minSeconds} and ${data.maxSeconds} seconds long.${avoid ? ` Do not overlap these existing clips (seconds): ${avoid}.` : ""}\n\nTranscript:\n${transcript.slice(0, 180000)}`,
      });
      const maxT = Number(video.duration_seconds) || segments[segments.length - 1].end;
      const valid = out.clips
        .map((c) => ({ ...c, start_seconds: Math.max(0, c.start_seconds), end_seconds: Math.min(maxT, c.end_seconds) }))
        .filter((c) => c.end_seconds - c.start_seconds >= 3)
        .slice(0, allowed);
      for (const c of valid) {
        const text = segments.filter((s) => s.end > c.start_seconds && s.start < c.end_seconds).map((s) => s.text).join(" ");
        const { data: m } = await supabase.from("detected_moments").insert({ user_id: userId, video_id: video.id, start_seconds: c.start_seconds, end_seconds: c.end_seconds, category: c.category, score: Math.max(0, Math.min(100, c.score)), reason: c.reason }).select("id").single();
        await supabase.from("clips").insert({
          user_id: userId, video_id: video.id, moment_id: m?.id, title: c.title, description: c.description, transcript: text,
          start_seconds: c.start_seconds, end_seconds: c.end_seconds, score: Math.max(0, Math.min(100, c.score)), reason: c.reason,
          category: c.category, hashtags: c.hashtags.map((h) => h.replace(/^#/, "")),
        });
      }
      await supabase.from("processing_jobs").update({ status: "succeeded", progress: 100, finished_at: new Date().toISOString(), result: { clips: valid.length } }).eq("id", job.data!.id);
      await supabase.from("videos").update({ status: "ready" }).eq("id", video.id);
      await supabase.from("projects").update({ status: "ready" }).eq("id", video.project_id);
      await supabase.from("notifications").insert({ user_id: userId, kind: "clips_generated", title: `${valid.length} clips ready`, body: video.title, link: `/videos/${video.id}` });
      return { created: valid.length };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Clip detection failed";
      await supabase.from("processing_jobs").update({ status: "failed", error: msg, finished_at: new Date().toISOString() }).eq("id", job.data!.id);
      await supabase.from("videos").update({ status: "ready" }).eq("id", video.id);
      friendly(e);
    }
  });

const CONTENT_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["titles", "hashtags", "tiktok", "instagram", "youtube", "posting_times", "thumbnail_ideas"],
  properties: {
    titles: { type: "array", items: { type: "string" } },
    hashtags: { type: "array", items: { type: "string" } },
    tiktok: { type: "string" },
    instagram: { type: "string" },
    youtube: { type: "object", additionalProperties: false, required: ["title", "description"], properties: { title: { type: "string" }, description: { type: "string" } } },
    posting_times: { type: "array", items: { type: "object", additionalProperties: false, required: ["platform", "when", "why"], properties: { platform: { type: "string" }, when: { type: "string" }, why: { type: "string" } } } },
    thumbnail_ideas: { type: "array", items: { type: "string" } },
  },
};

export const generateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { clipId: string; tone: string }) =>
    z.object({ clipId: z.string().uuid(), tone: z.enum(["professional", "funny", "educational", "controversial", "storytelling", "casual", "engaging"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: clip } = await supabase.from("clips").select("id,title,transcript,description,video_id").eq("id", data.clipId).maybeSingle();
    if (!clip) throw new Error("Clip not found");
    try {
      const out = await responsesJSON<Record<string, unknown>>({
        name: "clip_content",
        schema: CONTENT_SCHEMA,
        system:
          `You write social copy for short vertical videos. Tone: ${data.tone}. Write distinct copy per platform — TikTok: punchy hook + 1-2 lines; Instagram Reels: hook, short value line, call to action, line breaks; YouTube Shorts: searchable title under 70 chars and a 2-3 sentence description. Give 5 title options, 8 hashtags without '#', 3 posting-time suggestions framed as general audience-activity guidance (not guarantees), and 3 thumbnail concepts. Never promise virality. Match the transcript's language.`,
        user: `Clip title: ${clip.title}\nSummary: ${clip.description ?? ""}\nTranscript:\n${(clip.transcript ?? "").slice(0, 12000)}`,
      });
      const content = { ...out, tone: data.tone, generated_at: new Date().toISOString() };
      await supabase.from("clips").update({ content }).eq("id", clip.id);
      return content;
    } catch (e) { friendly(e); }
  });

export const requestProcessing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { kind: "render" | "diarize" | "reframe"; videoId: string; clipId?: string; payload?: Record<string, unknown> }) =>
    z.object({ kind: z.enum(["render", "diarize", "reframe"]), videoId: z.string().uuid(), clipId: z.string().uuid().optional(), payload: z.record(z.unknown()).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: video } = await supabase.from("videos").select("id,storage_path").eq("id", data.videoId).maybeSingle();
    if (!video) throw new Error("Video not found");
    const configured = workerConfigured();
    const { data: job, error } = await supabase.from("processing_jobs").insert({
      user_id: userId, video_id: video.id, clip_id: data.clipId ?? null, kind: data.kind,
      status: configured ? "queued" : "awaiting_worker",
      payload: { ...(data.payload ?? {}), source: video.storage_path } as never,
      error: configured ? null : "The video processing worker isn't connected yet (RENDER_WORKER_URL).",
    }).select("id").single();
    if (error) throw new Error(error.message);
    if (configured) {
      try {
        await dispatchToWorker({ id: job.id, kind: data.kind, payload: { videoId: video.id, clipId: data.clipId, source: video.storage_path, ...(data.payload ?? {}) } });
      } catch (e) {
        await supabase.from("processing_jobs").update({ status: "failed", error: (e as Error).message }).eq("id", job.id);
        throw e;
      }
    }
    if (data.kind === "render" && data.clipId && configured) await supabase.from("clips").update({ status: "rendering" }).eq("id", data.clipId);
    return { jobId: job.id, configured };
  });

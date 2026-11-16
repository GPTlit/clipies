import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({
  jobId: z.string().uuid(),
  status: z.enum(["running", "succeeded", "failed"]),
  progress: z.number().min(0).max(100).optional(),
  error: z.string().optional(),
  result: z.object({
    renderPath: z.string().optional(),
    speakers: z.array(z.object({ label: z.string(), face_box: z.record(z.unknown()).optional() })).optional(),
  }).passthrough().optional(),
});

/** Called by the external processing worker. Authenticated with WORKER_SHARED_SECRET. */
export const Route = createFileRoute("/api/public/worker/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["WORKER_SHARED_SECRET"];
        if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });
        const b = parsed.data;
        const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
        const { data: job } = await db.from("processing_jobs").select("*").eq("id", b.jobId).maybeSingle();
        if (!job) return new Response("Not found", { status: 404 });
        await db.from("processing_jobs").update({
          status: b.status, progress: b.progress ?? (b.status === "succeeded" ? 100 : job.progress), error: b.error ?? null,
          result: (b.result ?? null) as never, ...(b.status !== "running" ? { finished_at: new Date().toISOString() } : { started_at: job.started_at ?? new Date().toISOString() }),
        }).eq("id", job.id);
        if (b.status === "succeeded" && job.kind === "render" && job.clip_id && b.result?.renderPath) {
          await db.from("clips").update({ status: "rendered", render_path: b.result.renderPath }).eq("id", job.clip_id);
          await db.from("notifications").insert({ user_id: job.user_id, kind: "render_complete", title: "Clip rendered", link: `/editor/${job.clip_id}` });
        }
        if (b.status === "succeeded" && job.kind === "diarize" && job.video_id && b.result?.speakers) {
          await db.from("speakers").delete().eq("video_id", job.video_id).eq("source", "ai");
          await db.from("speakers").insert(b.result.speakers.map((s) => ({ user_id: job.user_id, video_id: job.video_id!, label: s.label, face_box: (s.face_box ?? null) as never, source: "ai" })));
        }
        if (b.status === "failed") await db.from("notifications").insert({ user_id: job.user_id, kind: "job_failed", title: `${job.kind} failed`, body: b.error ?? null });
        if (b.status === "failed" && job.kind === "render" && job.clip_id) await db.from("clips").update({ status: "approved" }).eq("id", job.clip_id);
        return Response.json({ ok: true });
      },
    },
  },
});

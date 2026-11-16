/**
 * Bridge to the external video-processing worker (FFmpeg rendering, speaker diarization,
 * face detection/tracking, reframing). Heavy video work never runs in the web app itself.
 * Configure RENDER_WORKER_URL and WORKER_SHARED_SECRET to enable dispatch; the worker reports
 * back to /api/public/worker/callback with the same secret.
 */
export function workerConfigured() {
  return Boolean(process.env["RENDER_WORKER_URL"] && process.env["WORKER_SHARED_SECRET"]);
}

export async function dispatchToWorker(job: { id: string; kind: string; payload: unknown }) {
  const url = process.env["RENDER_WORKER_URL"];
  const secret = process.env["WORKER_SHARED_SECRET"];
  if (!url || !secret) return { dispatched: false as const };
  const res = await fetch(`${url.replace(/\/$/, "")}/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify(job),
  });
  if (!res.ok) throw new Error(`Processing worker rejected the job (${res.status}).`);
  return { dispatched: true as const };
}

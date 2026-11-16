import { supabase } from "@/integrations/supabase/client";
import * as tus from "tus-js-client";

export async function signedUrl(bucket: string, path: string | null | undefined, expires = 3600) {
  if (!path) return null;
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
  return data?.signedUrl ?? null;
}

export function formatBytes(n: number | null | undefined) {
  if (!n) return "—";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0, v = n;
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v < 10 && i ? 1 : 0)} ${u[i]}`;
}

/** Reads duration, dimensions and a JPEG thumbnail from a local video file in the browser. */
export function probeVideo(file: File): Promise<{ duration: number; width: number; height: number; thumb: Blob | null }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata"; v.muted = true; v.src = url; v.playsInline = true;
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This file can't be read as a video.")); };
    v.onloadedmetadata = () => { v.currentTime = Math.min(5, (v.duration || 1) * 0.1); };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      const w = 480, h = Math.round((v.videoHeight / v.videoWidth) * 480) || 270;
      c.width = w; c.height = h;
      c.getContext("2d")?.drawImage(v, 0, 0, w, h);
      c.toBlob((b) => {
        URL.revokeObjectURL(url);
        resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight, thumb: b });
      }, "image/jpeg", 0.8);
    };
  });
}

/** Resumable (TUS) upload to private storage, with a standard-upload fallback for small files. */
export async function uploadResumable(bucket: string, path: string, file: File, onProgress: (pct: number) => void) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("You're signed out. Sign in again to upload.");
  const base = import.meta.env["VITE_SUPABASE_URL"] as string;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string;
  const viaTus = () =>
    new Promise<void>((resolve, reject) => {
      const up = new tus.Upload(file, {
        endpoint: `${base}/storage/v1/upload/resumable`,
        retryDelays: [0, 2000, 5000, 10000],
        headers: { authorization: `Bearer ${token}`, apikey: key, "x-upsert": "true" },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: { bucketName: bucket, objectName: path, contentType: file.type || "video/mp4", cacheControl: "3600" },
        chunkSize: 6 * 1024 * 1024,
        onError: reject,
        onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
        onSuccess: () => resolve(),
      });
      up.findPreviousUploads().then((prev) => { if (prev[0]) up.resumeFromPreviousUpload(prev[0]); up.start(); });
    });
  try {
    await viaTus();
  } catch (e) {
    if (file.size > 50 * 1024 * 1024) throw e;
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    onProgress(100);
  }
}

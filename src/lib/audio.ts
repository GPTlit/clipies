/**
 * Client-side audio extraction: decodes the video's audio track, resamples to 16 kHz mono and
 * splits it into fixed-length WAV chunks. Each chunk's offset becomes the transcript timestamp.
 */
export const CHUNK_SECONDS = 30;

export async function extractAudioChunks(file: File, onProgress?: (msg: string) => void) {
  onProgress?.("Reading file…");
  const buf = await file.arrayBuffer();
  onProgress?.("Decoding audio…");
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(buf);
  } finally {
    ctx.close();
  }
  const rate = 16000;
  const off = new OfflineAudioContext(1, Math.ceil(decoded.duration * rate), rate);
  const src = off.createBufferSource();
  src.buffer = decoded; src.connect(off.destination); src.start();
  onProgress?.("Resampling…");
  const rendered = await off.startRendering();
  const pcm = rendered.getChannelData(0);
  const per = CHUNK_SECONDS * rate;
  const chunks: { start: number; end: number; wav: Blob; silent: boolean }[] = [];
  for (let i = 0; i < pcm.length; i += per) {
    const slice = pcm.subarray(i, Math.min(i + per, pcm.length));
    let peak = 0;
    for (let j = 0; j < slice.length; j += 50) peak = Math.max(peak, Math.abs(slice[j]));
    chunks.push({ start: i / rate, end: (i + slice.length) / rate, wav: encodeWav(slice, rate), silent: peak < 0.01 });
  }
  return { duration: decoded.duration, chunks };
}

function encodeWav(samples: Float32Array, rate: number): Blob {
  const b = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(b);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVE"); w(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([b], { type: "audio/wav" });
}

export async function blobToBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Peak waveform (0..1) for small files; returns null when the file is too large to decode in-browser. */
export async function computeWaveform(url: string, bars = 400): Promise<number[] | null> {
  const res = await fetch(url);
  const len = Number(res.headers.get("content-length") || 0);
  if (len > 150 * 1024 * 1024) return null;
  const ctx = new AudioContext();
  try {
    const audio = await ctx.decodeAudioData(await res.arrayBuffer());
    const d = audio.getChannelData(0);
    const step = Math.floor(d.length / bars);
    const out: number[] = [];
    for (let i = 0; i < bars; i++) {
      let p = 0;
      for (let j = i * step; j < (i + 1) * step; j += 32) p = Math.max(p, Math.abs(d[j] || 0));
      out.push(p);
    }
    return out;
  } catch { return null; } finally { ctx.close(); }
}

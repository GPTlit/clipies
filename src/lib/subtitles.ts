export interface Segment { start: number; end: number; text: string; speaker?: string | null }
export interface Word { text: string; start: number; end: number }
export interface Cue { start: number; end: number; text: string; words: Word[] }

export interface SubtitleStyle {
  template: "minimal" | "podcast" | "bold" | "word" | "karaoke" | "professional" | "cinematic";
  font: string;
  fontSize: number;
  color: string;
  highlightColor: string;
  position: "top" | "middle" | "bottom";
  background: "none" | "box" | "blur";
  outline: number;
  shadow: boolean;
  animation: "none" | "pop" | "fade" | "slide";
  uppercase: boolean;
  wordsPerLine: number;
  maxChars: number;
}

export const DEFAULT_STYLE: SubtitleStyle = {
  template: "bold", font: "Sora", fontSize: 30, color: "#ffffff", highlightColor: "#facc15",
  position: "bottom", background: "none", outline: 3, shadow: true, animation: "pop",
  uppercase: true, wordsPerLine: 3, maxChars: 24,
};

export const TEMPLATES: Record<SubtitleStyle["template"], Partial<SubtitleStyle>> = {
  minimal: { font: "Manrope", fontSize: 22, outline: 0, shadow: true, uppercase: false, background: "none", animation: "fade", wordsPerLine: 6, maxChars: 36 },
  podcast: { font: "Manrope", fontSize: 24, background: "box", outline: 0, uppercase: false, wordsPerLine: 5, maxChars: 32, animation: "fade" },
  bold: { font: "Sora", fontSize: 32, outline: 4, uppercase: true, wordsPerLine: 3, maxChars: 22, animation: "pop" },
  word: { font: "Sora", fontSize: 40, outline: 4, uppercase: true, wordsPerLine: 1, maxChars: 14, animation: "pop" },
  karaoke: { font: "Sora", fontSize: 30, outline: 3, uppercase: false, wordsPerLine: 4, maxChars: 26, animation: "none" },
  professional: { font: "Manrope", fontSize: 22, background: "blur", outline: 0, uppercase: false, wordsPerLine: 7, maxChars: 40, animation: "fade" },
  cinematic: { font: "Sora", fontSize: 20, outline: 0, shadow: true, uppercase: true, wordsPerLine: 6, maxChars: 38, animation: "fade", position: "bottom" },
};

/**
 * Words inside a time window. Transcription returns segment-level timestamps, so word timings
 * are distributed across each segment proportionally to word length (estimated, not measured).
 */
export function wordsInRange(segments: Segment[], start: number, end: number): Word[] {
  const out: Word[] = [];
  for (const s of segments) {
    if (s.end <= start || s.start >= end) continue;
    const tokens = s.text.split(/\s+/).filter(Boolean);
    const total = tokens.reduce((a, t) => a + t.length + 1, 0) || 1;
    let t = s.start;
    const dur = s.end - s.start;
    for (const tok of tokens) {
      const d = (dur * (tok.length + 1)) / total;
      const w = { text: tok, start: t, end: t + d };
      t += d;
      if (w.end > start && w.start < end) out.push(w);
    }
  }
  return out;
}

export function buildCues(words: Word[], wordsPerLine: number, maxChars: number, offset = 0): Cue[] {
  const cues: Cue[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (!cur.length) return;
    cues.push({
      start: Math.max(0, cur[0].start - offset),
      end: Math.max(0, cur[cur.length - 1].end - offset),
      text: cur.map((w) => w.text).join(" "),
      words: cur.map((w) => ({ ...w, start: w.start - offset, end: w.end - offset })),
    });
    cur = [];
  };
  for (const w of words) {
    const nextLen = [...cur, w].map((x) => x.text).join(" ").length;
    if (cur.length >= Math.max(1, wordsPerLine) || (cur.length > 0 && nextLen > maxChars)) flush();
    cur.push(w);
  }
  flush();
  return cues;
}

function ts(sec: number, sep: "," | ".") {
  const ms = Math.round(Math.max(0, sec) * 1000);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  const p = (n: number, l = 2) => String(n).padStart(l, "0");
  return `${p(h)}:${p(m)}:${p(s)}${sep}${p(r, 3)}`;
}

export function toSRT(cues: Pick<Cue, "start" | "end" | "text">[]): string {
  return cues.map((c, i) => `${i + 1}\n${ts(c.start, ",")} --> ${ts(c.end, ",")}\n${c.text}\n`).join("\n");
}

export function toVTT(cues: Pick<Cue, "start" | "end" | "text">[]): string {
  return "WEBVTT\n\n" + cues.map((c) => `${ts(c.start, ".")} --> ${ts(c.end, ".")}\n${c.text}\n`).join("\n");
}

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${m}:${String(r).padStart(2, "0")}`;
}

export function download(filename: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

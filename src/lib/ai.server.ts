const GATEWAY = "https://ai.gateway.lovable.dev/v1";
export const CHAT_MODEL = "openai/gpt-6.1-sol";
export const STT_MODEL = "openai/gpt-transcribe";

export class GatewayError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function key() {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new GatewayError(401, "AI is not configured (missing LOVABLE_API_KEY).");
  return k;
}

async function failure(res: Response): Promise<GatewayError> {
  let msg = `AI request failed (${res.status})`;
  try { const j = await res.json(); msg = j?.error?.message || j?.message || msg; } catch { /* ignore */ }
  if (res.status === 402) msg = "AI credits are exhausted. Add credits to your workspace to continue.";
  if (res.status === 429) msg = "AI is rate limited right now. Please try again in a minute.";
  return new GatewayError(res.status, msg);
}

async function readSSE(res: Response, onEvent: (type: string, data: Record<string, unknown>) => void) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i); buf = buf.slice(i + 2);
      const line = frame.split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trim()).join("");
      if (!line || line === "[DONE]") continue;
      try { const d = JSON.parse(line); onEvent(String(d.type ?? ""), d); } catch { /* partial */ }
    }
  }
}

/** Streams a Responses call with a strict JSON schema and returns the parsed object. */
export async function responsesJSON<T>(opts: { system: string; user: string; name: string; schema: Record<string, unknown> }): Promise<T> {
  const res = await fetch(`${GATEWAY}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key(), "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      input: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
      text: { format: { type: "json_schema", name: opts.name, strict: true, schema: opts.schema } },
    }),
  });
  if (!res.ok || !res.body) throw await failure(res);
  let text = "";
  let err: string | null = null;
  let refused = false;
  await readSSE(res, (type, d) => {
    if (type === "response.output_text.delta") text += String(d["delta"] ?? "");
    if (type === "response.refusal.delta") refused = true;
    if (type === "error" || type === "response.failed") err = (d as { message?: string }).message ?? "AI request failed";
  });
  if (refused) throw new GatewayError(422, "The AI declined to process this content.");
  if (err) throw new GatewayError(500, err);
  if (!text) throw new GatewayError(500, "The AI returned an empty answer.");
  return JSON.parse(text) as T;
}

/** Transcribes one audio chunk (WAV). Returns plain text — this endpoint provides no timestamps. */
export async function transcribeAudio(wav: Uint8Array, language?: string): Promise<string> {
  const form = new FormData();
  form.append("model", STT_MODEL);
  form.append("file", new Blob([wav as unknown as BlobPart], { type: "audio/wav" }), "chunk.wav");
  form.append("response_format", "json");
  form.append("stream", "true");
  if (language && language !== "auto") form.append("languages", language);
  const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key()}` },
    body: form,
  });
  if (!res.ok || !res.body) throw await failure(res);
  let text = "", final: string | null = null;
  await readSSE(res, (type, d) => {
    if (type === "transcript.text.delta") text += String(d["delta"] ?? "");
    if (type === "transcript.text.done") final = String(d["text"] ?? "");
  });
  return (final ?? text).trim();
}

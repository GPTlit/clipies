import type { Platform } from "./social.config";

interface TokenSet { access_token: string; refresh_token?: string | null; expires_in?: number | null }
interface Profile { external_id: string; username: string; avatar_url?: string | null; scopes: string[] }

export function redirectUri(origin: string, p: Platform) {
  return `${origin}/api/public/oauth/${p}/callback`;
}

export function authorizeUrl(p: Platform, origin: string, state: string): string {
  const r = redirectUri(origin, p);
  if (p === "youtube") {
    const q = new URLSearchParams({ client_id: process.env["YOUTUBE_CLIENT_ID"]!, redirect_uri: r, response_type: "code", access_type: "offline", prompt: "consent", include_granted_scopes: "true", state, scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly" });
    return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
  }
  if (p === "tiktok") {
    const q = new URLSearchParams({ client_key: process.env["TIKTOK_CLIENT_KEY"]!, redirect_uri: r, response_type: "code", state, scope: "user.info.basic,video.publish,video.upload" });
    return `https://www.tiktok.com/v2/auth/authorize/?${q}`;
  }
  if (p === "instagram") {
    const q = new URLSearchParams({ client_id: process.env["INSTAGRAM_APP_ID"]!, redirect_uri: r, response_type: "code", state, scope: "instagram_business_basic,instagram_business_content_publish" });
    return `https://www.instagram.com/oauth/authorize?${q}`;
  }
  throw new Error("This platform has no supported OAuth publishing flow.");
}

async function json(res: Response) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error_description || j?.error?.message || j?.message || `Request failed (${res.status})`);
  return j;
}

export async function exchangeCode(p: Platform, origin: string, code: string): Promise<{ tokens: TokenSet; profile: Profile }> {
  const r = redirectUri(origin, p);
  if (p === "youtube") {
    const t = await json(await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: process.env["YOUTUBE_CLIENT_ID"]!, client_secret: process.env["YOUTUBE_CLIENT_SECRET"]!, redirect_uri: r, grant_type: "authorization_code" }) }));
    const ch = await json(await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${t.access_token}` } }));
    const c = ch.items?.[0];
    if (!c) throw new Error("This Google account has no YouTube channel.");
    return { tokens: t, profile: { external_id: c.id, username: c.snippet?.customUrl || c.snippet?.title, avatar_url: c.snippet?.thumbnails?.default?.url, scopes: String(t.scope ?? "").split(" ") } };
  }
  if (p === "tiktok") {
    const t = await json(await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_key: process.env["TIKTOK_CLIENT_KEY"]!, client_secret: process.env["TIKTOK_CLIENT_SECRET"]!, code, grant_type: "authorization_code", redirect_uri: r }) }));
    const u = await json(await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url", { headers: { Authorization: `Bearer ${t.access_token}` } }));
    return { tokens: t, profile: { external_id: t.open_id, username: u.data?.user?.display_name ?? "TikTok user", avatar_url: u.data?.user?.avatar_url, scopes: String(t.scope ?? "").split(",") } };
  }
  if (p === "instagram") {
    const short = await json(await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: new URLSearchParams({ client_id: process.env["INSTAGRAM_APP_ID"]!, client_secret: process.env["INSTAGRAM_APP_SECRET"]!, grant_type: "authorization_code", redirect_uri: r, code }) }));
    const long = await json(await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env["INSTAGRAM_APP_SECRET"]}&access_token=${short.access_token}`));
    const me = await json(await fetch(`https://graph.instagram.com/me?fields=user_id,username,profile_picture_url&access_token=${long.access_token}`));
    return { tokens: { access_token: long.access_token, expires_in: long.expires_in }, profile: { external_id: String(me.user_id ?? short.user_id), username: me.username, avatar_url: me.profile_picture_url, scopes: String(short.permissions ?? "").split(",") } };
  }
  throw new Error("Unsupported platform");
}

export async function refreshAccess(p: Platform, refresh: string): Promise<TokenSet> {
  if (p === "youtube") return json(await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: process.env["YOUTUBE_CLIENT_ID"]!, client_secret: process.env["YOUTUBE_CLIENT_SECRET"]!, refresh_token: refresh, grant_type: "refresh_token" }) }));
  if (p === "tiktok") return json(await fetch("https://open.tiktokapis.com/v2/oauth/token/", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_key: process.env["TIKTOK_CLIENT_KEY"]!, client_secret: process.env["TIKTOK_CLIENT_SECRET"]!, grant_type: "refresh_token", refresh_token: refresh }) }));
  if (p === "instagram") return json(await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refresh}`));
  throw new Error("Unsupported platform");
}

/** Publishes a rendered clip. Returns the platform's post id once the platform confirms it. */
export async function publishToPlatform(p: Platform, token: string, externalId: string, videoUrl: string, caption: string, title: string): Promise<{ id: string; url?: string; pending?: boolean }> {
  if (p === "youtube") {
    const video = await fetch(videoUrl);
    if (!video.ok) throw new Error("Couldn't read the rendered clip.");
    const bytes = await video.arrayBuffer();
    const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Upload-Content-Type": "video/mp4", "X-Upload-Content-Length": String(bytes.byteLength) },
      body: JSON.stringify({ snippet: { title: title.slice(0, 100), description: `${caption}\n#Shorts` }, status: { privacyStatus: "public", selfDeclaredMadeForKids: false } }),
    });
    if (!init.ok) throw new Error((await init.json().catch(() => ({})))?.error?.message || "YouTube refused the upload");
    const up = await json(await fetch(init.headers.get("location")!, { method: "PUT", headers: { "Content-Type": "video/mp4" }, body: bytes }));
    return { id: up.id, url: `https://youtube.com/shorts/${up.id}` };
  }
  if (p === "tiktok") {
    const r = await json(await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ post_info: { title: caption.slice(0, 2200), privacy_level: "SELF_ONLY" }, source_info: { source: "PULL_FROM_URL", video_url: videoUrl } }),
    }));
    const publishId = r.data?.publish_id;
    // TikTok processes asynchronously; confirm via status fetch.
    const s = await json(await fetch("https://open.tiktokapis.com/v2/post/publish/status/fetch/", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ publish_id: publishId }) }));
    if (s.data?.status === "PUBLISH_COMPLETE") return { id: s.data?.publicaly_available_post_id?.[0] ?? publishId };
    if (s.data?.status === "FAILED") throw new Error(`TikTok failed: ${s.data?.fail_reason}`);
    return { id: publishId, pending: true };
  }
  if (p === "instagram") {
    const base = "https://graph.instagram.com/v21.0";
    const c = await json(await fetch(`${base}/${externalId}/media`, { method: "POST", body: new URLSearchParams({ media_type: "REELS", video_url: videoUrl, caption, access_token: token }) }));
    for (let i = 0; i < 10; i++) {
      const st = await json(await fetch(`${base}/${c.id}?fields=status_code&access_token=${token}`));
      if (st.status_code === "FINISHED") break;
      if (st.status_code === "ERROR") throw new Error("Instagram couldn't process the video.");
      if (i === 9) return { id: c.id, pending: true };
      await new Promise((r) => setTimeout(r, 3000));
    }
    const pub = await json(await fetch(`${base}/${externalId}/media_publish`, { method: "POST", body: new URLSearchParams({ creation_id: c.id, access_token: token }) }));
    return { id: pub.id };
  }
  throw new Error("Snapchat has no publishing API — download the clip and post it manually.");
}

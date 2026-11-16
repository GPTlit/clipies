import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { publishToPlatform, refreshAccess } from "./social.server";
import type { Platform } from "./social.config";

const MAX_ATTEMPTS = 3;

/** Publishes one scheduled post using the admin client. Never marks published without platform confirmation. */
export async function publishPost(admin: SupabaseClient<Database>, postId: string) {
  const { data: post } = await admin.from("scheduled_posts").select("*, clips(title, render_path, hashtags)").eq("id", postId).single();
  if (!post) return;
  const log = (level: string, message: string) => admin.from("publishing_logs").insert({ user_id: post.user_id, scheduled_post_id: post.id, level, message });
  const fail = async (msg: string, retry: boolean) => {
    const attempts = post.attempts + 1;
    const willRetry = retry && attempts < MAX_ATTEMPTS;
    await admin.from("scheduled_posts").update({
      status: willRetry ? "scheduled" : "failed", attempts, last_error: msg,
      ...(willRetry ? { scheduled_at: new Date(Date.now() + attempts * 10 * 60000).toISOString() } : {}),
    }).eq("id", post.id);
    await log("error", msg + (willRetry ? ` — retry ${attempts}/${MAX_ATTEMPTS - 1} scheduled` : ""));
    if (!willRetry) await admin.from("notifications").insert({ user_id: post.user_id, kind: "publish_failed", title: `Publishing to ${post.platform} failed`, body: msg, link: "/calendar" });
  };

  await admin.from("scheduled_posts").update({ status: "publishing" }).eq("id", post.id);
  await log("info", "Publishing started");
  const clip = post.clips as { title: string; render_path: string | null; hashtags: string[] } | null;
  if (!clip?.render_path) return fail("This clip hasn't been rendered yet. Render it in the editor first.", false);
  if (!post.social_account_id) return fail("No social account selected.", false);
  const { data: acct } = await admin.from("social_accounts").select("*").eq("id", post.social_account_id).single();
  const { data: tok } = await admin.from("social_account_tokens").select("*").eq("account_id", post.social_account_id).single();
  if (!acct || !tok) return fail("The social account is disconnected. Reconnect it.", false);

  let access = tok.access_token;
  try {
    if (tok.expires_at && new Date(tok.expires_at).getTime() < Date.now() + 60000) {
      const r = await refreshAccess(acct.platform as Platform, tok.refresh_token ?? tok.access_token);
      access = r.access_token;
      await admin.from("social_account_tokens").update({ access_token: r.access_token, refresh_token: r.refresh_token ?? tok.refresh_token, expires_at: r.expires_in ? new Date(Date.now() + r.expires_in * 1000).toISOString() : null }).eq("account_id", acct.id);
    }
    const { data: signed } = await admin.storage.from("renders").createSignedUrl(clip.render_path, 3600);
    if (!signed) return fail("Couldn't access the rendered file.", false);
    const caption = [post.caption ?? clip.title, clip.hashtags.map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n");
    const res = await publishToPlatform(acct.platform as Platform, access, acct.external_id, signed.signedUrl, caption, clip.title);
    if (res.pending) {
      await admin.from("scheduled_posts").update({ status: "processing" }).eq("id", post.id);
      await log("info", `Platform accepted the upload (${res.id}); waiting for confirmation.`);
      return;
    }
    await admin.from("published_posts").insert({ user_id: post.user_id, scheduled_post_id: post.id, clip_id: post.clip_id, platform: post.platform, external_post_id: res.id, url: res.url ?? null });
    await admin.from("scheduled_posts").update({ status: "published", last_error: null }).eq("id", post.id);
    await log("info", `Published (${res.id})`);
    await admin.from("notifications").insert({ user_id: post.user_id, kind: "publish_succeeded", title: `Published to ${post.platform}`, body: clip.title, link: "/calendar" });
  } catch (e) {
    await fail((e as Error).message, true);
  }
}

export async function processDuePosts(admin: SupabaseClient<Database>, limit = 10) {
  const { data } = await admin.from("scheduled_posts").select("id").eq("status", "scheduled").lte("scheduled_at", new Date().toISOString()).order("scheduled_at").limit(limit);
  for (const p of data ?? []) await publishPost(admin, p.id);
  return data?.length ?? 0;
}

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLATFORM_META, PLATFORMS, type Platform } from "./social.config";
import { authorizeUrl } from "./social.server";
import { canConnectAnotherAccount, getPlan } from "./plans";

export const getPlatformStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    return PLATFORMS.map((p) => {
      const missing = PLATFORM_META[p].secrets.filter((s) => !process.env[s]);
      return { platform: p, configured: PLATFORM_META[p].publishing === "direct" && missing.length === 0, missing };
    });
  });

export const startOAuth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { platform: Platform }) => z.object({ platform: z.enum(["tiktok", "instagram", "youtube", "snapchat"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const meta = PLATFORM_META[data.platform];
    if (meta.publishing !== "direct") throw new Error(meta.note);
    const missing = meta.secrets.filter((s) => !process.env[s]);
    if (missing.length) throw new Error(`${meta.name} isn't configured yet. Missing: ${missing.join(", ")}`);
    const { data: sub } = await context.supabase.from("subscriptions").select("plan").eq("user_id", context.userId).maybeSingle();
    const { count } = await context.supabase.from("social_accounts").select("id", { count: "exact", head: true });
    if (!canConnectAnotherAccount(getPlan(sub?.plan), count ?? 0)) throw new Error("Your plan's social account limit is reached. Upgrade to connect more.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const state = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, "");
    await supabaseAdmin.from("oauth_states").insert({ state, user_id: context.userId, platform: data.platform });
    const origin = new URL(getRequest().url).origin;
    return { url: authorizeUrl(data.platform, origin, state) };
  });

export const publishNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { postId: string }) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: own } = await context.supabase.from("scheduled_posts").select("id").eq("id", data.postId).maybeSingle();
    if (!own) throw new Error("Post not found");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { publishPost } = await import("./publish.server");
    await publishPost(supabaseAdmin, data.postId);
    const { data: after } = await context.supabase.from("scheduled_posts").select("status,last_error").eq("id", data.postId).single();
    return after;
  });

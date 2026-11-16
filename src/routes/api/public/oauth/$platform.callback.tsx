import { createFileRoute } from "@tanstack/react-router";
import { exchangeCode } from "@/lib/social.server";
import type { Platform } from "@/lib/social.config";

export const Route = createFileRoute("/api/public/oauth/$platform/callback")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const back = (q: string) => Response.redirect(`${url.origin}/accounts?${q}`, 302);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (url.searchParams.get("error")) return back(`error=${encodeURIComponent(url.searchParams.get("error_description") || "Authorization was cancelled")}`);
        if (!code || !state) return back("error=Missing+authorization+code");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: st } = await supabaseAdmin.from("oauth_states").select("*").eq("state", state).maybeSingle();
        if (!st || st.platform !== params.platform || Date.now() - new Date(st.created_at).getTime() > 15 * 60000) return back("error=Authorization+expired.+Try+again.");
        await supabaseAdmin.from("oauth_states").delete().eq("state", state);
        try {
          const { tokens, profile } = await exchangeCode(params.platform as Platform, url.origin, code);
          const { data: acct, error } = await supabaseAdmin.from("social_accounts").upsert({
            user_id: st.user_id, platform: params.platform, external_id: profile.external_id, username: profile.username,
            avatar_url: profile.avatar_url ?? null, scopes: profile.scopes.filter(Boolean), status: "connected",
          }, { onConflict: "user_id,platform,external_id" }).select("id").single();
          if (error) throw error;
          await supabaseAdmin.from("social_account_tokens").upsert({
            account_id: acct.id, access_token: tokens.access_token, refresh_token: tokens.refresh_token ?? null,
            expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
          });
          return back(`connected=${params.platform}`);
        } catch (e) {
          return back(`error=${encodeURIComponent((e as Error).message)}`);
        }
      },
    },
  },
});

export type Platform = "tiktok" | "instagram" | "youtube" | "snapchat";

export const PLATFORM_META: Record<Platform, { name: string; secrets: string[]; publishing: "direct" | "unsupported"; note: string }> = {
  tiktok: { name: "TikTok", secrets: ["TIKTOK_CLIENT_KEY", "TIKTOK_CLIENT_SECRET"], publishing: "direct", note: "Content Posting API. Unaudited apps can only post privately until TikTok approves your app." },
  instagram: { name: "Instagram", secrets: ["INSTAGRAM_APP_ID", "INSTAGRAM_APP_SECRET"], publishing: "direct", note: "Requires an Instagram Business or Creator account. Reels are published through the Graph API." },
  youtube: { name: "YouTube", secrets: ["YOUTUBE_CLIENT_ID", "YOUTUBE_CLIENT_SECRET"], publishing: "direct", note: "Uploads as YouTube Shorts via the YouTube Data API. Unverified apps upload as private." },
  snapchat: { name: "Snapchat", secrets: [], publishing: "unsupported", note: "Snapchat doesn't offer a public publishing API for creators. Download the rendered clip and post it from the Snapchat app." },
};

export const PLATFORMS = Object.keys(PLATFORM_META) as Platform[];

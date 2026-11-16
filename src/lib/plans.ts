export type PlanId = "free" | "pro" | "agency";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthly: number;
  processingMinutes: number;
  clipsPerMonth: number | null; // null = unlimited
  socialAccounts: number;
  watermark: boolean;
  maxExportHeight: number;
  premiumSubtitles: boolean;
  advancedSpeakerTracking: boolean;
  scheduling: boolean;
  teamMembers: number;
  brands: number;
  priority: boolean;
  features: string[];
}

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free", name: "Free", priceMonthly: 0, processingMinutes: 60, clipsPerMonth: 30,
    socialAccounts: 1, watermark: true, maxExportHeight: 720, premiumSubtitles: false,
    advancedSpeakerTracking: false, scheduling: false, teamMembers: 1, brands: 1, priority: false,
    features: ["60 processing minutes / month", "30 AI clips / month", "Basic subtitles", "Watermarked 720p exports"],
  },
  pro: {
    id: "pro", name: "Pro", priceMonthly: 29, processingMinutes: 600, clipsPerMonth: 300,
    socialAccounts: 5, watermark: false, maxExportHeight: 1080, premiumSubtitles: true,
    advancedSpeakerTracking: true, scheduling: true, teamMembers: 1, brands: 1, priority: false,
    features: ["600 processing minutes / month", "300 AI clips / month", "Premium animated subtitles", "Advanced speaker tracking", "1080p exports, no watermark", "Content scheduling", "Up to 5 social accounts"],
  },
  agency: {
    id: "agency", name: "Agency", priceMonthly: 99, processingMinutes: 3000, clipsPerMonth: null,
    socialAccounts: 25, watermark: false, maxExportHeight: 2160, premiumSubtitles: true,
    advancedSpeakerTracking: true, scheduling: true, teamMembers: 10, brands: 10, priority: true,
    features: ["3,000 processing minutes / month", "Unlimited AI clips", "Multiple workspaces & brands", "Up to 10 team members", "Batch processing", "Advanced analytics", "Priority processing"],
  },
};

export function getPlan(id: string | null | undefined): Plan {
  return PLANS[(id as PlanId) in PLANS ? (id as PlanId) : "free"];
}

/** Returns null when allowed, or a human-readable reason when the quota would be exceeded. */
export function checkProcessingQuota(plan: Plan, usedMinutes: number, requestedMinutes: number): string | null {
  if (usedMinutes + requestedMinutes > plan.processingMinutes) {
    const left = Math.max(0, plan.processingMinutes - usedMinutes);
    return `This video needs ${Math.ceil(requestedMinutes)} min but your ${plan.name} plan has ${Math.floor(left)} min left this month.`;
  }
  return null;
}

export function checkClipQuota(plan: Plan, usedClips: number, requested: number): number {
  if (plan.clipsPerMonth === null) return requested;
  return Math.max(0, Math.min(requested, plan.clipsPerMonth - usedClips));
}

export function canConnectAnotherAccount(plan: Plan, connected: number): boolean {
  return connected < plan.socialAccounts;
}

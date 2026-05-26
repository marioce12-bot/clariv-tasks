import type { Timestamp } from "firebase/firestore";

export type BrandIdentity = {
  domain?: string;
  perception?: string;
  descriptors?: string;
  style?: string;
  inspiration?: string;
  pseudo?: string;
  brand_voice?: string;
  style_tone?: string;
};

export type UserConfig = {
  pseudo?: string;
  brand_identity?: BrandIdentity;
  brand_voice?: string;
  style_tone?: string;
  fb_page_id?: string;
  preferred_posting_time?: string;
  timezone?: string;
  fcm_token?: string;
  paused?: boolean;
};

export type JournalEntry = {
  uid: string;
  text: string;
  createdAt: Timestamp;
  processed: boolean;
};

export type GeneratedPost = {
  uid: string;
  text: string;
  media_url?: string;
  media_prompt?: string;
  scheduled_at: Timestamp;
  status: "pending_review" | "approved" | "published" | "failed";
  notified_30min: boolean;
  fb_post_id?: string;
  createdAt: Timestamp;
  error?: string;
};

export type WeeklyAnalytics = {
  uid: string;
  week_start: Timestamp;
  posts_stats: Array<Record<string, unknown>>;
  best_hour?: string;
  best_format?: string;
  avg_engagement?: number;
  ai_recommendations?: string;
};

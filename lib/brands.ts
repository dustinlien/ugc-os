export type Brand = {
  id: string;
  user_id: string;
  name: string;
  slug: string;
  color: string;
  monthly_quota: number;
  quota_start_day: number;
  pay_rate_cents: number;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

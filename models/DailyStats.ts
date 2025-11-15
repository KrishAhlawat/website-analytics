/**
 * DailyStats Model
 * 
 * Aggregated analytics data per site per day
 * Used for fast reporting without scanning raw events
 */

export interface DailyStats {
  site_id: string;
  date: string; // Format: "YYYY-MM-DD"
  total_views: number;
  unique_users: string[];
  path_counts: Record<string, number>;
  updated_at?: Date;
}

export interface PathView {
  path: string;
  views: number;
}

export interface StatsResponse {
  site_id: string;
  date: string;
  total_views: number;
  unique_users: number;
  top_paths: PathView[];
}

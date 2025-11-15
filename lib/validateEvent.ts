import { z } from 'zod';

// Event validation schema
export const EventSchema = z.object({
  // site_id will be injected from API key; optional in payload
  site_id: z.string().min(1, 'site_id is required').max(100).optional(),
  event_type: z.string().min(1, 'event_type is required').max(50),
  path: z.string().min(1, 'path is required').max(500),
  user_id: z.string().min(1, 'user_id is required').max(100),
  timestamp: z.string().datetime().optional(),
});

export type EventInput = z.infer<typeof EventSchema>;

// Validate event and return normalized data
export function validateEvent(data: unknown): { 
  success: boolean; 
  data?: EventInput; 
  errors?: z.ZodError;
} {
  try {
    const validated = EventSchema.parse(data);
    
    // Add timestamp if not provided
    if (!validated.timestamp) {
      validated.timestamp = new Date().toISOString();
    }
    
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

// Stats query validation
export const StatsQuerySchema = z.object({
  site_id: z.string().min(1, 'site_id is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be in YYYY-MM-DD format').optional(),
});

export type StatsQuery = z.infer<typeof StatsQuerySchema>;

// Validate stats query
export function validateStatsQuery(data: unknown): {
  success: boolean;
  data?: StatsQuery;
  errors?: z.ZodError;
} {
  try {
    const validated = StatsQuerySchema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error };
    }
    throw error;
  }
}

// Type definitions
export interface AnalyticsEvent {
  site_id?: string;
  event_type: string;
  path: string;
  user_id: string;
  timestamp: string;
}

export interface DailyStatsResponse {
  site_id: string;
  date: string;
  total_views: number;
  unique_users_count: number;
  top_paths: Array<{
    path: string;
    views: number;
  }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

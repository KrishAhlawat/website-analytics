/**
 * Event Model
 * 
 * Represents a raw analytics event captured from client-side tracking
 */

export interface Event {
  site_id: string;
  event_type: string;
  path: string;
  user_id: string;
  timestamp: Date;
  processed_at?: Date;
}

export interface EventInput {
  site_id?: string; // Optional in input, will be injected from API key
  event_type: string;
  path: string;
  user_id: string;
  timestamp?: string; // ISO string, will be converted to Date
}

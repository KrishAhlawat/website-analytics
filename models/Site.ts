/**
 * Site Model
 * 
 * Represents a registered website/application using the analytics platform
 * Each site has a unique API key for authentication
 */

export interface Site {
  site_id: string;
  api_key: string;
  name: string;
  created_at: Date;
}

export interface CreateSiteRequest {
  name: string;
}

export interface CreateSiteResponse {
  site_id: string;
  api_key: string;
  name: string;
  created_at: string;
}

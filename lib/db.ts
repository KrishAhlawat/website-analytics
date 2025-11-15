import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/analytics';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: CachedConnection | undefined;
}

let cached: CachedConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('[DB] MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('[DB] MongoDB connection error:', e);
    throw e;
  }

  return cached.conn;
}

// Event Schema - Raw events
const EventSchema = new mongoose.Schema({
  site_id: { type: String, required: true, index: true },
  event_type: { type: String, required: true },
  path: { type: String, required: true },
  user_id: { type: String, required: true },
  timestamp: { type: Date, required: true, index: true },
  processed_at: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Daily Stats Schema - Aggregated data
const DailyStatsSchema = new mongoose.Schema({
  site_id: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD format
  total_views: { type: Number, default: 0 },
  unique_users: { type: [String], default: [] },
  path_counts: {
    type: Map,
    of: Number,
    default: new Map(),
  },
  updated_at: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// Compound index for efficient queries
DailyStatsSchema.index({ site_id: 1, date: 1 }, { unique: true });
EventSchema.index({ site_id: 1, timestamp: -1 });

// Models
export const Event = mongoose.models.Event || mongoose.model('Event', EventSchema);
export const DailyStats = mongoose.models.DailyStats || mongoose.model('DailyStats', DailyStatsSchema);

// Sites Schema - for API key management
const SiteSchema = new mongoose.Schema({
  site_id: { type: String, required: true, unique: true, index: true },
  api_key: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  user_id: { type: String, required: false, index: true }, // Owner user ID (for multi-user support)
  created_at: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

export const Site = mongoose.models.Site || mongoose.model('Site', SiteSchema);

// User Schema - for authentication
const UserSchema = new mongoose.Schema({
  name: { type: String },
  email: { type: String, required: true, unique: true, index: true },
  emailVerified: { type: Date },
  image: { type: String },
  password: { type: String }, // hashed password
  created_at: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

export const User = mongoose.models.User || mongoose.model('User', UserSchema);

// Session Schema - for session tracking
const SessionSchema = new mongoose.Schema({
  session_id: { type: String, required: true, unique: true, index: true },
  site_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true },
  started_at: { type: Date, required: true },
  last_activity: { type: Date, required: true },
  page_count: { type: Number, default: 0 },
  referrer: { type: String },
  user_agent: { type: String },
}, {
  timestamps: true,
});

SessionSchema.index({ site_id: 1, started_at: -1 });
SessionSchema.index({ last_activity: 1 }); // For cleanup

export const Session = mongoose.models.Session || mongoose.model('Session', SessionSchema);

// Hourly Stats Schema - for granular analytics
const HourlyStatsSchema = new mongoose.Schema({
  site_id: { type: String, required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  hour: { type: Number, required: true, min: 0, max: 23 },
  views: { type: Number, default: 0 },
  unique_users: { type: [String], default: [] },
  path_counts: {
    type: Map,
    of: Number,
    default: new Map(),
  },
  updated_at: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

HourlyStatsSchema.index({ site_id: 1, date: 1, hour: 1 }, { unique: true });

export const HourlyStats = mongoose.models.HourlyStats || mongoose.model('HourlyStats', HourlyStatsSchema);

// Insights Schema - for automated analytics insights
const InsightSchema = new mongoose.Schema({
  site_id: { type: String, required: true, index: true },
  type: { type: String, required: true }, // 'spike', 'drop', 'anomaly'
  severity: { type: String, required: true }, // 'low', 'medium', 'high'
  title: { type: String, required: true },
  description: { type: String, required: true },
  metric: { type: String, required: true }, // 'views', 'users', etc.
  value: { type: Number, required: true },
  expected_value: { type: Number },
  detected_at: { type: Date, default: Date.now },
  date: { type: String, required: true }, // YYYY-MM-DD
  acknowledged: { type: Boolean, default: false },
}, {
  timestamps: true,
});

InsightSchema.index({ site_id: 1, detected_at: -1 });
InsightSchema.index({ acknowledged: 1 });

export const Insight = mongoose.models.Insight || mongoose.model('Insight', InsightSchema);

// Type exports
export interface IEvent {
  site_id: string;
  event_type: string;
  path: string;
  user_id: string;
  timestamp: Date;
  processed_at?: Date;
}

export interface IDailyStats {
  site_id: string;
  date: string;
  total_views: number;
  unique_users: string[];
  path_counts: Map<string, number>;
  updated_at: Date;
}

export interface ISite {
  site_id: string;
  api_key: string;
  name: string;
  user_id?: string;
  created_at?: Date;
}

export interface IUser {
  _id?: string;
  name?: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  password?: string;
  created_at?: Date;
}

export interface ISession {
  session_id: string;
  site_id: string;
  user_id: string;
  started_at: Date;
  last_activity: Date;
  page_count: number;
  referrer?: string;
  user_agent?: string;
}

export interface IHourlyStats {
  site_id: string;
  date: string;
  hour: number;
  views: number;
  unique_users: string[];
  path_counts: Map<string, number>;
  updated_at: Date;
}

export interface IInsight {
  site_id: string;
  type: 'spike' | 'drop' | 'anomaly';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  metric: string;
  value: number;
  expected_value?: number;
  detected_at: Date;
  date: string;
  acknowledged: boolean;
}

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

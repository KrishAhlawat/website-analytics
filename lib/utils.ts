// Utility functions for the analytics platform

// Format date to YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get date 24 hours ago
export function get24HoursAgo(): Date {
  const date = new Date();
  date.setHours(date.getHours() - 24);
  return date;
}

// Get current date in YYYY-MM-DD format
export function getCurrentDate(): string {
  return formatDate(new Date());
}

// Parse date string to Date object
export function parseDate(dateStr: string): Date {
  return new Date(dateStr);
}

// Log with timestamp
export function logWithTimestamp(message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

// Error logger
export function logError(context: string, error: any): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] [ERROR] ${context}:`, {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
}

// Performance timer
export class PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
  }

  end(): number {
    const duration = Date.now() - this.startTime;
    console.log(`[PERF] ${this.label}: ${duration}ms`);
    return duration;
  }
}

import { connection as redis } from './queue';

const LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '100', 10);

function getKey(ip: string) {
  const now = new Date();
  const minute = now.getUTCFullYear().toString().padStart(4, '0') + '-' +
    String(now.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(now.getUTCDate()).padStart(2, '0') + 'T' +
    String(now.getUTCHours()).padStart(2, '0') + ':' +
    String(now.getUTCMinutes()).padStart(2, '0');
  return `rl:${ip}:${minute}`;
}

export async function checkRateLimit(ip: string) {
  if (!ip) ip = 'unknown';
  const key = getKey(ip);

  const current = await redis.incr(key);
  if (current === 1) {
    // set expiry 61 seconds
    await redis.expire(key, 61);
  }

  const remaining = LIMIT_PER_MINUTE - current;
  const allowed = current <= LIMIT_PER_MINUTE;
  return { allowed, remaining: Math.max(0, remaining), current };
}

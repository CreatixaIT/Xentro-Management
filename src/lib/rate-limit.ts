import { createServiceRoleClient } from '@/lib/supabase/service-role';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string | null;
}

/**
 * Check rate limit for a given identifier and endpoint
 * Uses PostgreSQL-backed rate limiter for persistence across serverless invocations
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  maxRequests: number = 10,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  try {
    // Check environment before creating client
    if (!process.env.SUPABASE_SECRET_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('[RateLimit] Missing Supabase environment variables, skipping rate limit');
      // Fail open - allow request if rate limiter is misconfigured
      return { allowed: true, remaining: maxRequests, resetAt: null };
    }

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_endpoint: endpoint,
      p_max_requests: maxRequests,
      p_window_seconds: windowSeconds,
    });

    if (error) {
      console.error('[RateLimit] RPC error:', error);
      // Fail open - allow request if rate limiter fails
      return { allowed: true, remaining: maxRequests, resetAt: null };
    }

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      resetAt: data.reset_at,
    };
  } catch (error) {
    console.error('[RateLimit] Exception:', error);
    // Fail open - allow request if rate limiter fails
    return { allowed: true, remaining: maxRequests, resetAt: null };
  }
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

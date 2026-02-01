interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPer2Minutes: number;
}

export interface RateLimitStats {
  last2Minutes: number;
  lastSecond: number;
  limit2Minutes: number;
  limitSecond: number;
  nextAvailable: number;
}

class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;
  private nextAvailableTime: number = 0;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    if (now < this.nextAvailableTime) {
      const waitTime = this.nextAvailableTime - now;
      console.log(`⏳ Rate limit: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return;
    }

    this.requests = this.requests.filter(time => now - time < 120000);

    if (this.requests.length >= this.config.requestsPer2Minutes) {
      const oldestRequest = this.requests[0];
      const waitTime = 120000 - (now - oldestRequest) + 100;
      this.nextAvailableTime = now + waitTime;
      console.warn(`⚠️ 2-minute rate limit reached. Waiting ${waitTime}ms...`);
      await this.waitForSlot();
      return;
    }

    const recentRequests = this.requests.filter(time => now - time < 1000);
    if (recentRequests.length >= this.config.requestsPerSecond) {
      const backoffTime = Math.min(1000, 100 * (recentRequests.length - this.config.requestsPerSecond + 1));
      this.nextAvailableTime = now + backoffTime;
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return this.waitForSlot();
    }

    this.requests.push(now);
    this.nextAvailableTime = now;
  }

  getStats(): RateLimitStats {
    const now = Date.now();
    const last2Min = this.requests.filter(time => now - time < 120000).length;
    const lastSec = this.requests.filter(time => now - time < 1000).length;
    
    return {
      last2Minutes: last2Min,
      lastSecond: lastSec,
      limit2Minutes: this.config.requestsPer2Minutes,
      limitSecond: this.config.requestsPerSecond,
      nextAvailable: Math.max(0, this.nextAvailableTime - now),
    };
  }

  reset(): void {
    this.requests = [];
    this.nextAvailableTime = 0;
  }

  getUsagePercentage(): number {
    const now = Date.now();
    const last2Min = this.requests.filter(time => now - time < 120000).length;
    return Math.round((last2Min / this.config.requestsPer2Minutes) * 100);
  }
}

export const devRateLimiter = new RateLimiter({
  requestsPerSecond: 20,
  requestsPer2Minutes: 100,
});

export const prodRateLimiter = new RateLimiter({
  requestsPerSecond: 300,
  requestsPer2Minutes: 18000,
});

const isProduction = process.env.RIOT_API_TYPE === 'production' || 
                    process.env.NEXT_PUBLIC_API_MODE === 'production';

export const rateLimiter = isProduction ? prodRateLimiter : devRateLimiter;

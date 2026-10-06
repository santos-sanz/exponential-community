import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "./_generated/api";
export const limits = new RateLimiter(components.rateLimiter, {
  loginPhone: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
  loginGlobal: { kind: "fixed window", rate: 1000, period: HOUR },
  profileChange: { kind: "token bucket", rate: 5, period: MINUTE, capacity: 5 },
});

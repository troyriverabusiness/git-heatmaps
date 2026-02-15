# Production Readiness Checklist

**Project**: git-heatmaps
**Type**: Embedded SVG Image Server
**Last Updated**: 2026-02-15

## Executive Summary

This server generates Git contribution heatmaps and visualizations that are **embedded in external websites via `<img>` tags** (similar to shields.io or GitHub badges). This use case has specific production requirements different from traditional web APIs.

**Current Status**: ⚠️ **NOT PRODUCTION READY**
**Critical Issues**: 11
**High Priority Issues**: 8
**Medium/Low Priority**: 11

---

## 🎯 Understanding the Use Case

### How This Server is Used
```html
<!-- Users embed SVGs like this -->
<img src="https://your-server.com/heatmap?githubUsername=octocat&fromDate=2025-01-01&toDate=2026-01-01" />
<img src="https://your-server.com/art/vibecoder?githubUsername=octocat" />
```

### Key Implications
1. **No CORS needed** - `<img>` tags bypass CORS
2. **High traffic potential** - One popular embed = thousands of requests
3. **Caching is critical** - Same images requested repeatedly
4. **Uptime is visible** - Broken images appear on external sites
5. **Rate limiting essential** - Both YOUR server and upstream APIs
6. **Response time matters** - Slow images = bad UX on external sites

---

## 🚨 CRITICAL ISSUES (Must Fix Before Deployment)

### 1. Missing HTTP Caching Headers ⚠️ **HIGHEST PRIORITY**
**Impact**: Every browser request hits your server → unnecessary load, slow page loads
**Files**: All controller files ([heatmapController.ts](src/api/heatmapController.ts), [artController.ts](src/api/artController.ts), [historyController.ts](src/api/historyController.ts))

**Current State**: No caching headers sent
**Required Headers**:
```typescript
'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
'ETag': '<content-hash>',
'Vary': 'Accept-Encoding'
```

**Why This Matters**:
- Browsers will cache SVGs for 1 hour
- CDNs/proxies will cache appropriately
- `stale-while-revalidate` serves stale content during revalidation
- Reduces load by 80%+

**Action Items**:
- [ ] Add `Cache-Control` headers to all SVG responses
- [ ] Implement ETag generation based on content hash
- [ ] Return `304 Not Modified` for matching ETags
- [ ] Add `Vary: Accept-Encoding` for compression

---

### 2. Unbounded Memory Cache Growth ⚠️ **CRITICAL**
**Impact**: Server will crash after days/weeks of traffic
**File**: [memoryCache.ts](src/cache/memoryCache.ts)

**Current State**:
- No maximum size limit
- No eviction policy
- Cache grows indefinitely

**Fix Required**:
```typescript
// Need to implement
- Max cache size (e.g., 10,000 entries or 100MB)
- LRU (Least Recently Used) eviction
- Memory monitoring
```

**Action Items**:
- [ ] Add max cache size limit
- [ ] Implement LRU eviction strategy
- [ ] Add cache size monitoring

---

### 3. No Request Timeouts ⚠️ **CRITICAL**
**Impact**: Hanging requests → broken images, memory leaks, unresponsive server
**Files**: [githubClient.ts](src/sources/github/githubClient.ts), [gitlabClient.ts](src/sources/gitlab/gitlabClient.ts)

**Current State**: All `fetch()` calls have no timeout

**Fix Required**:
```typescript
// For embedded images, need AGGRESSIVE timeouts
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 20000); // 20 seconds MAX

try {
  const response = await fetch(url, {
    signal: controller.signal,
    // ... other options
  });
} finally {
  clearTimeout(timeout);
}
```

**Why 10 seconds?**: Embedded images need fast responses. Users won't wait 30+ seconds.

**Action Items**:
- [ ] Add AbortController to all fetch calls
- [ ] Set timeout to 20 seconds max
- [ ] Return cached/fallback on timeout
- [ ] Log timeout metrics

---

### 4. No Rate Limiting (Two Layers Needed) ⚠️ **CRITICAL**
**Impact**: Server abuse, upstream API bans, service outage
**Files**: [createServer.ts](src/server/createServer.ts), [githubClient.ts](src/sources/github/githubClient.ts), [gitlabClient.ts](src/sources/gitlab/gitlabClient.ts)

#### Layer 1: Protect YOUR Server
**Current State**: No rate limiting
**Required**: Per-IP rate limiting

```typescript
// Using express-rate-limit
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/heatmap', limiter);
app.use('/art', limiter);
app.use('/history', limiter);
```

#### Layer 2: Respect Upstream APIs
**Current State**: No rate limit handling (TODOs at githubClient.ts:28, gitlabClient.ts:35)
**GitHub Limits**: 5,000 req/hour (authenticated), 60 req/hour (unauthenticated)
**GitLab Limits**: 10 req/second baseline

**Required**: Parse and respect rate limit headers

```typescript
// After each API call, check:
const remaining = response.headers.get('X-RateLimit-Remaining');
const reset = response.headers.get('X-RateLimit-Reset');

if (remaining === '0') {
  // Wait until reset time or return cached data
}
```

**Action Items**:
- [ ] Add express-rate-limit middleware
- [ ] Implement per-IP limits (100/15min suggested)
- [ ] Parse GitHub/GitLab rate limit headers
- [ ] Track rate limit state in memory
- [ ] Return cached data when rate limited
- [ ] Log rate limit events

---

### 5. No Stale-While-Revalidate Strategy ⚠️ **CRITICAL**
**Impact**: When GitHub/GitLab APIs are down, ALL embedded badges break

**Current State**: Cache miss = immediate API call = potential failure

**Required Strategy**:
1. Serve stale cache if available (even if expired)
2. Trigger background revalidation
3. Update cache when revalidation completes
4. Never show error if stale data exists

**Action Items**:
- [ ] Implement stale-while-revalidate in cache layer
- [ ] Serve stale data on API errors
- [ ] Add background revalidation jobs
- [ ] Add metric: "stale served" counter

---

### 6. No Graceful Shutdown ⚠️ **CRITICAL**
**Impact**: In-flight requests killed during deployments → broken images
**File**: [index.ts](src/index.ts)

**Current State**: No SIGTERM/SIGINT handlers

**Fix Required**:
```typescript
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown');

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
  });

  // Wait for in-flight requests (max 30 seconds)
  await new Promise(resolve => setTimeout(resolve, 30000));

  process.exit(0);
});
```

**Action Items**:
- [ ] Add SIGTERM handler
- [ ] Add SIGINT handler
- [ ] Implement connection draining
- [ ] Set drain timeout (30 seconds)
- [ ] Test with Docker/Kubernetes

---

### 7. Missing Proper Content-Type Headers
**Impact**: Browsers may not render SVGs correctly
**Files**: All controller files

**Current State**: Returns `Content-Type: image/svg+xml`
**Required**: `Content-Type: image/svg+xml; charset=utf-8`

**Action Items**:
- [ ] Add charset to all SVG responses
- [ ] Verify browsers render correctly

---

### 8. No Retry Logic for Transient Failures
**Impact**: Temporary API glitches cause permanent errors
**File**: [contributionService.ts:247,269](src/services/contributionService.ts)
**TODO Comments**: Present but not implemented

**Fix Required**:
```typescript
// Exponential backoff with jitter
async function fetchWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const backoff = Math.min(1000 * Math.pow(2, i), 10000);
      const jitter = Math.random() * 1000;
      await sleep(backoff + jitter);
    }
  }
}
```

**Action Items**:
- [ ] Implement exponential backoff
- [ ] Add jitter to prevent thundering herd
- [ ] Only retry on transient errors (5xx, timeout)
- [ ] Don't retry on 4xx errors

---

### 9. SSRF Vulnerability via gitlabBaseUrl
**Impact**: Attackers can make your server request arbitrary URLs
**File**: [heatmapController.ts](src/api/heatmapController.ts), [artController.ts](src/api/artController.ts)

**Current State**: `gitlabBaseUrl` parameter accepted without validation

**Fix Required**:
```typescript
const ALLOWED_GITLAB_HOSTS = [
  'gitlab.com',
  'gitlab.lrz.de',
  // Add other trusted GitLab instances
];

function validateGitLabUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ALLOWED_GITLAB_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}
```

**Action Items**:
- [ ] Create allowlist of GitLab instances
- [ ] Validate gitlabBaseUrl against allowlist
- [ ] Return 400 Bad Request for invalid URLs
- [ ] Document allowed GitLab instances

---

### 10. Missing Security Headers
**File**: [createServer.ts:12](src/server/createServer.ts)

**Currently Sets**: `x-powered-by: false` only

**Required for Embedded Images**:
- ✅ `X-Content-Type-Options: nosniff` - Prevent MIME sniffing
- ✅ `X-XSS-Protection: 1; mode=block` - Legacy XSS protection
- ❌ ~~`X-Frame-Options`~~ - Not needed (images can be embedded)
- ❌ ~~`Content-Security-Policy`~~ - May break embedding
- ✅ `Strict-Transport-Security` - If using HTTPS

**Action Items**:
- [ ] Add `X-Content-Type-Options: nosniff`
- [ ] Add `X-XSS-Protection: 1; mode=block`
- [ ] Add HSTS if using HTTPS
- [ ] Do NOT add frame/CSP restrictions

---

### 11. Insufficient Logging for Production
**Impact**: Can't diagnose issues, no visibility into performance
**Files**: Throughout application

**Current Issues**:
- Using `console.log` (lost in containers)
- No structured logging (JSON format)
- No log levels
- Cache logs too verbose (every operation)
- Potential token leaks in logs

**Fix Required**:
```typescript
// Use Winston or Pino
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console()
  ]
});

logger.info('Request processed', {
  path: req.path,
  duration: durationMs,
  cacheHit: true,
  statusCode: 200
});
```

**Action Items**:
- [ ] Install Winston or Pino
- [ ] Replace all console.log with structured logging
- [ ] Add log levels (debug, info, warn, error)
- [ ] Reduce cache logging verbosity (debug level only)
- [ ] Never log tokens/secrets
- [ ] Add request ID to all logs

---

## ⚠️ HIGH PRIORITY ISSUES

### 12. No Cache Invalidation Strategy
**File**: [index.ts:25](src/index.ts), [memoryCache.ts](src/cache/memoryCache.ts)

**Issues**:
- 5-minute TTL hardcoded
- No way to purge cache on demand
- No way to clear after token rotation

**Action Items**:
- [ ] Make TTL configurable (recommend 12 hours for the images)
- [ ] Make the Cache, save based on token query.
- [ ] Add per-key invalidation

---

### 13. No Token Validation on Startup
**File**: [index.ts](src/index.ts)

**Issue**: Server starts successfully but requests fail with invalid tokens

**Action Items**:
- [ ] Validate token format (GitHub: ghp_*, gho_*, etc.)
- [ ] Check token has required scopes on first use
- [ ] Cache validation results
- [ ] Log warning if tokens missing/invalid

---

### 14. GitLab 90-Day Limitation Not Handled
**File**: [contributionService.ts:270](src/services/contributionService.ts)
**TODO**: "GitLab Events API only returns 90 days - consider workarounds"

**Issues**:
- Users requesting >90 days get incomplete data
- No warning returned to user

**Action Items**:
- [ ] Return warning in API response when >90 days requested
- [ ] Document limitation in README
- [ ] Consider alternative data sources (commits API)

---

### 15. Non-Deterministic Docker Builds
**File**: [Dockerfile:7](Dockerfile#L7)
**TODO**: "When a lockfile exists, prefer npm ci for reproducible builds"

**Current Code**:
```dockerfile
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
```

**Issue**: If lockfile missing, builds are non-reproducible

**Action Items**:
- [ ] Always require package-lock.json
- [ ] Fail build if lockfile missing
- [ ] Use `npm ci` exclusively

---

### 16. Weak Health Check Endpoint
**File**: [createServer.ts:30](src/server/createServer.ts#L30)

**Current**: `{ ok: true }`

**Should Include**:
```json
{
  "ok": true,
  "version": "1.0.0",
  "uptime": 3600,
  "cacheStats": {
    "size": 1234,
    "hitRate": 0.87
  },
  "dependencies": {
    "github": "healthy",
    "gitlab": "healthy"
  }
}
```

**Action Items**:
- [ ] Add version from package.json
- [ ] Add uptime
- [ ] Add cache statistics
- [ ] Add dependency health checks
- [ ] Add memory usage

---

### 17. Missing .env.example File
**Status**: Deleted in commit (git status shows `D .env.example`)

**Impact**: No reference for environment variables

**Action Items**:
- [ ] Recreate .env.example with current variables:
  ```
  PORT=3000
  GITLAB_BASE_URL=https://gitlab.com
  LOG_LEVEL=info
  CACHE_TTL_SECONDS=3600
  CACHE_MAX_SIZE=10000
  ```

---

### 18. No Request Correlation IDs
**File**: [createServer.ts](src/server/createServer.ts)

**Impact**: Can't trace requests across logs

**Action Items**:
- [ ] Add middleware to generate correlation IDs
- [ ] Include in all log statements
- [ ] Return in response header: `X-Request-ID`

---

### 19. Incomplete Input Validation
**File**: [heatmapController.ts:75-80](src/api/heatmapController.ts)

**Current**: Only checks for empty string tokens

**Missing Validations**:
- Token format (should match GitHub/GitLab patterns)
- Date range validation (fromDate <= toDate)
- Date range size (not 10+ years)
- Username format validation

**Action Items**:
- [ ] Validate token formats
- [ ] Validate date ranges
- [ ] Add maximum date range limit (e.g., 2 years)
- [ ] Validate username patterns

---

## 📝 MEDIUM/LOW PRIORITY ISSUES

### 20. Verbose Cache Logging
**File**: [memoryCache.ts](src/cache/memoryCache.ts)
**Issue**: Logs every cache operation

**Action**: Move to debug level

---

### 21. Port Not Validated
**File**: [index.ts:14](src/index.ts)
**Issue**: No validation of PORT value (1-65535)

**Action**: Add port validation on startup

---

### 22. Confusing GitLab Default
**File**: [gitlabClient.ts:4](src/sources/gitlab/gitlabClient.ts)
**Issue**: Defaults to `gitlab.lrz.de` instead of `gitlab.com`

**Action**: Change default to gitlab.com

---

### 23. No Test Coverage
**Issue**: No tests exist in repository

**Action**: Add tests for critical paths

---

### 24. Missing Metrics/Monitoring
**TODO**: [contributionService.ts:85](src/services/contributionService.ts)
**Issue**: No performance metrics logged

**Action**: Add metrics for:
- Response times (p50, p95, p99)
- Cache hit/miss rates
- Upstream API response times
- Error rates by type
- Rate limit usage

---

### 25. User Alias Support Missing
**TODO**: [contributionService.ts:86](src/services/contributionService.ts)
**Issue**: Can't aggregate same user across platforms

**Action**: Design and implement alias system (low priority)

---

### 26. Incomplete Documentation
**File**: [README.md](README.md)

**Missing**:
- `GITLAB_BASE_URL` configuration
- Port configuration
- Required token permissions
- GitLab 90-day limitation
- Cache behavior
- Rate limits

**Action**: Update README with complete setup guide

---

### 27. Outdated TypeScript Config
**File**: [tsconfig.json](tsconfig.json)

**Could Enable**:
- `noImplicitAny: true`
- `noUnusedLocals: true`
- `noUnusedParameters: true`
- `noFallthroughCasesInSwitch: true`

**Action**: Tighten TypeScript settings

---

### 28. Inconsistent Error Handling
**Files**: [heatmapController.ts:161](src/api/heatmapController.ts), [historyController.ts:142](src/api/historyController.ts)

**Issue**: Different error logic between endpoints

**Action**: Standardize error handling pattern

---

### 29. No Compression Middleware
**File**: [createServer.ts](src/server/createServer.ts)

**Issue**: SVG responses not compressed

**Action**: Add compression middleware (gzip/brotli)

---

### 30. Missing Dockerfile Optimizations
**File**: [Dockerfile](Dockerfile)

**Could Improve**:
- Multi-stage build to reduce image size
- Layer caching optimization
- Non-root user for security

**Action**: Optimize Dockerfile (low priority)

---

## 🎯 Deployment Checklist

### Phase 1: Critical Fixes (Required Before Deployment)
- [ ] Add HTTP caching headers (Cache-Control, ETag, Vary)
- [ ] Implement bounded cache with LRU eviction
- [ ] Add request timeouts (10-15 seconds)
- [ ] Implement per-IP rate limiting
- [ ] Parse and respect upstream API rate limits
- [ ] Add stale-while-revalidate strategy
- [ ] Implement graceful shutdown handlers
- [ ] Fix Content-Type headers (add charset)
- [ ] Add retry logic with exponential backoff
- [ ] Validate gitlabBaseUrl against SSRF
- [ ] Add security headers (X-Content-Type-Options, etc.)
- [ ] Implement structured logging

### Phase 2: Production Hardening (Before Public Launch)
- [ ] Recreate .env.example
- [ ] Enhance health check endpoint
- [ ] Add request correlation IDs
- [ ] Improve input validation
- [ ] Document GitLab 90-day limitation
- [ ] Fix Docker build to use npm ci exclusively
- [ ] Add token validation on startup
- [ ] Implement cache invalidation endpoints

### Phase 3: Operational Excellence (Post-Launch)
- [ ] Add comprehensive monitoring/metrics
- [ ] Reduce cache logging verbosity
- [ ] Add test coverage
- [ ] Update documentation
- [ ] Add compression middleware
- [ ] Optimize Dockerfile
- [ ] Tighten TypeScript configuration

---

## 📊 Key Metrics to Monitor

For an embedded image server, monitor these metrics:

### Performance Metrics
- **Response Time**: p50, p95, p99 (target: <500ms p95)
- **Cache Hit Ratio**: Should be >80%
- **Upstream API Response Time**: Track GitHub/GitLab latency

### Reliability Metrics
- **Error Rate**: By status code (4xx, 5xx)
- **Timeout Rate**: Requests that timeout
- **Stale Served Rate**: How often serving stale data

### Resource Metrics
- **Memory Usage**: Cache size, heap usage
- **Rate Limit Usage**: GitHub/GitLab quota consumed
- **Requests per IP**: Detect abuse patterns

### Business Metrics
- **Most Popular Users**: Which usernames embedded most
- **Most Popular Patterns**: Heatmap vs Art vs History
- **Geographic Distribution**: Where requests come from

---

## 🚀 Recommended Infrastructure

### Load Balancer
- Health check: `GET /health` (expect 200)
- Timeout: 15 seconds
- Interval: 10 seconds

### Container Orchestration (Docker/Kubernetes)
```yaml
# Example Kubernetes health checks
livenessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
```

### Environment Variables
```bash
PORT=3000
GITLAB_BASE_URL=https://gitlab.com
LOG_LEVEL=info
CACHE_TTL_SECONDS=3600
CACHE_MAX_SIZE=10000
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
REQUEST_TIMEOUT_MS=10000
```

### Reverse Proxy (Nginx/Cloudflare)
- Enable caching based on Cache-Control headers
- Enable gzip/brotli compression
- Add DDoS protection
- Consider Cloudflare for CDN + DDoS protection

---

## 🔒 Security Considerations

### Authentication Strategy
**Current**: Tokens passed per-request via query params
**Security Notes**:
- ✅ Good: No server-side token storage
- ⚠️ Warning: Tokens visible in URLs (browser history, logs)
- Consider: Header-based tokens for sensitive deployments

### Rate Limiting Strategy
1. **Per-IP limits**: Prevent single source abuse
2. **Per-user limits**: Prevent specific username hammering
3. **Global limits**: Protect against DDoS

### Input Validation
- Never trust user input
- Validate all query parameters
- Sanitize before logging
- Validate gitlabBaseUrl against SSRF

---

## 📚 Related Documentation

- [README.md](README.md) - Project overview and setup
- [Dockerfile](Dockerfile) - Container build configuration
- [docker-compose.yml](docker-compose.yml) - Local development setup

---

## 📅 Review Schedule

- **Before Each Deployment**: Review Phase 1 checklist
- **Monthly**: Review metrics and adjust cache/rate limits
- **Quarterly**: Security audit, dependency updates
- **Annually**: Architecture review

---

**Document Owner**: Development Team
**Next Review**: Before production deployment

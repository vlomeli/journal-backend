module.exports = function createRateLimiter(options) {
  const windowMs = options.windowMs;
  const max = options.max;
  const message = options.message || "Too many requests. Please try again later.";
  const keyPrefix = options.keyPrefix || "rate-limit";
  const hits = new Map();
  let lastCleanupAt = Date.now();

  return function rateLimiter(req, res, next) {
    const now = Date.now();

    if (now - lastCleanupAt > windowMs) {
      for (const [key, record] of hits.entries()) {
        if (now - record.startedAt > windowMs) hits.delete(key);
      }
      lastCleanupAt = now;
    }

    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${keyPrefix}:${ip}`;
    const record = hits.get(key);

    if (!record || now - record.startedAt > windowMs) {
      hits.set(key, { count: 1, startedAt: now });
      return next();
    }

    record.count += 1;

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil(
        (windowMs - (now - record.startedAt)) / 1000
      );

      res.set("Retry-After", String(retryAfterSeconds));
      return res.status(429).json({ error: message });
    }

    return next();
  };
};

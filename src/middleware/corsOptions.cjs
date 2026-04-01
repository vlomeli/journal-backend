module.exports = function buildCorsOptions(corsOrigin) {
  if (!corsOrigin) return { origin: false };

  if (corsOrigin === "*") {
    return {
      origin: "*",
      credentials: false,
      optionsSuccessStatus: 200,
    };
  }

  const allowed = corsOrigin
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  return {
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowed.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: false,
    optionsSuccessStatus: 200,
  };
};


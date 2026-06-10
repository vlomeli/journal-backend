const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const createPool = require("./db/pool.cjs");
const buildCorsOptions = require("./middleware/corsOptions.cjs");
const createDbConnectionMiddleware = require("./middleware/dbConnection.cjs");
const createRateLimiter = require("./middleware/rateLimit.cjs");
const createVerifyJwtMiddleware = require("./middleware/verifyJwt.cjs");

const createAuthRouter = require("./routes/auth.cjs");
const createEntriesRouter = require("./routes/entries.cjs");
const createUserRouter = require("./routes/user.cjs");

module.exports = function createApp(config) {
  const app = express();
  const pool = createPool(config.db);

  app.set("trust proxy", 1);
  app.use(cors(buildCorsOptions(config.corsOrigin)));
  app.use(bodyParser.json({ limit: config.jsonBodyLimit }));

  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  if (config.rateLimit.enabled) {
    app.use(
      createRateLimiter({
        ...config.rateLimit.general,
        keyPrefix: "general",
      })
    );
    app.use(
      "/login",
      createRateLimiter({
        ...config.rateLimit.login,
        keyPrefix: "login",
        message: "Too many login attempts. Please try again later.",
      })
    );
    app.use(
      "/register",
      createRateLimiter({
        ...config.rateLimit.register,
        keyPrefix: "register",
        message: "Too many registration attempts. Please try again later.",
      })
    );
  }

  app.use(createDbConnectionMiddleware(pool, config));

  app.use(createAuthRouter(config));

  app.use(createVerifyJwtMiddleware(config));
  app.use(createEntriesRouter());
  app.use(createUserRouter());

  // eslint-disable-next-line no-unused-vars
  app.use(function errorHandler(err, req, res, next) {
    console.error(err);
    if (res.headersSent) return next(err);
    const message =
      config.env === "development" ? err.message : "Internal Server Error";
    return res.status(500).json({ error: message });
  });

  return app;
};

const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");

dotenv.config({
  path: process.env.ENV_PATH || path.join(__dirname, "..", ".env"),
});

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

const env = process.env.NODE_ENV || "development";
const port = Number.parseInt(process.env.PORT, 10) || 3000;

const jwtKey = requireEnv("JWT_KEY");
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

const buildDbSslConfig = () => {
  if (process.env.DB_SSL !== "true") return undefined;

  const ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
  };

  if (process.env.DB_SSL_CA) {
    ssl.ca = process.env.DB_SSL_CA.replace(/\\n/g, "\n");
  } else if (process.env.DB_SSL_CA_PATH) {
    ssl.ca = fs.readFileSync(process.env.DB_SSL_CA_PATH, "utf8");
  }

  return ssl;
};

const db = {
  host: requireEnv("DB_HOST"),
  port: Number.parseInt(process.env.DB_PORT, 10) || 3306,
  user: requireEnv("DB_USER"),
  password: requireEnv("DB_PASSWORD"),
  database: requireEnv("DB_NAME"),
  ssl: buildDbSslConfig(),
};

const corsOrigin = (
  process.env.CORS_ORIGIN ||
  (env === "development" ? "*" : "")
).trim();

const dbTimeZone = process.env.DB_TIME_ZONE || "-8:00";
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || "100kb";
const parsePositiveInt = (name, fallback) => {
  const value = Number.parseInt(process.env[name], 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const rateLimit = {
  enabled: process.env.RATE_LIMIT_ENABLED !== "false",
  general: {
    windowMs: parsePositiveInt("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    max: parsePositiveInt("RATE_LIMIT_MAX", 100),
  },
  login: {
    windowMs: parsePositiveInt("LOGIN_RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000),
    max: parsePositiveInt("LOGIN_RATE_LIMIT_MAX", 5),
  },
  register: {
    windowMs: parsePositiveInt("REGISTER_RATE_LIMIT_WINDOW_MS", 60 * 60 * 1000),
    max: parsePositiveInt("REGISTER_RATE_LIMIT_MAX", 5),
  },
};

module.exports = {
  env,
  port,
  jwtKey,
  jwtExpiresIn,
  db,
  corsOrigin,
  dbTimeZone,
  jsonBodyLimit,
  rateLimit,
};

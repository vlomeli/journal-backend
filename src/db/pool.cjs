const mysql = require("mysql2/promise");

module.exports = function createPool(dbConfig) {
  return mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: Number.parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 10,
    namedPlaceholders: true,
  });
};


module.exports = function createDbConnectionMiddleware(pool, config) {
  return async function dbConnection(req, res, next) {
    let connection;
    let released = false;

    const release = () => {
      if (released) return;
      released = true;
      if (connection) connection.release();
    };

    try {
      connection = await pool.getConnection();
      req.db = connection;

      await req.db.query('SET SESSION sql_mode = "TRADITIONAL"');
      await req.db.query(`SET time_zone = :tz`, { tz: config.dbTimeZone });

      res.once("finish", release);
      res.once("close", release);

      return next();
    } catch (err) {
      release();
      return next(err);
    }
  };
};


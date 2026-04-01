const jwt = require("jsonwebtoken");

module.exports = function createVerifyJwtMiddleware(config) {
  return function verifyJwt(req, res, next) {
    try {
      const { authorization: authHeader } = req.headers;

      if (!authHeader) {
        return res
          .status(401)
          .json({ error: "Invalid authorization, no authorization header" });
      }

      const [scheme, jwtToken] = authHeader.split(" ");

      if (!scheme || !jwtToken || scheme !== "Bearer") {
        return res
          .status(401)
          .json({ error: "Invalid authorization, invalid authorization scheme" });
      }

      const decodedJwtObject = jwt.verify(jwtToken, config.jwtKey);

      // Backward-compatible normalization for older tokens
      if (decodedJwtObject && decodedJwtObject.userId == null) {
        if (decodedJwtObject.UserID != null) decodedJwtObject.userId = decodedJwtObject.UserID;
      }

      if (!decodedJwtObject || decodedJwtObject.userId == null) {
        return res.status(401).json({ error: "Invalid JWT payload" });
      }

      req.user = decodedJwtObject;

      return next();
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "JWT expired" });
      }
      if (err.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid JWT token" });
      }
      return next(err);
    }
  };
};

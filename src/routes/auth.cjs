const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const asyncHandler = require("../utils/asyncHandler.cjs");

module.exports = function createAuthRouter(config) {
  const router = express.Router();

  router.post(
    "/register",
    asyncHandler(async (req, res) => {
      const { email, password, username } = req.body;

      if (!email || !password || !username) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const [user] = await req.db.query(
        `INSERT INTO user_table (email, password, username)
        VALUES (:email, :hashedPassword, :username);`,
        { email, hashedPassword, username }
      );

      const payload = { userId: user.insertId, username };
      const jwtEncodedUser = jwt.sign(payload, config.jwtKey, {
        expiresIn: config.jwtExpiresIn,
      });

      return res.json({ jwt: jwtEncodedUser, success: true });
    })
  );

  router.post(
    "/login",
    asyncHandler(async (req, res) => {
      const { username, password: userEnteredPassword } = req.body;

      if (!username || !userEnteredPassword) {
        return res.status(400).json({ error: "Missing fields", success: false });
      }

      const [[user]] = await req.db.query(
        `SELECT * FROM user_table WHERE Username = :username`,
        { username }
      );

      if (!user) {
        return res.status(404).json({ error: "Username not found" });
      }

      const hashedPassword = `${user.Password}`;
      const passwordMatches = await bcrypt.compare(
        userEnteredPassword,
        hashedPassword
      );

      if (!passwordMatches) {
        return res
          .status(401)
          .json({ err: "Password is incorrect", success: false });
      }

      const payload = {
        userId: user.UserID,
        username: user.Username,
      };

      const jwtEncodedUser = jwt.sign(payload, config.jwtKey, {
        expiresIn: config.jwtExpiresIn,
      });

      return res.json({ jwt: jwtEncodedUser, success: true });
    })
  );

  return router;
};

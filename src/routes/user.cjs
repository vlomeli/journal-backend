const express = require("express");
const asyncHandler = require("../utils/asyncHandler.cjs");

module.exports = function createUserRouter() {
  const router = express.Router();

  router.get(
    "/user_table",
    asyncHandler(async (req, res) => {
      const { userId } = req.user;

      const [user] = await req.db.query(
        `SELECT Username FROM user_table WHERE UserID = :userId;`,
        { userId }
      );

      if (!user || user.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json({ username: user[0].Username });
    })
  );

  return router;
};

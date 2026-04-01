const express = require("express");
const asyncHandler = require("../utils/asyncHandler.cjs");

module.exports = function createEntriesRouter() {
  const router = express.Router();

  router.post(
    "/entry_table",
    asyncHandler(async (req, res) => {
      const { userId } = req.user;
      const title = req.body?.title ?? req.body?.newTitleValue;
      const content = req.body?.content ?? req.body?.newContentValue;
      const mood = req.body?.mood ?? req.body?.newMoodValue;

      if (!title || !content || !mood) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const [insert] = await req.db.query(
        `
        INSERT INTO entry_table (UserID, DateCreated, Title, Content, Mood, DeletedFlag)
        VALUES (:userId, NOW(), :title, :content, :mood, :deletedFlag);
      `,
        {
          userId,
          title,
          content,
          mood,
          deletedFlag: 0,
        }
      );

      return res.json({
        id: insert.insertId,
        userId,
        title,
        content,
        mood,
      });
    })
  );

  router.put(
    "/entry_table",
    asyncHandler(async (req, res) => {
      const { userId } = req.user;
      const { id, title, content, mood } = req.body;

      if (!id || !title || !content || !mood) {
        return res.status(400).json({ error: "Missing fields" });
      }

      const [result] = await req.db.query(
        `UPDATE entry_table
         SET Title = :title, Content = :content, Mood = :mood
         WHERE EntryID = :id AND UserID = :userId AND DeletedFlag = 0`,
        { id, title, content, mood, userId }
      );

      if (!result.affectedRows) {
        return res.status(404).json({ error: "Entry not found" });
      }

      return res.status(200).json({ message: "Entry updated successfully" });
    })
  );

  router.get(
    "/entry_table",
    asyncHandler(async (req, res) => {
      const { userId } = req.user;

      const [entries] = await req.db.query(
        `SELECT 
          EntryID AS id,
          UserID AS userId,
          Title AS title,
          Content AS content,
          Mood AS mood,
          DateCreated AS date
        FROM entry_table
        WHERE UserID = :userId AND DeletedFlag = 0
        ORDER BY DateCreated DESC;`,
        { userId }
      );

      return res.json({ entries });
    })
  );

  router.delete(
    "/entry_table/:id",
    asyncHandler(async (req, res) => {
      const { userId } = req.user;
      const { id: entryId } = req.params;

      const [result] = await req.db.query(
        `UPDATE entry_table
         SET DeletedFlag = 1
         WHERE EntryID = :entryId AND UserID = :userId AND DeletedFlag = 0`,
        { entryId, userId }
      );

      if (!result.affectedRows) {
        return res.status(404).json({ error: "Entry not found" });
      }

      return res.json({ success: true });
    })
  );

  return router;
};

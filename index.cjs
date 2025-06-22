const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");

// Allows us to access the .env
require("dotenv").config();

const app = express();
const port = process.env.PORT; // default port to listen

const corsOptions = {
  origin: "*",
  credentials: true,
  "access-control-allow-credentials": true,
  optionSuccessStatus: 200,
};

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

app.use(cors(corsOptions));

// Makes Express parse the JSON body of any requests and adds the body to the req object
app.use(bodyParser.json());

app.use(async (req, res, next) => {
  try {
    // Connecting to our SQL db. req gets modified and is available down the line in other middleware and endpoint functions
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    // Traditional mode ensures not null is respected for unsupplied fields, ensures valid JavaScript dates, etc.
    await req.db.query('SET SESSION sql_mode = "TRADITIONAL"');
    await req.db.query(`SET time_zone = '-8:00'`);

    // Moves the request on down the line to the next middleware functions and/or the endpoint it's headed for
    await next();

    // After the endpoint has been reached and resolved, disconnects from the database
    req.db.release();
  } catch (err) {
    // If anything downstream throw an error, we must release the connection allocated for the request
    console.log(err);
    // If an error occurs, disconnects from the database
    if (req.db) req.db.release();
    throw err;
  }
});

// Hashes the password and inserts the info into the `user` table
app.post("/register", async function (req, res) {
  try {
    const { email, password, username } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await req.db.query(
      `INSERT INTO user_table (email, password, username)
      VALUES (:email, :hashedPassword, :username);`,
      { email, hashedPassword, username }
    );

    const jwtEncodedUser = jwt.sign(
      { UserID: user.insertId, ...req.body },
      process.env.JWT_KEY
    );

    res.json({ jwt: jwtEncodedUser, success: true });
  } catch (error) {
    console.log("error", error);
    res.json({ error: "An error occurred during registration" });
  }
});

app.post("/login", async function (req, res) {
  try {
    const { username, password: userEnteredPassword } = req.body;
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

    if (passwordMatches) {
      const payload = {
        userId: user.UserID,
        username: user.Username,
      };

      const jwtEncodedUser = jwt.sign(payload, process.env.JWT_KEY);

      return res.json({ jwt: jwtEncodedUser, success: true });
    } else {
      // 401 status code for "unauthorized"
      return res
        .status(401)
        .json({ err: "Password is incorrect", success: false });
    }
  } catch (err) {
    console.log("Error in /authenticate", err);
    //500 status code for "internal server error"
    return res
      .status(500)
      .json({ error: "Internal server error", success: false });
  }
});

// Jwt verification checks to see if there is an authorization header with a valid jwt in it.
app.use(async function verifyJwt(req, res, next) {
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

    const decodedJwtObject = jwt.verify(jwtToken, process.env.JWT_KEY);
    req.user = decodedJwtObject;

    await next();
  } catch (err) {
    console.error(err);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "JWT expired" });
    } else if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid JWT token" });
    } else {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

// only protected endpoints after the jwt verification middleware *here*

app.post("/entry_table", async (req, res) => {
  console.log("Request body:", req.body); // Debug

  const { userId } = req.user;
  const { title, content, mood } = req.body;

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

  res.json({
    id: insert.insertId,
    userId,
    title,
    content,
    mood,
  });
});

app.put("/entry_table", async (req, res) => {
  try {
    const { id, title, content, mood } = req.body;

    await req.db.query(
      `UPDATE entry_table SET Title = :title, Content = :content, Mood = :mood WHERE EntryID = :id`,
      {
        id,
        title,
        content,
        mood,
      }
    );

    // Send a success response
    res.status(200).json({ message: "Entry updated successfully" });
  } catch (error) {
    console.error("Error updating entry:", error);
    // Send an error response
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET endpoint to retrieve entries
app.get("/entry_table", async (req, res) => {
  const { userId } = req.user;

  const [entries] = await req.db.query(
    `SELECT * FROM entry_table WHERE UserID = :userId AND DeletedFlag = 0;`,
    {
      userId,
    }
  );

  // Attaches JSON content to the response
  res.json({ entries });
});

// deletes from the db
app.delete("/entry_table/:id", async (req, res) => {
  const { id: entryId } = req.params;

  await req.db.query(
    `UPDATE entry_table SET DeletedFlag = 1 WHERE EntryID = :entryId`,
    { entryId }
  );

  res.json({ success: true });
});

// Start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});

// GET endpoint to retrieve username
app.get("/user_table", async (req, res) => {
  const { userId } = req.user;

  // Query to select Username from user_table where UserID matches the provided userId
  const [user] = await req.db.query(
    `SELECT Username FROM user_table WHERE UserID = :userId;`,
    {
      userId,
    }
  );

  // Check if a user was found
  if (!user || user.length === 0) {
    // If no user is found, return an appropriate response
    return res.status(404).json({ error: "User not found" });
  }

  // Extract the Username from the first (and only) result
  const username = user[0].Username;

  // Attach JSON content to the response
  res.json({ username });
});

# Mee Journal (Backend)

This is the Express + MySQL API for Mee Journal. It handles registration/login, issues JWTs, and provides CRUD endpoints for journal entries.

## Tech Stack

- Node.js + Express
- MySQL (`mysql2/promise`)
- Auth: JWT (`jsonwebtoken`)
- Password hashing: `bcrypt`

## Endpoints (Overview)

Public:

- `POST /register` → creates a user and returns `{ jwt, success: true }`
- `POST /login` → verifies credentials and returns `{ jwt, success: true }`

Protected (requires `Authorization: Bearer <jwt>`):

- `GET /entry_table` → returns `{ entries }`
- `POST /entry_table` → creates an entry
- `PUT /entry_table` → updates an entry (must belong to the logged-in user)
- `DELETE /entry_table/:id` → soft-deletes an entry (must belong to the logged-in user)
- `GET /user_table` → returns `{ username }` for the logged-in user

## Running Locally

### 1) Install dependencies

```bash
npm install
```

### 2) Create `.env`

Copy `./.env.example` to `./.env` and fill in values.

Required variables:

- `PORT`
- `JWT_KEY`
- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

### 3) Start the server

```bash
npm run dev
```

Server will start on `http://localhost:<PORT>`.

## Database Schema (Expected)

This project expects these tables/columns (names/casing should match your MySQL setup):

```sql
CREATE TABLE user_table (
  UserID INT AUTO_INCREMENT PRIMARY KEY,
  Email VARCHAR(255),
  Password VARCHAR(255) NOT NULL,
  Username VARCHAR(255) NOT NULL
);

CREATE TABLE entry_table (
  EntryID INT AUTO_INCREMENT PRIMARY KEY,
  UserID INT NOT NULL,
  DateCreated DATETIME NOT NULL,
  Title VARCHAR(255) NOT NULL,
  Content TEXT NOT NULL,
  Mood VARCHAR(32) NOT NULL,
  DeletedFlag TINYINT NOT NULL DEFAULT 0,
  FOREIGN KEY (UserID) REFERENCES user_table(UserID)
);
```

## Notes

- JWTs are signed with `JWT_EXPIRES_IN` (default `7d`).
- Delete is a soft-delete via `DeletedFlag = 1`.


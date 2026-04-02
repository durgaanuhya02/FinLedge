-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "google_id" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verify_token" TEXT,
    "verify_token_expires_at" DATETIME,
    "reset_token" TEXT,
    "reset_token_expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_users" ("created_at", "email", "id", "name", "password_hash", "role", "status", "updated_at") SELECT "created_at", "email", "id", "name", "password_hash", "role", "status", "updated_at" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");
CREATE UNIQUE INDEX "users_verify_token_key" ON "users"("verify_token");
CREATE UNIQUE INDEX "users_reset_token_key" ON "users"("reset_token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

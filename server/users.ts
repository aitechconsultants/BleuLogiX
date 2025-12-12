import { query, queryOne } from "./db";

export interface User {
  id: string;
  clerk_user_id: string;
  email: string | null;
  role: "user" | "admin" | "superadmin";
  created_at: string;
  updated_at: string;
}

/**
 * Upsert a user - creates or updates based on clerk_user_id
 * Returns the internal user UUID
 */
export async function upsertUser(
  clerkUserId: string,
  email?: string
): Promise<User> {
  // Try to find existing user
  let user = await queryOne<User>(
    "SELECT * FROM users WHERE clerk_user_id = $1",
    [clerkUserId]
  );

  if (user) {
    // Update email if provided and different
    if (email && email !== user.email) {
      const result = await query<User>(
        "UPDATE users SET email = $1, updated_at = NOW() WHERE clerk_user_id = $2 RETURNING *",
        [email, clerkUserId]
      );
      user = result.rows[0];
    }
    return user;
  }

  // Create new user
  const result = await query<User>(
    `INSERT INTO users (clerk_user_id, email, role)
     VALUES ($1, $2, 'user')
     RETURNING *`,
    [clerkUserId, email || null]
  );

  return result.rows[0];
}

/**
 * Get user by internal UUID
 */
export async function getUserById(userId: string): Promise<User | null> {
  return queryOne<User>(
    "SELECT * FROM users WHERE id = $1",
    [userId]
  );
}

/**
 * Get user by Clerk user ID
 */
export async function getUserByClerkId(clerkUserId: string): Promise<User | null> {
  return queryOne<User>(
    "SELECT * FROM users WHERE clerk_user_id = $1",
    [clerkUserId]
  );
}

// Session authentication using iron-session
// Server-side only - never exposed to client

import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  isLoggedIn: boolean;
  username: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || "fallback-dev-secret-32-chars-min!",
  cookieName: "renewdesk_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session.isLoggedIn) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

// Validate demo credentials server-side
export function validateCredentials(
  username: string,
  password: string
): boolean {
  const validUsername = process.env.DEMO_USERNAME;
  const validPassword = process.env.DEMO_PASSWORD;

  if (!validUsername || !validPassword) {
    // Fallback defaults for local dev (not production)
    return (
      username === "demo@renewdesk.app" && password === "RenewDesk2026!"
    );
  }

  // Constant-time comparison to prevent timing attacks
  const userMatch = username === validUsername;
  const passMatch = password === validPassword;
  return userMatch && passMatch;
}


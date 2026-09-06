import type { IncomingHttpHeaders } from "node:http";
import type { NextFunction, Request, Response } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { eq } from "drizzle-orm";
import { auth } from "../auth.js";
import { db } from "../db/index.js";
import { session, user } from "../db/schema.js";
import type { UserSummary } from "../../../shared/types.js";

export type AuthedRequest = Request & {
  user: UserSummary;
  sessionId: string;
};

const SESSION_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) {
    return {};
  }

  return Object.fromEntries(
    cookieHeader.split(";").map((part) => {
      const [rawName, ...rest] = part.trim().split("=");
      return [rawName ?? "", decodeURIComponent(rest.join("="))];
    }),
  );
}

export function readSessionToken(headers: IncomingHttpHeaders): string | null {
  const cookies = parseCookieHeader(headers.cookie);
  for (const name of SESSION_COOKIE_NAMES) {
    const value = cookies[name];
    if (value) {
      return value.split(".")[0] ?? value;
    }
  }
  return null;
}

export async function resolveSession(headers: IncomingHttpHeaders): Promise<{
  user: UserSummary;
  sessionId: string;
} | null> {
  const fromAuth = await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });

  if (fromAuth?.user) {
    return {
      sessionId: fromAuth.session.id,
      user: {
        id: fromAuth.user.id,
        name: fromAuth.user.name,
        email: fromAuth.user.email,
        image: fromAuth.user.image ?? null,
      },
    };
  }

  const token = readSessionToken(headers);
  if (!token) {
    return null;
  }

  const [row] = await db
    .select({
      sessionId: session.id,
      expiresAt: session.expiresAt,
      userId: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(eq(session.token, token))
    .limit(1);

  if (!row || row.expiresAt.getTime() < Date.now()) {
    return null;
  }

  return {
    sessionId: row.sessionId,
    user: {
      id: row.userId,
      name: row.name,
      email: row.email,
      image: row.image,
    },
  };
}

export function asAuthed(req: Request): AuthedRequest {
  return req as unknown as AuthedRequest;
}

export async function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const resolved = await resolveSession(req.headers);
    if (!resolved) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const authed = asAuthed(req);
    authed.user = resolved.user;
    authed.sessionId = resolved.sessionId;
    next();
  } catch (error) {
    next(error);
  }
}

import { Router } from "express";
import { clerkClient, getAuth } from "@clerk/express";
import { db, usersTable, playSessionsTable, gamesTable, earningsTable, payoutMethodsTable, supportMessagesTable, notificationsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";

const router = Router();

function serializeUser(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    balance: user.balance,
    totalEarnings: user.totalEarnings,
    gamesPlayed: user.gamesPlayed,
    countryCode: user.countryCode,
    currencyCode: user.currencyCode,
    createdAt: user.createdAt.toISOString(),
  };
}

// GET /users
router.get("/users", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(desc(usersTable.totalEarnings));
    res.json(users.map(u => ({
      id: u.id,
      username: u.username,
      email: u.email,
      avatarUrl: u.avatarUrl,
      balance: u.balance,
      totalEarnings: u.totalEarnings,
      gamesPlayed: u.gamesPlayed,
      createdAt: u.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /users
router.post("/users", async (req, res) => {
  try {
    const { username, email, avatarUrl } = req.body;
    if (!username || !email) return res.status(400).json({ error: "username and email required" });
    const [user] = await db.insert(usersTable).values({
      username,
      email,
      avatarUrl: avatarUrl ?? "",
    }).returning();
    return res.status(201).json({
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      balance: user.balance,
      totalEarnings: user.totalEarnings,
      gamesPlayed: user.gamesPlayed,
      createdAt: user.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /users/me
router.get("/users/me", async (req, res) => {
  try {
    const clerkId = getAuth(req).userId;
    if (!clerkId) return res.status(401).json({ error: "Authentication required" });

    const clerkUser = await clerkClient.users.getUser(clerkId);
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return res.status(400).json({ error: "A verified email address is required" });

    let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));

    if (!user) {
      [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
      if (user) {
        [user] = await db.update(usersTable)
          .set({
            clerkId,
            avatarUrl: clerkUser.imageUrl || user.avatarUrl,
          })
          .where(eq(usersTable.id, user.id))
          .returning();
      }
    }

    if (!user) {
      const baseUsername = (clerkUser.username || clerkUser.firstName || email.split("@")[0] || "player")
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 24) || "player";
      let username = baseUsername;
      let suffix = 2;
      while ((await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username))).length > 0) {
        username = `${baseUsername.slice(0, 24 - String(suffix).length - 1)}_${suffix}`;
        suffix += 1;
      }

      [user] = await db.insert(usersTable).values({
        clerkId,
        username,
        email,
        avatarUrl: clerkUser.imageUrl || "",
      }).returning();
    }

    if (user.bannedAt) {
      return res.status(403).json({
        error: "Account banned",
        reason: user.banReason ?? "This account is unavailable.",
      });
    }

    return res.json(serializeUser(user));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PATCH /users/me — the signed-in player updates their own country/currency preference
router.patch("/users/me", async (req, res) => {
  try {
    const clerkId = getAuth(req).userId;
    if (!clerkId) return res.status(401).json({ error: "Authentication required" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) return res.status(404).json({ error: "User not found" });

    const { countryCode, currencyCode } = req.body as { countryCode?: string; currencyCode?: string };
    const [updated] = await db
      .update(usersTable)
      .set({
        ...(countryCode ? { countryCode: countryCode.toUpperCase() } : {}),
        ...(currencyCode ? { currencyCode: currencyCode.toUpperCase() } : {}),
      })
      .where(eq(usersTable.id, user.id))
      .returning();

    return res.json(serializeUser(updated));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /users/me — permanently deletes the signed-in player's account and all associated data
router.delete("/users/me", async (req, res) => {
  try {
    const clerkId = getAuth(req).userId;
    if (!clerkId) return res.status(401).json({ error: "Authentication required" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
    if (!user) return res.status(404).json({ error: "User not found" });

    // Remove every record tied to this account before the account row itself.
    await db.delete(playSessionsTable).where(eq(playSessionsTable.userId, user.id));
    await db.delete(earningsTable).where(eq(earningsTable.userId, user.id));
    await db.delete(payoutMethodsTable).where(eq(payoutMethodsTable.userId, user.id));
    await db.delete(supportMessagesTable).where(eq(supportMessagesTable.userId, user.id));
    await db.delete(notificationsTable).where(eq(notificationsTable.userId, user.id));
    await db.delete(usersTable).where(eq(usersTable.id, user.id));

    // Also remove the underlying Clerk identity so the account can't just
    // sign back in and land on a freshly-recreated, empty profile.
    try {
      await clerkClient.users.deleteUser(clerkId);
    } catch (clerkErr) {
      req.log.error(clerkErr, "Deleted app data but failed to delete Clerk user");
    }

    return res.status(204).send();
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /users/:id
router.get("/users/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json(serializeUser(user));
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /users/:id/stats
router.get("/users/:id/stats", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ error: "User not found" });

    const sessions = await db
      .select({
        id: playSessionsTable.id,
        userId: playSessionsTable.userId,
        gameId: playSessionsTable.gameId,
        gameName: gamesTable.title,
        status: playSessionsTable.status,
        pointsEarned: playSessionsTable.pointsEarned,
        durationMinutes: playSessionsTable.durationMinutes,
        startedAt: playSessionsTable.startedAt,
        endedAt: playSessionsTable.endedAt,
      })
      .from(playSessionsTable)
      .leftJoin(gamesTable, eq(playSessionsTable.gameId, gamesTable.id))
      .where(eq(playSessionsTable.userId, id))
      .orderBy(desc(playSessionsTable.startedAt))
      .limit(10);

    // Find favorite genre
    const genreResult = await db
      .select({ genre: gamesTable.genre, count: sql<number>`count(*)` })
      .from(playSessionsTable)
      .leftJoin(gamesTable, eq(playSessionsTable.gameId, gamesTable.id))
      .where(eq(playSessionsTable.userId, id))
      .groupBy(gamesTable.genre)
      .orderBy(sql`count(*) desc`)
      .limit(1);

    const totalPlayTime = sessions.reduce((acc, s) => acc + (s.durationMinutes ?? 0), 0);

    return res.json({
      userId: id,
      totalPlayTime,
      totalEarnings: user.totalEarnings,
      gamesPlayed: user.gamesPlayed,
      favoriteGenre: genreResult[0]?.genre ?? null,
      recentSessions: sessions.map(s => ({
        id: s.id,
        userId: s.userId,
        gameId: s.gameId,
        gameName: s.gameName ?? null,
        status: s.status,
        pointsEarned: s.pointsEarned,
        durationMinutes: s.durationMinutes ?? null,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt ? s.endedAt.toISOString() : null,
      })),
    });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;

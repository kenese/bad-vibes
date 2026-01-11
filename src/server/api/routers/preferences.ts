import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import type { db } from "~/server/db";

// Ensure the dev user exists in the database (required for foreign key constraints)
async function ensureDevUserExists(prisma: typeof db, userId: string) {
  if (userId === 'dev-user-001' && process.env.NODE_ENV === 'development') {
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        name: 'DEVELOPER',
        email: 'dev@localhost',
      },
    });
  }
}

export const preferencesRouter = createTRPCRouter({
  getTableConfig: publicProcedure
    .input(z.object({ tableName: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session?.user) return null;

      if (!ctx.db.tablePreference) {
        throw new Error('Prisma client is out of date. Please restart your dev server (yarn dev).');
      }

      const pref = await ctx.db.tablePreference.findUnique({
        where: {
          userId_tableName: {
            userId: ctx.session.user.id,
            tableName: input.tableName,
          },
        },
      });

      return pref ? (JSON.parse(pref.config) as Record<string, unknown>) : null;
    }),

  setTableConfig: protectedProcedure
    .input(
      z.object({
        tableName: z.string(),
        config: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.db.tablePreference) {
        throw new Error('Prisma client is out of date. Please restart your dev server (yarn dev).');
      }

      // Ensure dev user exists in database before creating preferences
      await ensureDevUserExists(ctx.db, ctx.session.user.id);

      return ctx.db.tablePreference.upsert({
        where: {
          userId_tableName: {
            userId: ctx.session.user.id,
            tableName: input.tableName,
          },
        },
        update: {
          config: JSON.stringify(input.config),
        },
        create: {
          userId: ctx.session.user.id,
          tableName: input.tableName,
          config: JSON.stringify(input.config),
        },
      });
    }),
});

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";

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

      return pref ? (JSON.parse(pref.config) as any) : null;
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

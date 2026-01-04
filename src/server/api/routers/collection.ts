import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { collectionManager } from '~/server/services/collectionManager';
import { type db } from '~/server/db';

interface TRPCContext {
  db: typeof db;
  session: {
    user: {
      id: string;
    };
  };
}

const getServiceForUser = async (ctx: TRPCContext) => {
  const user = await ctx.db.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { collectionPath: true }
  });

  if (!user?.collectionPath) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'No collection uploaded. Please upload your collection.nml file.'
    });
  }

  return collectionManager.getService(ctx.session.user.id, user.collectionPath);
};

export const collectionRouter = createTRPCRouter({
  hasCollection: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { collectionPath: true }
    });
    return !!user?.collectionPath;
  }),

  sidebar: protectedProcedure.query(async ({ ctx }) => {
    const service = await getServiceForUser(ctx);
    return service.getSidebar();
  }),

  playlistTracks: protectedProcedure
    .input(
      z.object({
        path: z.string().min(1)
      })
    )
    .query(async ({ ctx, input }) => {
      const service = await getServiceForUser(ctx);
      return service.getPlaylistTracks(input.path);
    }),

  createFolder: protectedProcedure
    .input(
      z.object({
        parentPath: z.string().min(1),
        name: z.string().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = await getServiceForUser(ctx);
      return service.createFolder(input);
    }),

  createPlaylist: protectedProcedure
    .input(
      z.object({
        folderPath: z.string().min(1),
        name: z.string().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = await getServiceForUser(ctx);
      return service.createPlaylist(input);
    }),

  movePlaylist: protectedProcedure
    .input(
      z.object({
        sourcePath: z.string().min(1),
        targetFolderPath: z.string().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = await getServiceForUser(ctx);
      return service.movePlaylist(input);
    }),

  createOrphansPlaylist: protectedProcedure
    .input(
      z.object({
        targetFolderPath: z.string().min(1),
        name: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = await getServiceForUser(ctx);
      return service.createOrphansPlaylist(input);
    }),

  createReleaseCompanionPlaylist: protectedProcedure
    .input(
      z.object({
        sourcePath: z.string().min(1),
        targetFolderPath: z.string().min(1),
        name: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = await getServiceForUser(ctx);
      return service.createReleaseCompanion(input);
    }),

  renamePlaylist: protectedProcedure
    .input(
      z.object({
        path: z.string().min(1),
        name: z.string().min(1)
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = await getServiceForUser(ctx);
      return service.renamePlaylist(input);
    }),

  deleteNodes: protectedProcedure
    .input(z.object({ paths: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      const service = await getServiceForUser(ctx);
      return service.deleteNodes(input.paths);
    })
});

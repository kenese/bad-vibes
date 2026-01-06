import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '~/server/api/trpc';
import { collectionManager } from '~/server/services/collectionManager';
import { type db } from '~/server/db';
import { del } from '@vercel/blob';


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
    
    if (!user?.collectionPath) {
      return false;
    }
    
    // For memory paths, check if the in-memory instance still exists
    if (user.collectionPath.startsWith('memory:')) {
      const hasInstance = collectionManager.hasMemoryInstance(ctx.session.user.id);
      if (!hasInstance) {
        // Clear stale memory path from database
        await ctx.db.user.update({
          where: { id: ctx.session.user.id },
          data: { collectionPath: null }
        });
        return false;
      }
    }
    
    return true;
  }),

  deleteCollection: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: { collectionPath: true }
    });

    if (user?.collectionPath) {
      console.log('Attempting to delete blob at:', user.collectionPath);
      try {
        await del(user.collectionPath);
        console.log('Blob deletion successful');
      } catch (error) {
        console.error('Failed to delete blob:', error);
      }

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { collectionPath: null }
      });
      collectionManager.invalidate(ctx.session.user.id);
    } else {
      console.log('No collection path found to delete');
    }
    return { success: true };
  }),

  registerCollection: protectedProcedure
    .input(z.object({ url: z.string() })) // Not enforcing .url() for memory: paths
    .mutation(async ({ ctx, input }) => {
      console.log(`[CollectionRouter] Registering collection for user ${ctx.session.user.id} at url: ${input.url}`);
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { collectionPath: input.url }
      });
      // Only invalidate for non-memory paths (memory paths are pre-loaded by upload route)
      if (!input.url.startsWith('memory:')) {
        collectionManager.invalidate(ctx.session.user.id);
      }
      return { success: true };
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

  movePlaylistBatch: protectedProcedure
    .input(
      z.object({
        moves: z.array(z.object({
          sourcePath: z.string().min(1),
          targetFolderPath: z.string().min(1)
        }))
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = await getServiceForUser(ctx);
      return service.movePlaylistBatch(input.moves);
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

  duplicatePlaylist: protectedProcedure
    .input(
      z.object({
        sourcePath: z.string().min(1),
        targetFolderPath: z.string().min(1),
        name: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const service = await getServiceForUser(ctx);
      return service.duplicatePlaylist(input);
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
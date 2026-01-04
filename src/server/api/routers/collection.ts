import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import collectionService from '~/server/services/collectionService';

export const collectionRouter = createTRPCRouter({
  sidebar: publicProcedure.query(async () => {
    return collectionService.getSidebar();
  }),

  playlistTracks: publicProcedure
    .input(
      z.object({
        path: z.string().min(1)
      })
    )
    .query(({ input }) => {
      return collectionService.getPlaylistTracks(input.path);
    }),

  createFolder: publicProcedure
    .input(
      z.object({
        parentPath: z.string().min(1),
        name: z.string().min(1)
      })
    )
    .mutation(({ input }) => {
      return collectionService.createFolder(input);
    }),

  createPlaylist: publicProcedure
    .input(
      z.object({
        folderPath: z.string().min(1),
        name: z.string().min(1)
      })
    )
    .mutation(({ input }) => {
      return collectionService.createPlaylist(input);
    }),

  movePlaylist: publicProcedure
    .input(
      z.object({
        sourcePath: z.string().min(1),
        targetFolderPath: z.string().min(1)
      })
    )
    .mutation(({ input }) => {
      return collectionService.movePlaylist(input);
    }),

  createOrphansPlaylist: publicProcedure
    .input(
      z.object({
        targetFolderPath: z.string().min(1),
        name: z.string().optional()
      })
    )
    .mutation(({ input }) => {
      return collectionService.createOrphansPlaylist(input);
    }),

  createReleaseCompanionPlaylist: publicProcedure
    .input(
      z.object({
        sourcePath: z.string().min(1),
        targetFolderPath: z.string().min(1),
        name: z.string().optional()
      })
    )
    .mutation(({ input }) => {
      return collectionService.createReleaseCompanion(input);
    }),

  renamePlaylist: publicProcedure
    .input(
      z.object({
        path: z.string().min(1),
        name: z.string().min(1)
      })
    )
    .mutation(({ input }) => {
      return collectionService.renamePlaylist(input);
    }),
  deleteNodes: publicProcedure
    .input(z.object({ paths: z.array(z.string()) }))
    .mutation(({ input }) => {
      return collectionService.deleteNodes(input.paths);
    })
});

import { Permission } from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannelPermissions } from '../../db/publishers';
import { getAffectedUserIdsForChannel } from '../../db/queries/channels';
import {
  channels,
  categoryRolePermissions,
  categoryUserPermissions
} from '../../db/schema';
import { protectedProcedure } from '../../utils/trpc';

async function getAffectedUserIdsForCategory(categoryId: number) {
  const rows = await db
    .select({ id: channels.id })
    .from(channels)
    .where(eq(channels.categoryId, categoryId));

  const all = new Set<number>();
  for (const r of rows) {
    const ids = await getAffectedUserIdsForChannel(r.id);
    for (const id of ids) all.add(id);
  }
  return [...all];
}

const deleteCategoryPermissionsRoute = protectedProcedure
  .input(
    z
      .object({
        categoryId: z.number(),
        userId: z.number().optional(),
        roleId: z.number().optional()
      })
      .refine((data) => !!(data.userId || data.roleId), {
        message: 'Either userId or roleId must be provided'
      })
      .refine((data) => !(data.userId && data.roleId), {
        message: 'Cannot specify both userId and roleId'
      })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNELS);

    await db.transaction(async (tx) => {
      if (input.userId) {
        await tx
          .delete(categoryUserPermissions)
          .where(
            and(
              eq(categoryUserPermissions.categoryId, input.categoryId),
              eq(categoryUserPermissions.userId, input.userId)
            )
          );
      } else if (input.roleId) {
        await tx
          .delete(categoryRolePermissions)
          .where(
            and(
              eq(categoryRolePermissions.categoryId, input.categoryId),
              eq(categoryRolePermissions.roleId, input.roleId)
            )
          );
      }
    });

    publishChannelPermissions(
      await getAffectedUserIdsForCategory(input.categoryId)
    );
  });

export { deleteCategoryPermissionsRoute };

import {
  ActivityLogType,
  ChannelPermission,
  Permission
} from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import { publishChannelPermissions } from '../../db/publishers';
import { getAffectedUserIdsForChannel } from '../../db/queries/channels';
import {
  categories,
  channels,
  categoryRolePermissions,
  categoryUserPermissions
} from '../../db/schema';
import { enqueueActivityLog } from '../../queues/activity-log';
import { protectedProcedure } from '../../utils/trpc';

const allPermissions = Object.values(ChannelPermission);

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

const updateCategoryPermissionsRoute = protectedProcedure
  .input(
    z
      .object({
        categoryId: z.number(),
        userId: z.number().optional(),
        roleId: z.number().optional(),
        isCreate: z.boolean().optional().default(false),
        permissions: z.array(z.enum(ChannelPermission)).default([])
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

    // sécurité: vérifier catégorie existe
    const cat = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.id, input.categoryId));
    if (!cat[0]) throw new Error('Category not found');

    const permissions = input.isCreate ? [] : input.permissions;

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

        const values = allPermissions.map((perm) => ({
          categoryId: input.categoryId,
          userId: input.userId!,
          permission: perm,
          allow: permissions.includes(perm),
          createdAt: Date.now()
        }));

        await tx.insert(categoryUserPermissions).values(values);
      } else if (input.roleId) {
        await tx
          .delete(categoryRolePermissions)
          .where(
            and(
              eq(categoryRolePermissions.categoryId, input.categoryId),
              eq(categoryRolePermissions.roleId, input.roleId)
            )
          );

        const values = allPermissions.map((perm) => ({
          categoryId: input.categoryId,
          roleId: input.roleId!,
          permission: perm,
          allow: permissions.includes(perm),
          createdAt: Date.now()
        }));

        await tx.insert(categoryRolePermissions).values(values);
      }
    });

    publishChannelPermissions(
      await getAffectedUserIdsForCategory(input.categoryId)
    );

    // NOTE: activity log type existant, on réutilise (tu peux en créer un dédié plus tard)
    enqueueActivityLog({
      type: ActivityLogType.UPDATED_CHANNEL_PERMISSIONS,
      userId: ctx.user.id,
      details: {
        categoryId: input.categoryId,
        targetUserId: input.userId,
        targetRoleId: input.roleId,
        permissions: allPermissions.map((perm) => ({
          permission: perm,
          allow: permissions.includes(perm)
        }))
      } as any
    });
  });

export { updateCategoryPermissionsRoute };

import { Permission } from '@sharkord/shared';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db';
import {
  categoryRolePermissions,
  categoryUserPermissions
} from '../../db/schema';
import { protectedProcedure } from '../../utils/trpc';

const getCategoryPermissionsRoute = protectedProcedure
  .input(
    z.object({
      categoryId: z.number()
    })
  )
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_CHANNEL_PERMISSIONS);

    const [rolePermissions, userPermissions] = await Promise.all([
      db
        .select()
        .from(categoryRolePermissions)
        .where(eq(categoryRolePermissions.categoryId, input.categoryId)),
      db
        .select()
        .from(categoryUserPermissions)
        .where(eq(categoryUserPermissions.categoryId, input.categoryId))
    ]);

    return { rolePermissions, userPermissions };
  });

export { getCategoryPermissionsRoute };

import { t } from '../../utils/trpc';
import { addCategoryRoute } from './add-category';
import { deleteCategoryRoute } from './delete-category';
import {
  onCategoryCreateRoute,
  onCategoryDeleteRoute,
  onCategoryUpdateRoute
} from './events';
import { getCategoryRoute } from './get-category';
import { reorderCategoriesRoute } from './reorder-categories';
import { updateCategoryRoute } from './update-category';
import { deleteCategoryPermissionsRoute } from './delete-permissions';
import { getCategoryPermissionsRoute } from './get-permissions';
import { updateCategoryPermissionsRoute } from './update-permission';


export const categoriesRouter = t.router({
  add: addCategoryRoute,
  update: updateCategoryRoute,
  delete: deleteCategoryRoute,
  get: getCategoryRoute,
  reorder: reorderCategoriesRoute,

  // permissions
  getPermissions: getCategoryPermissionsRoute,
  updatePermission: updateCategoryPermissionsRoute,
  deletePermissions: deleteCategoryPermissionsRoute,

  onCreate: onCategoryCreateRoute,
  onDelete: onCategoryDeleteRoute,
  onUpdate: onCategoryUpdateRoute
});


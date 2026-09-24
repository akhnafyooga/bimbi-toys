import { Prisma } from "@prisma/client";

// Categories that must never surface on the storefront.
//
// "Arsip" is where products are retired when they are no longer sold online but
// must stay in the database, because `OrderItem.productId` has no
// ON DELETE CASCADE — deleting an ordered product would break order history
// (see prisma/schema.prisma and app/api/admin/products/[id]/route.ts).
//
// The category itself stays fully visible in the admin panel; only the
// storefront hides it. Matching is by slug, so the admin must create it with
// exactly this name ("Arsip" -> slug "arsip").
export const HIDDEN_CATEGORY_SLUGS = ["arsip"];

const hiddenSlugs = HIDDEN_CATEGORY_SLUGS;

/** Prisma filter matching products that sit in a hidden category. */
export const hiddenCategoryWhere: Prisma.ProductWhereInput = {
  category: { slug: { in: hiddenSlugs } },
};

/** AND this into every storefront product query. */
export const visibleProductWhere: Prisma.ProductWhereInput = {
  NOT: hiddenCategoryWhere,
};

/** AND this into every storefront category query (navbar, dropdowns, tiles). */
export const visibleCategoryWhere: Prisma.CategoryWhereInput = {
  slug: { notIn: hiddenSlugs },
};

/**
 * Raw-SQL twin of `visibleProductWhere`, for the handful of recommender queries
 * that use `$queryRaw` and therefore cannot take a Prisma `where`. The column is
 * deliberately unqualified, so it works whether or not the Product table is
 * aliased:
 *
 *   SELECT id FROM "Product"
 *   WHERE "categoryId" = ${id} AND ${notHiddenCategorySql}
 */
export const notHiddenCategorySql = Prisma.sql`"categoryId" NOT IN (
  SELECT id FROM "Category" WHERE slug IN (${Prisma.join(hiddenSlugs)})
)`;

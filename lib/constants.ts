// Stock at or below this shows the "hampir habis" (low stock) warning in the admin panel.
export const LOW_STOCK_THRESHOLD = 5;

export const PRODUCTS_PER_PAGE = 12;
export const ORDERS_PER_PAGE = 15;
export const CUSTOMERS_PER_PAGE = 15;

// "image/jpg" is a non-standard alias some Windows/Android tools report for
// JPEG — accepted at the door, but normalized to canonical "image/jpeg" in
// lib/upload.ts before anything is stored or served.
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

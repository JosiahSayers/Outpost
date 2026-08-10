// Shape of one entry in a Shopify storefront's public products.json feed --
// shared by every Shopify-backed vendor in this catalog (Peak Refuel,
// Mountain House, ...) rather than redeclared per vendor.
export interface ShopifyProduct {
  id: number;
  handle: string;
  title: string;
  vendor: string;
  product_type: string;
  tags: string[];
  body_html: string;
  images: { src: string }[];
  variants: { available: boolean; requires_shipping: boolean }[];
}

interface ShopifyProductsResponse<T> {
  products: T[];
}

const DEFAULT_PAGE_SIZE = 250;

// Every Shopify storefront's products.json paginates via limit/page; loop
// until a page returns fewer than the page size. Generic over T (defaulting
// to the common ShopifyProduct shape) so a vendor that needs fields this
// shared interface doesn't model -- e.g. Good To-Go reading variant.grams --
// can type its own extended product shape without redeclaring this loop.
export async function fetchShopifyProducts<
  T extends ShopifyProduct = ShopifyProduct,
>(
  baseUrl: string,
  fetchImpl: typeof fetch,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<T[]> {
  const products: T[] = [];

  for (let page = 1; ; page++) {
    const res = await fetchImpl(
      `${baseUrl}/products.json?limit=${pageSize}&page=${page}`,
    );
    if (!res.ok) {
      throw new Error(
        `${baseUrl} products.json returned ${res.status} on page ${page}`,
      );
    }

    const body = (await res.json()) as ShopifyProductsResponse<T>;
    products.push(...body.products);

    if (body.products.length < pageSize) {
      break;
    }
  }

  return products;
}

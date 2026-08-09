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

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

const DEFAULT_PAGE_SIZE = 250;

// Every Shopify storefront's products.json paginates via limit/page; loop
// until a page returns fewer than the page size.
export async function fetchShopifyProducts(
  baseUrl: string,
  fetchImpl: typeof fetch,
  pageSize: number = DEFAULT_PAGE_SIZE,
): Promise<ShopifyProduct[]> {
  const products: ShopifyProduct[] = [];

  for (let page = 1; ; page++) {
    const res = await fetchImpl(
      `${baseUrl}/products.json?limit=${pageSize}&page=${page}`,
    );
    if (!res.ok) {
      throw new Error(
        `${baseUrl} products.json returned ${res.status} on page ${page}`,
      );
    }

    const body = (await res.json()) as ShopifyProductsResponse;
    products.push(...body.products);

    if (body.products.length < pageSize) {
      break;
    }
  }

  return products;
}

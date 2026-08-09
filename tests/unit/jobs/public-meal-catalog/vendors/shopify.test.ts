import { fetchShopifyProducts } from "$/jobs/workers/public-meal-catalog/vendors/shopify";
import { describe, expect, it, mock } from "bun:test";

function fakeProduct(id: number) {
  return {
    id,
    handle: `product-${id}`,
    title: `Product ${id}`,
    vendor: "Fake Vendor",
    product_type: "Meals",
    tags: [],
    body_html: "",
    images: [],
    variants: [{ available: true, requires_shipping: true }],
  };
}

describe("fetchShopifyProducts", () => {
  it("accumulates every page until one comes back shorter than the page size", async () => {
    const page1 = Array.from({ length: 3 }, (_, i) => fakeProduct(i));
    const page2 = Array.from({ length: 1 }, (_, i) => fakeProduct(3 + i));
    const fetchImpl = mock(async (url: string) => {
      const page = url.includes("page=2") ? page2 : page1;
      return new Response(JSON.stringify({ products: page }));
    });

    const result = await fetchShopifyProducts(
      "https://example.com",
      fetchImpl as unknown as typeof fetch,
      3,
    );

    expect(result).toHaveLength(4);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("stops after a single page when it's already shorter than the page size", async () => {
    const fetchImpl = mock(
      async () => new Response(JSON.stringify({ products: [fakeProduct(1)] })),
    );

    const result = await fetchShopifyProducts(
      "https://example.com",
      fetchImpl as unknown as typeof fetch,
      250,
    );

    expect(result).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("throws when a page responds with a non-OK status", async () => {
    const fetchImpl = mock(async () => new Response("error", { status: 500 }));

    await expect(
      fetchShopifyProducts(
        "https://example.com",
        fetchImpl as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/500/);
  });
});

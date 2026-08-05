import type { PackingListItemTransformerInput } from "$/transformers/packing-list-item";
import {
  capHeightCenterOffset,
  capHeightTopOffset,
  compareItemsForDisplay,
  generatePackingListPdf,
  getItemDisplayName,
  getQuantityLabel,
} from "$/utils/pdf/packing-list-generator";
import { describe, expect, it } from "bun:test";
import { Writable } from "node:stream";
import { make } from "../../../helpers/test-data/make";

describe("getItemDisplayName", () => {
  it("returns the item name when no gear is assigned", () => {
    expect(getItemDisplayName({ name: "Tent", assignedGear: null })).toBe(
      "Tent",
    );
  });

  it("returns the assigned gear's name when one is assigned", () => {
    expect(
      getItemDisplayName({
        name: "Tent",
        assignedGear: { name: "REI Co-op Half Dome SL 2+" } as never,
      }),
    ).toBe("REI Co-op Half Dome SL 2+");
  });
});

describe("getQuantityLabel", () => {
  it("returns an empty string when quantity is 1", () => {
    expect(getQuantityLabel({ quantity: 1 })).toBe("");
  });

  it("returns an empty string when quantity is 0", () => {
    expect(getQuantityLabel({ quantity: 0 })).toBe("");
  });

  it("returns a formatted label when quantity is greater than 1", () => {
    expect(getQuantityLabel({ quantity: 8 })).toBe("  ×8");
  });
});

describe("compareItemsForDisplay", () => {
  it("sorts a required item before an optional item", () => {
    const required = { optional: false, sortPosition: 5 };
    const optional = { optional: true, sortPosition: 1 };
    expect(compareItemsForDisplay(required, optional)).toBeLessThan(0);
    expect(compareItemsForDisplay(optional, required)).toBeGreaterThan(0);
  });

  it("sorts two required items by sortPosition", () => {
    const first = { optional: false, sortPosition: 1 };
    const second = { optional: false, sortPosition: 2 };
    expect(compareItemsForDisplay(first, second)).toBeLessThan(0);
    expect(compareItemsForDisplay(second, first)).toBeGreaterThan(0);
  });

  it("sorts two optional items by sortPosition", () => {
    const first = { optional: true, sortPosition: 1 };
    const second = { optional: true, sortPosition: 2 };
    expect(compareItemsForDisplay(first, second)).toBeLessThan(0);
    expect(compareItemsForDisplay(second, first)).toBeGreaterThan(0);
  });

  it("keeps required-then-optional order when actually sorting a list", () => {
    const items = [
      { optional: true, sortPosition: 1, id: "opt-1" },
      { optional: false, sortPosition: 3, id: "req-2" },
      { optional: true, sortPosition: 0, id: "opt-0" },
      { optional: false, sortPosition: 1, id: "req-1" },
    ];

    expect(items.sort(compareItemsForDisplay).map((i) => i.id)).toEqual([
      "req-1",
      "req-2",
      "opt-0",
      "opt-1",
    ]);
  });

  it("treats equal optional/sortPosition items as equal", () => {
    const a = { optional: false, sortPosition: 1 };
    const b = { optional: false, sortPosition: 1 };
    expect(compareItemsForDisplay(a, b)).toBe(0);
  });
});

describe("capHeightTopOffset", () => {
  it("returns 0 when ascender equals capHeight", () => {
    expect(
      capHeightTopOffset({ ascender: 700, capHeight: 700, fontSize: 12 }),
    ).toBe(0);
  });

  it("scales the ascender/capHeight gap by the font size", () => {
    // (ascender - capHeight) * (fontSize / 1000) = (800 - 700) * (100/1000) = 10
    expect(
      capHeightTopOffset({ ascender: 800, capHeight: 700, fontSize: 100 }),
    ).toBe(10);
  });

  it("returns a negative value when capHeight exceeds ascender", () => {
    expect(
      capHeightTopOffset({ ascender: 600, capHeight: 700, fontSize: 100 }),
    ).toBeLessThan(0);
  });
});

describe("capHeightCenterOffset", () => {
  it("reduces to boxSize / 2 when ascender and capHeight are both zero", () => {
    expect(
      capHeightCenterOffset(8, { ascender: 0, capHeight: 0, fontSize: 1000 }),
    ).toBe(4);
  });

  it("shifts the offset up as the ascender grows relative to capHeight", () => {
    const tighter = capHeightCenterOffset(8, {
      ascender: 700,
      capHeight: 700,
      fontSize: 1000,
    });
    const looser = capHeightCenterOffset(8, {
      ascender: 900,
      capHeight: 700,
      fontSize: 1000,
    });
    expect(looser).toBeLessThan(tighter);
  });

  it("scales with box size", () => {
    const small = capHeightCenterOffset(8, {
      ascender: 0,
      capHeight: 0,
      fontSize: 1000,
    });
    const large = capHeightCenterOffset(16, {
      ascender: 0,
      capHeight: 0,
      fontSize: 1000,
    });
    expect(large).toBe(small * 2);
  });
});

function makeItem(
  overrides: Partial<PackingListItemTransformerInput> = {},
): PackingListItemTransformerInput {
  const { assignedGear, category, ...itemOverrides } = overrides;
  return {
    ...make("PackingListItem", { assignedGearId: null, ...itemOverrides }),
    assignedGear: assignedGear ?? null,
    category: category ?? null,
  };
}

function makeAssignedGear(
  name: string,
): PackingListItemTransformerInput["assignedGear"] {
  const category = make("GearCategory");
  return { ...make("GearInventoryItem", { name }), category };
}

async function renderToBuffer(
  packingList: Parameters<typeof generatePackingListPdf>[0],
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const output = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });
  const finished = new Promise<void>((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
  });

  await generatePackingListPdf(packingList, output);
  await finished;

  return Buffer.concat(chunks);
}

function countPageObjects(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}

describe("generatePackingListPdf", () => {
  it("renders a valid single-page PDF for a typical packing list", async () => {
    const packingList = {
      ...make("PackingList", {
        name: "Wonderland Trail",
        description: "5 day loop",
      }),
      owner: make("User", { name: "Josiah" }),
      packingListSections: [
        {
          ...make("PackingListSection", { name: "Shelter", sortPosition: 1 }),
          items: [
            makeItem({
              name: "Tent",
              sortPosition: 1,
              assignedGear: makeAssignedGear("REI Co-op Half Dome SL 2+"),
            }),
            makeItem({ name: "Sleeping pad", sortPosition: 2 }),
            makeItem({
              name: "Camp pillow",
              sortPosition: 3,
              optional: true,
            }),
          ],
        },
      ],
    };

    const pdf = await renderToBuffer(packingList);

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(500);
    expect(countPageObjects(pdf)).toBe(1);
  });

  it("renders without throwing for a packing list with no sections", async () => {
    const packingList = {
      ...make("PackingList", { description: null, sourceUrl: null }),
      owner: null,
      packingListSections: [],
    };

    const pdf = await renderToBuffer(packingList);

    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });

  it("paginates across multiple pages once content overflows a single page", async () => {
    const items = Array.from({ length: 250 }, (_, i) =>
      makeItem({
        name: `Item ${i}`,
        sortPosition: i,
        assignedGear: i % 2 === 0 ? makeAssignedGear(`Gear ${i}`) : null,
      }),
    );

    const packingList = {
      ...make("PackingList"),
      owner: null,
      packingListSections: [
        { ...make("PackingListSection", { sortPosition: 1 }), items },
      ],
    };

    const pdf = await renderToBuffer(packingList);

    expect(countPageObjects(pdf)).toBeGreaterThan(1);
  });
});

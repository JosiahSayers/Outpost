import { drawTripPackingListSection } from "$/utils/pdf/trip-summary/packing-list-section";
import { describe, expect, it } from "bun:test";
import { makeTestDocument, pageCount } from "../../../../helpers/pdf";

const gearItem = {
  name: "Tent",
  quantity: 1,
  optional: false,
  sortPosition: 1,
  assignedGear: null,
};

const foodDay = {
  dayNumber: 1,
  date: null,
  items: [
    {
      meal: "breakfast" as const,
      name: "Oatmeal",
      quantity: 1,
      purchased: true,
      packed: false,
    },
  ],
};

describe("drawTripPackingListSection", () => {
  it("draws nothing when there are no gear sections and no food days", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawTripPackingListSection(document, [], [], { blank: false });
    expect(document.y).toBe(before);
    expect(pageCount(document)).toBe(1);
  });

  it("draws nothing when gear sections and food days are both present but empty", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawTripPackingListSection(
      document,
      [{ name: "Shelter", sortPosition: 1, items: [] }],
      [{ dayNumber: 1, date: null, items: [] }],
      { blank: false },
    );
    expect(document.y).toBe(before);
  });

  it("renders gear-only sections without throwing", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawTripPackingListSection(
      document,
      [{ name: "Shelter", sortPosition: 1, items: [gearItem] }],
      [],
      { blank: false },
    );
    expect(document.y).toBeGreaterThan(before);
    expect(pageCount(document)).toBe(1);
  });

  it("renders food-only days without throwing, with no gear sections at all", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawTripPackingListSection(document, [], [foodDay], { blank: false });
    expect(document.y).toBeGreaterThan(before);
    expect(pageCount(document)).toBe(1);
  });

  it("merges gear and food into a single combined section list without throwing", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawTripPackingListSection(
      document,
      [{ name: "Shelter", sortPosition: 1, items: [gearItem] }],
      [foodDay],
      { blank: true },
    );
    expect(document.y).toBeGreaterThan(before);
    expect(pageCount(document)).toBe(1);
  });
});

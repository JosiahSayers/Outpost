import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { transformers } from "$/transformers";

describe("transform", () => {
  describe("when given a shallow packing list", () => {
    const list = make("PackingList");
    it("returns the expected shape", () => {
      expect(transformers.packingList(list)).toEqual({
        id: list.id,
        name: list.name,
        public: list.public,
        sourceUrl: list.sourceUrl,
        description: list.description,
        copiedFromPackingListId: list.copiedFromPackingListId,
        editable: false,
      });
    });
  });

  describe("editable", () => {
    it("is true when the current user owns the list", () => {
      const list = make("PackingList", { userId: "user-1" });
      expect(transformers.packingList(list, "user-1").editable).toBe(true);
    });

    it("is false when the current user does not own the list", () => {
      const list = make("PackingList", { userId: "user-1" });
      expect(transformers.packingList(list, "user-2").editable).toBe(false);
    });

    it("is false when no current user is provided", () => {
      const list = make("PackingList", { userId: "user-1" });
      expect(transformers.packingList(list).editable).toBe(false);
    });

    it("is false for an unowned list even when a user is provided", () => {
      const list = make("PackingList"); // userId defaults to null
      expect(transformers.packingList(list, "user-1").editable).toBe(false);
    });
  });

  describe("when given a full packing list", () => {
    it("returns the expected shape", () => {
      const list = make("PackingList");
      const section1 = make("PackingListSection", { packingListId: list.id });
      const item1_1 = make("PackingListItem", {
        packingListSectionId: section1.id,
      });
      const item1_2 = make("PackingListItem", {
        packingListSectionId: section1.id,
      });
      const item1_3 = make("PackingListItem", {
        packingListSectionId: section1.id,
      });
      const section2 = make("PackingListSection", { packingListId: list.id });
      const item2_1 = make("PackingListItem", {
        packingListSectionId: section2.id,
      });
      const input = {
        ...list,
        packingListSections: [
          { ...section1, items: [item1_1, item1_2, item1_3] },
          { ...section2, items: [item2_1] },
        ],
      };
      expect(transformers.packingList(input)).toEqual({
        id: list.id,
        name: list.name,
        public: list.public,
        sourceUrl: list.sourceUrl,
        description: list.description,
        copiedFromPackingListId: input.copiedFromPackingListId,
        editable: false,
        sections: [
          {
            id: section1.id,
            name: section1.name,
            sortPosition: section1.sortPosition,
            items: [
              {
                id: item1_1.id,
                name: item1_1.name,
                optional: item1_1.optional,
                quantity: item1_1.quantity,
                sortPosition: item1_1.sortPosition,
              },
              {
                id: item1_2.id,
                name: item1_2.name,
                optional: item1_2.optional,
                quantity: item1_2.quantity,
                sortPosition: item1_2.sortPosition,
              },
              {
                id: item1_3.id,
                name: item1_3.name,
                optional: item1_3.optional,
                quantity: item1_3.quantity,
                sortPosition: item1_3.sortPosition,
              },
            ],
          },
          {
            id: section2.id,
            name: section2.name,
            sortPosition: section2.sortPosition,
            items: [
              {
                id: item2_1.id,
                name: item2_1.name,
                optional: item2_1.optional,
                quantity: item2_1.quantity,
                sortPosition: item2_1.sortPosition,
              },
            ],
          },
        ],
      });
    });
  });
});

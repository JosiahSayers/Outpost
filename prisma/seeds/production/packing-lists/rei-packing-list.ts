import { db } from "$/utils/db";
import type { ProductionSeed } from "../production-seed";

async function getCategory(name: string) {
  const existingCategory = await db.gearCategory.findFirst({ where: { name } });
  if (existingCategory) return existingCategory;
  return await db.gearCategory.create({
    data: {
      name,
      public: true,
    },
  });
}

async function run() {
  return db.$transaction(async (db) => {
    const packingList = await db.packingList.create({
      data: {
        name: "REI Backpacking Checklist",
        sourceUrl:
          "https://www.rei.com/dam/backpacking_checklist_printable.pdf",
        description:
          "To determine what you need to bring on a backpacking trip, think about how far you plan to hike, how remote the location is and what the weather forecast has in store. This list is intentionally comprehensive and you won’t take all items.",
        public: true,
      },
    });

    const sections = [
      "Backpacking Gear",
      "Navigation",
      "Clothing/Footwear",
      "Camp Kitchen",
      "Food & Water",
      "Health & Hygiene",
      "Tools & Repairs",
      "Emergency Items",
      "Personal Items",
      "Backpacking Extras",
    ];

    let sectionSortPosition = 1;
    const storedSections = await db.packingListSection.createManyAndReturn({
      data: sections.map((name) => ({
        name,
        packingListId: packingList.id,
        sortPosition: sectionSortPosition++,
      })),
    });

    const getSection = (name: string) =>
      storedSections.find((section) => section.name === name);

    const items = [
      {
        name: "Backpack",
        category: await getCategory("Backpacks"),
        section: "Backpacking Gear",
      },
      {
        name: "Backpacking tent",
        category: await getCategory("Tents"),
        section: "Backpacking Gear",
      },
      {
        name: "Sleeping bag",
        category: await getCategory("Sleeping Bags"),
        section: "Backpacking Gear",
      },
      {
        name: "Sleeping pad",
        category: await getCategory("Sleeping Pads"),
        section: "Backpacking Gear",
      },
      {
        name: "Headlamp or flashlight (with extra batteries)",
        category: await getCategory("Headlamps"),
        section: "Backpacking Gear",
      },
      {
        name: "Trekking poles",
        category: await getCategory("Trekking Poles"),
        optional: true,
        section: "Backpacking Gear",
      },
      {
        name: "Packable lantern",
        category: await getCategory("Lanterns"),
        optional: true,
        section: "Backpacking Gear",
      },
      {
        name: "Tent footprint",
        category: await getCategory("Footprints"),
        optional: true,
        section: "Backpacking Gear",
      },
      {
        name: "Pillow",
        category: await getCategory("Pillows"),
        optional: true,
        section: "Backpacking Gear",
      },
      {
        name: "Bear spray",
        category: await getCategory("Bear Safety"),
        optional: true,
        section: "Backpacking Gear",
      },

      {
        name: "Map (in waterproof sleeve)",
        category: await getCategory("Navigation Tools"),
        section: "Navigation",
      },
      {
        name: "Compass",
        category: await getCategory("Navigation Tools"),
        section: "Navigation",
      },
      {
        name: "Route description/guidebook",
        category: await getCategory("Guidebooks"),
        optional: true,
        section: "Navigation",
      },
      {
        name: "Altimeter Watch",
        category: await getCategory("Smartwatches"),
        optional: true,
        section: "Navigation",
      },
      {
        name: "GPS",
        category: await getCategory("GPS"),
        optional: true,
        section: "Navigation",
      },
      {
        name: "Satellite messenger and/or personal locator beacon",
        category: await getCategory("Satellite Messengers"),
        optional: true,
        section: "Navigation",
      },

      {
        name: "Moisture-wicking underwear",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
      },
      {
        name: "Moisture-wicking T-shirts",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
      },
      {
        name: "Quick-drying pants/shorts",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
      },
      {
        name: "Long-sleeve shirts (for sun and bugs)",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
      },
      {
        name: "Lightweight fleece or jacket",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
      },
      {
        name: "Boots or shoes suited to terrain",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
      },
      {
        name: "Socks (synthetic or wool)",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
      },
      {
        name: "Extra clothes (beyond the minimum expectation)",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
      },
      {
        name: "Rainwear (jacket and pants)",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
        optional: true,
      },
      {
        name: "Long underwear",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
        optional: true,
      },
      {
        name: "Warm insulated jacket or vest",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
        optional: true,
      },
      {
        name: "Fleece pants",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
        optional: true,
      },
      {
        name: "Gloves or mittens",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
        optional: true,
      },
      {
        name: "Warm hat",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
        optional: true,
      },
      {
        name: "Sandals (for fording streams and/or camp shoes)",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
        optional: true,
      },
      {
        name: "Bandana or Buff",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
        optional: true,
      },
      {
        name: "Gaiters (for rainy, snowy, or muddy conditions)",
        category: await getCategory("Clothing"),
        section: "Clothing/Footwear",
        optional: true,
      },

      {
        name: "Backpacking stove",
        category: await getCategory("Stoves"),
        section: "Camp Kitchen",
      },
      {
        name: "Fuel",
        category: await getCategory("Fuel"),
        section: "Camp Kitchen",
      },
      {
        name: "Cookset",
        category: await getCategory("Cooksets"),
        section: "Camp Kitchen",
      },
      {
        name: "Dishes/bowls",
        category: await getCategory("Bowls"),
        section: "Camp Kitchen",
      },
      {
        name: "Eating utensils",
        category: await getCategory("Utensils"),
        section: "Camp Kitchen",
      },
      {
        name: "Mug/cup",
        category: await getCategory("Mugs"),
        section: "Camp Kitchen",
      },
      {
        name: "Biodegradable soap",
        category: await getCategory("Soaps"),
        section: "Camp Kitchen",
      },
      {
        name: "Small quick-dry towel",
        category: await getCategory("Towels"),
        section: "Camp Kitchen",
      },
      {
        name: "Collapsible water container",
        category: await getCategory("Water Containers"),
        section: "Camp Kitchen",
      },
      {
        name: "Bear canister/food sack; or hang bag + 50’ nylon cord",
        category: await getCategory("Bear Proof Containers"),
        section: "Camp Kitchen",
      },

      {
        name: "Water bottles and/or reservoir ",
        category: await getCategory("Water Containers"),
        section: "Food & Water",
      },
      {
        name: "Water filter/purifier or chemical treatment",
        category: await getCategory("Water Filters"),
        section: "Food & Water",
      },
      {
        name: "Meals",
        category: await getCategory("Food"),
        section: "Food & Water",
      },
      {
        name: "Energy food and drinks (bars, gels, chews, trail mix, drink mix)",
        category: await getCategory("Food"),
        section: "Food & Water",
      },
      {
        name: "Extra day’s supply of food",
        category: await getCategory("Food"),
        section: "Food & Water",
      },

      {
        name: "Hand sanitizer",
        category: await getCategory("Hygiene"),
        section: "Health & Hygiene",
      },
      {
        name: "Toothbrush and toothpaste",
        category: await getCategory("Toothbrushes"),
        section: "Health & Hygiene",
      },
      {
        name: "Sanitation trowel",
        category: await getCategory("Trowels"),
        section: "Health & Hygiene",
      },
      {
        name: "Toilet paper/wipes and sealable bag (to pack it out)",
        category: await getCategory("Wipes"),
        section: "Health & Hygiene",
      },
      {
        name: "Menstrual products",
        category: await getCategory("Menstrual Products"),
        section: "Health & Hygiene",
      },
      {
        name: "Prescription medications",
        category: await getCategory("Medications"),
        section: "Health & Hygiene",
      },
      {
        name: "Prescription glasses",
        category: await getCategory("Glasses"),
        section: "Health & Hygiene",
      },
      {
        name: "Sunglasses (+ retainer leash)",
        category: await getCategory("Sunglasses"),
        section: "Health & Hygiene",
      },
      {
        name: "Sunscreen",
        category: await getCategory("Sun Protection"),
        section: "Health & Hygiene",
      },
      {
        name: "SPF-rated lip balm ",
        category: await getCategory("Sun Protection"),
        section: "Health & Hygiene",
      },
      {
        name: "Sun hat",
        category: await getCategory("Hats"),
        section: "Health & Hygiene",
      },
      {
        name: "Insect repellent",
        category: await getCategory("Bug Protection"),
        section: "Health & Hygiene",
        optional: true,
      },
      {
        name: "Urinary products",
        category: await getCategory("Hygiene"),
        section: "Health & Hygiene",
        optional: true,
      },
      {
        name: "Additional blister treatment supplies",
        category: await getCategory("First Aid"),
        section: "Health & Hygiene",
        optional: true,
      },

      {
        name: "Knife or multi-tool",
        category: await getCategory("Knives"),
        section: "Tools & Repairs",
      },
      {
        name: "Repair kit for mattress, stove",
        category: await getCategory("Gear Maintenance & Repair"),
        section: "Tools & Repairs",
      },
      {
        name: "Duct tape strips",
        category: await getCategory("Gear Maintenance & Repair"),
        section: "Tools & Repairs",
      },

      {
        name: "First-aid kit or supplies ",
        category: await getCategory("First Aid"),
        section: "Emergency Items",
      },
      {
        name: "Whistle",
        category: await getCategory("Whistles"),
        section: "Emergency Items",
      },
      {
        name: "Lighter/matches (in waterproof container)",
        category: await getCategory("Lighters"),
        section: "Emergency Items",
      },
      {
        name: "Fire starter (for emergency survival fire)",
        category: await getCategory("Fire Starters"),
        section: "Emergency Items",
      },
      {
        name: "Emergency shelter",
        category: await getCategory("Shelters"),
        section: "Emergency Items",
      },
      {
        name: "Two itineraries: 1 left with friend + 1 under car seat",
        category: await getCategory("Itineraries"),
        section: "Emergency Items",
      },

      {
        name: "Daypack (for day trips away from camp)",
        category: await getCategory("First Aid"),
        section: "Backpacking Extras",
        optional: true,
      },
      {
        name: "Camera or action cam (with extra memory cards)",
        category: await getCategory("Cameras"),
        section: "Backpacking Extras",
        optional: true,
      },
      {
        name: "Interpretive field guide(s)",
        category: await getCategory("Guidebooks"),
        section: "Backpacking Extras",
        optional: true,
      },
      {
        name: "Star chart/night-sky identifier",
        category: await getCategory("Star Charts"),
        section: "Backpacking Extras",
        optional: true,
      },
      {
        name: "Outdoor journal or sketchbook with pen/pencil",
        category: await getCategory("Notebooks"),
        section: "Backpacking Extras",
        optional: true,
      },
      {
        name: "Book/reading material",
        category: await getCategory("Entertainment"),
        section: "Backpacking Extras",
        optional: true,
      },
      {
        name: "Cards or games",
        category: await getCategory("Entertainment"),
        section: "Backpacking Extras",
        optional: true,
      },
      {
        name: "Compact binoculars",
        category: await getCategory("Binoculars"),
        section: "Backpacking Extras",
        optional: true,
      },
      {
        name: "Two-way radios",
        category: await getCategory("Radios"),
        section: "Backpacking Extras",
        optional: true,
      },

      {
        name: "Permits (if needed)",
        category: await getCategory("Permits"),
        section: "Personal Items",
      },
      {
        name: "Credit card and/or cash",
        category: await getCategory("Currency"),
        section: "Personal Items",
      },
      {
        name: "ID",
        category: await getCategory("Identification"),
        section: "Personal Items",
      },
      {
        name: "Car keys",
        category: await getCategory("Keys"),
        section: "Personal Items",
      },
      {
        name: "Cellphone",
        category: await getCategory("Electronics"),
        section: "Personal Items",
      },
    ];

    let itemSortPosition = 0;
    let lastSection = items[0]!.section;
    const resetSort = (newSection: string) => {
      lastSection = newSection;
      itemSortPosition = 1;
      return itemSortPosition;
    };
    await db.packingListItem.createMany({
      data: items.map((item) => ({
        name: item.name,
        gearCategoryId: item.category.id,
        packingListSectionId: getSection(item.section)!.id,
        optional: item.optional,
        sortPosition:
          lastSection === item.section
            ? ++itemSortPosition
            : resetSort(item.section),
      })),
    });
  });
}

export const reiPackingList: ProductionSeed = {
  run,
  name: "rei-packing-list",
};

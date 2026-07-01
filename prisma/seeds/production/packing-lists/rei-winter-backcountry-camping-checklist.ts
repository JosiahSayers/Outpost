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
        name: "REI Winter Backcountry Camping Checklist",
        sourceUrl:
          "https://www.rei.com/dam/winter_backcountry_camping_checklist-(1).pdf",
        description:
          "Winter camping in the backcountry requires more—and slightly different—gear than a summer backpacking trip does.",
        public: true,
      },
    });

    const sections = [
      "Snow Travel",
      "Navigation",
      "Campsite",
      "Clothing",
      "Kitchen",
      "Food & Water",
      "Health & Hygiene",
      "Tools & Repairs",
      "Emergency",
      "Personal Items",
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
        section: "Snow Travel",
      },
      {
        name: "Daypack or ski pack",
        category: await getCategory("Backpacks"),
        section: "Snow Travel",
      },
      {
        name: "Snowshoes",
        category: await getCategory("Snowshoes"),
        section: "Snow Travel",
      },
      {
        name: "Skis (with skins)",
        category: await getCategory("Skis"),
        section: "Snow Travel",
      },
      {
        name: "Snowboard or splitboard (with skins)",
        category: await getCategory("Snowboards"),
        section: "Snow Travel",
      },
      {
        name: "Backcountry ski poles or trekking poles (with snow baskets)",
        category: await getCategory("Trekking Poles"),
        section: "Snow Travel",
      },
      {
        name: "Crampons",
        category: await getCategory("Crampons"),
        section: "Snow Travel",
      },
      {
        name: "Ice axe",
        category: await getCategory("Ice Axes"),
        section: "Snow Travel",
      },
      {
        name: "Avalanche transceiver (1 per person)",
        category: await getCategory("Avalanche Safety"),
        section: "Snow Travel",
      },
      {
        name: "Avalanche probe (1 per person)",
        category: await getCategory("Avalanche Safety"),
        section: "Snow Travel",
      },
      {
        name: "Snow shovel (1 per person)",
        category: await getCategory("Avalanche Safety"),
        section: "Snow Travel",
      },
      {
        name: "Slope meter",
        category: await getCategory("Avalanche Safety"),
        section: "Snow Travel",
      },
      {
        name: "Snow saw",
        category: await getCategory("Avalanche Safety"),
        section: "Snow Travel",
      },
      {
        name: "Handwarmers and footwarmers",
        category: await getCategory("Hand & Foot Warmers"),
        section: "Snow Travel",
        optional: true,
      },
      {
        name: "Oversized zipper pulls",
        category: await getCategory("Gear Accessories"),
        section: "Snow Travel",
        optional: true,
      },
      {
        name: "Two-way radios",
        category: await getCategory("Radios"),
        section: "Snow Travel",
        optional: true,
      },
      {
        name: "Binoculars",
        category: await getCategory("Binoculars"),
        section: "Snow Travel",
        optional: true,
      },

      {
        name: "Map and compass",
        category: await getCategory("Navigation Tools"),
        section: "Navigation",
      },
      {
        name: "Route description or guidebook",
        category: await getCategory("Guidebooks"),
        section: "Navigation",
      },
      {
        name: "Watch",
        category: await getCategory("Watches"),
        section: "Navigation",
      },
      {
        name: "GPS",
        category: await getCategory("GPS"),
        section: "Navigation",
      },
      {
        name: "Satellite messenger/PLB",
        category: await getCategory("Satellite Messengers"),
        section: "Navigation",
      },

      {
        name: "Winter tent (with guylines)",
        category: await getCategory("Tents"),
        section: "Campsite",
      },
      {
        name: "Snow or tent stakes",
        category: await getCategory("Tent Stakes"),
        section: "Campsite",
      },
      {
        name: "Cold-weather sleeping bag(s)",
        category: await getCategory("Sleeping Bags"),
        section: "Campsite",
      },
      {
        name: "Well-insulated sleeping pad(s)",
        category: await getCategory("Sleeping Pads"),
        section: "Campsite",
      },
      {
        name: "Sit pad(s)",
        category: await getCategory("Sit Pads"),
        section: "Campsite",
      },
      {
        name: "Headlamp(s) (+ extra batteries)",
        category: await getCategory("Headlamps"),
        section: "Campsite",
      },
      {
        name: "Camping pillow(s)",
        category: await getCategory("Pillows"),
        section: "Campsite",
        optional: true,
      },
      {
        name: "Sleeping bag liner(s)",
        category: await getCategory("Sleeping Bag Liners"),
        section: "Campsite",
        optional: true,
      },

      {
        name: "Moisture-wicking long underwear",
        category: await getCategory("Clothing"),
        section: "Clothing",
      },
      {
        name: "Long-sleeve shirt",
        category: await getCategory("Clothing"),
        section: "Clothing",
      },
      {
        name: "Insulated jacket or fleece jacket",
        category: await getCategory("Clothing"),
        section: "Clothing",
      },
      {
        name: "Insulated pants or fleece pants",
        category: await getCategory("Clothing"),
        section: "Clothing",
      },
      {
        name: "Rainwear (jacket and pants)",
        category: await getCategory("Clothing"),
        section: "Clothing",
      },
      {
        name: "Winter boots and gaiters",
        category: await getCategory("Clothing"),
        section: "Clothing",
      },
      {
        name: "Socks (synthetic or wool)",
        category: await getCategory("Clothing"),
        section: "Clothing",
      },
      {
        name: "Gloves or mittens",
        category: await getCategory("Clothing"),
        section: "Clothing",
      },
      {
        name: "Warm hat or balaclava",
        category: await getCategory("Clothing"),
        section: "Clothing",
      },
      {
        name: "Extra clothes",
        category: await getCategory("Clothing"),
        section: "Clothing",
      },

      {
        name: "Stove and fuel",
        category: await getCategory("Stoves"),
        section: "Kitchen",
      },
      {
        name: "Matches/lighters + fire starter",
        category: await getCategory("Lighters"),
        section: "Kitchen",
      },
      {
        name: "Cook set and pot lifter",
        category: await getCategory("Cooksets"),
        section: "Kitchen",
      },
      {
        name: "Cooking and eating utensils",
        category: await getCategory("Utensils"),
        section: "Kitchen",
      },
      {
        name: "Dishes/bowls and mugs/cups",
        category: await getCategory("Bowls"),
        section: "Kitchen",
      },
      {
        name: "Insulated vacuum bottles",
        category: await getCategory("Vacuum Bottles"),
        section: "Kitchen",
      },
      {
        name: "Biodegradable soap",
        category: await getCategory("Soaps"),
        section: "Kitchen",
      },
      {
        name: "Pot scrubber/sponge",
        category: await getCategory("Cleaning Supplies"),
        section: "Kitchen",
      },
      {
        name: "Trash/recycling bags",
        category: await getCategory("Trash Bags"),
        section: "Kitchen",
      },

      {
        name: "Water bottle(s) and/or reservoir",
        category: await getCategory("Water Containers"),
        section: "Food & Water",
      },
      {
        name: "Insulated sleeves for bottles and reservoirs",
        category: await getCategory("Water Containers"),
        section: "Food & Water",
      },
      {
        name: "Water filter/chemical treatment",
        category: await getCategory("Water Filters"),
        section: "Food & Water",
      },
      {
        name: "Extra fuel + pot to melt snow",
        category: await getCategory("Fuel"),
        section: "Food & Water",
      },
      {
        name: "Meals and snacks",
        category: await getCategory("Food"),
        section: "Food & Water",
      },
      {
        name: "Extra day’s supply of food",
        category: await getCategory("Food"),
        section: "Food & Water",
      },
      {
        name: "Cocoa/hot beverage mixes",
        category: await getCategory("Food"),
        section: "Food & Water",
      },
      {
        name: "Animal-resistant food container(s)",
        category: await getCategory("Bear Proof Containers"),
        section: "Food & Water",
      },

      {
        name: "Hand sanitizer",
        category: await getCategory("Hygiene"),
        section: "Health & Hygiene",
      },
      {
        name: "Quick-dry towel",
        category: await getCategory("Towels"),
        section: "Health & Hygiene",
      },
      {
        name: "Toothbrush/toothpaste + floss",
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
        name: "Menstrual products and urinary products",
        category: await getCategory("Menstrual Products"),
        section: "Health & Hygiene",
      },
      {
        name: "Prescription meds (if needed)",
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
        name: "SPF-rated lip balm",
        category: await getCategory("Sun Protection"),
        section: "Health & Hygiene",
      },
      {
        name: "Sun hat",
        category: await getCategory("Hats"),
        section: "Health & Hygiene",
      },

      {
        name: "Knife or multi-tool",
        category: await getCategory("Knives"),
        section: "Tools & Repairs",
      },
      {
        name: "Duct tape and repair kits for pad/mattress and stove",
        category: await getCategory("Gear Maintenance & Repair"),
        section: "Tools & Repairs",
      },
      {
        name: "Tent pole repair sleeve",
        category: await getCategory("Gear Maintenance & Repair"),
        section: "Tools & Repairs",
      },
      {
        name: "Extra cord",
        category: await getCategory("Cord & Rope"),
        section: "Tools & Repairs",
      },

      {
        name: "First-aid kit or first-aid supplies",
        category: await getCategory("First Aid"),
        section: "Emergency",
      },
      {
        name: "Whistle",
        category: await getCategory("Whistles"),
        section: "Emergency",
      },
      {
        name: "Emergency shelter",
        category: await getCategory("Shelters"),
        section: "Emergency",
      },
      {
        name: "Two itineraries: 1 left with friend + 1 under car seat",
        category: await getCategory("Itineraries"),
        section: "Emergency",
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
        name: "Cellphone",
        category: await getCategory("Electronics"),
        section: "Personal Items",
      },
      {
        name: "Campsite permit (if required)",
        category: await getCategory("Permits"),
        section: "Personal Items",
      },
      {
        name: "Trail pass (if required)",
        category: await getCategory("Permits"),
        section: "Personal Items",
      },
      {
        name: "Notebook and pen or pencil",
        category: await getCategory("Notebooks"),
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

export const reiWinterBackcountryCampingChecklist: ProductionSeed = {
  run,
  name: "rei-winter-backcountry-camping-checklist",
};

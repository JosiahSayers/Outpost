import { db } from "$/utils/db";
import type { ProductionSeed } from "./production-seed";

// Single source of truth for BTP-143's item-name-based category suggestion
// keywords (see suggestCategories in app/utils/search-helpers.ts). This is
// its own seed rather than folded into publicGearCategories's createMany so
// coverage can keep growing over time without a new migration each time --
// just add/edit entries here and bump nothing else. It updates existing
// rows by name, so it runs after publicGearCategories (see the ordering in
// ./index.ts) and re-running it (e.g. after editing this file) is safe on
// an already-seeded DB too, unlike createMany.
//
// Curation rules (see suggestCategories for how these get queried):
// - No entries that just echo the category's own name (e.g. bare "tent" for
//   Tents) -- suggestCategories already checks a category's plain name on
//   its own, a keyword would be redundant.
// - Keywords are checked via phrase-adjacency (words must appear next to
//   each other, in order, in the item name), not independently -- so a
//   multi-word entry built from a generic word + a distinctive one (REI's
//   "Half Dome", MSR's "Wind Pro") is safe: it only matches an item name
//   that actually contains that exact phrase, not either word alone.
// - Single-WORD entries don't get that phrase protection (nothing to be
//   adjacent to), so they're only included when the word itself is
//   distinctive enough on its own (a cottage brand's product name, not a
//   generic English word).
// - No bare brand names for brands that span multiple categories in this
//   catalog (Big Agnes/MSR/NEMO/Marmot/Katadyn/Nitecore all show up under
//   more than one of these categories) -- pairing brand + model into one
//   phrase (e.g. "msr access") disambiguates instead.
const categoryKeywords: Record<string, string[]> = {
  Tents: [
    "copper spur",
    "tiger wall",
    "fly creek",
    "seedhouse",
    "blacktail",
    "hubba hubba",
    "freelite",
    "mutha hubba",
    "msr access",
    "msr remote",
    "elixir",
    "x-mid",
    "x-dome",
    "duplex",
    "triplex",
    "altaplex",
    "nallo",
    "akto",
    "soulo",
    "nammatj",
    "lunar solo",
    "stratospire",
    "double rainbow",
    "hornet",
    "dragonfly",
    "tungsten",
    "limelight",
    "telos",
    "lanshan",
    "half dome",
    "quarter dome",
    "duomid",
    "solomid",
    "trailstar",
    "plex solo",
    "pivot solo",
    "aeon li",
    "gossamer gear the one",
    "gossamer gear the two",
    "splitwing",
  ],
  Backpacks: [
    "rucksack",
    "atmos ag",
    "aura ag",
    "exos",
    "eja",
    "kestrel",
    "levity",
    "talon",
    "osprey tempest",
    "baltoro",
    "deva",
    "paragon",
    "zulu",
    "crown2",
    "granite gear blaze",
    "perimeter",
    "circuit",
    "ohm",
    "windrider",
    "junction",
    "unbound",
    "arc blast",
    "arc haul",
    "mariposa",
    "gorilla",
    "kumo",
    "aircontact",
    "bridger",
    "terraplane",
    "sawtooth",
    // Pa'lante has the same apostrophe-tokenization split as Arc'teryx (see
    // Rain Gear) -- "pa" alone is a very short/generic token, but the full
    // adjacent chain is still specific enough to be safe.
    "pa lante joey",
    "palante joey",
    "liteaf",
    "liteaf curve",
    "atom packs",
    "superior wilderness designs",
  ],
  "Sleeping Bags": [
    "swallow",
    "egret",
    "merlin",
    "ultralite",
    "alpinlite",
    "versalite",
    "megalite",
    "highlite",
    "disco",
    "nemo forte",
    "nemo tempo",
    "nemo riff",
    "trestles",
    "marmot phase",
    "sea to summit spark",
    "sea to summit ascent",
    "magma",
    "hyperion",
    "questar",
    "parsec",
  ],
  "Sleeping Pads": [
    "neoair",
    "xtherm",
    "xlite",
    "prolite",
    "ridgerest",
    "z lite",
    "tensor",
    "klymit static",
    "big agnes air core",
    "synmat",
    "downmat",
    "etherlight",
  ],
  "Rain Gear": [
    "torrentshell",
    "marmot precip",
    "frogg toggs",
    "outdoor research helium",
    "outdoor research foray",
    // Arc'teryx tokenizes to separate "arc"/"teryx" lexemes with the
    // apostrophe (Postgres splits on it) but one "arcteryx" lexeme without
    // it -- both spellings are common enough in the wild to need their own
    // entry, since neither tokenization can match the other.
    "arc teryx beta",
    "arcteryx beta",
    "zpacks vertice",
  ],
  Jackets: [
    "nano puff",
    "micro puff",
    "down sweater",
    "enlightened equipment torrid",
    "feathered friends eos",
    "feathered friends helios",
    "mountain hardwear ghost whisperer",
    "montbell plasma",
  ],
  Quilts: [
    "enlightened equipment revelation",
    "enlightened equipment enigma",
    "katabatic alsek",
    "katabatic palisade",
    "katabatic sawatch",
    "katabatic flex",
    "hammock gear burrow",
    "timmermade",
    "cumulus quilt",
  ],
  "Water Filters": [
    "sawyer squeeze",
    "katadyn befree",
    "katadyn vario",
    "platypus quickdraw",
    "platypus gravityworks",
    "msr trailshot",
    "msr miniworks",
    "lifestraw",
  ],
  "Water Purifiers": [
    "msr guardian",
    "grayl geopress",
    "steripen ultra",
    "steripen adventurer",
  ],
  "Water Treatments": [
    "aquamira",
    "katadyn micropur",
    "potable aqua",
    "polar pure",
  ],
  "Water Containers": ["smartwater", "nalgene", "cnoc vecto", "hydrapak"],
  Stoves: [
    "pocketrocket",
    "windpro",
    "gigapower",
    "amicus",
    "windmaster",
    "whisperlite",
    "brs-3000t",
    "trangia",
    "jetboil flash",
    "minimo",
    "burner",
    "toaks",
    "vargo hexagon",
    "esbit",
  ],
  Headlamps: [
    "black diamond spot",
    "black diamond storm",
    "black diamond distance",
    "sprinter",
    "astro",
    "actik",
    "swift",
    "tikka",
    "iko",
    "bindi",
    "nu25",
    "nu32",
  ],
  "Trekking Poles": [
    "black diamond trail",
    "black diamond alpine carbon",
    "ergo cork",
    "makalu",
    "khumbu",
    "leki micro vario",
    "gossamer gear lt5",
    "fizan compact",
    "komperdell carbon",
  ],
  "Bear Proof Containers": ["bearvault", "ursack", "garcia cache"],
  GPS: ["garmin inreach", "garmin gpsmap", "garmin etrex", "garmin montana"],
  "Navigation Tools": ["suunto mc-2", "silva ranger"],
  Knives: ["benchmade bugout", "spyderco para", "opinel", "victorinox classic"],
  Multitools: [
    "leatherman wave",
    "leatherman skeletool",
    "leatherman squirt",
    "victorinox swisstool",
    "gerber dime",
  ],
  Snowshoes: ["msr lightning ascent", "msr evo", "tubbs"],
  Microspikes: ["kahtoola exospikes"],
  Crampons: [
    "black diamond sabretooth",
    "black diamond contact strap",
    "petzl vasak",
    "petzl irvis",
    "grivel air tech",
    "hillsound trail crampon",
  ],
  "Ice Axes": [
    "black diamond raven",
    "petzl glacier",
    "petzl sum tec",
    "petzl sumtec",
    "camp corsa",
  ],
  Chairs: [
    "flexlite",
    "helinox zero",
    "big agnes skyline",
    "nemo moonlite",
    "nemo stargaze",
  ],
};

async function run() {
  for (const [name, keywords] of Object.entries(categoryKeywords)) {
    await db.gearCategory.updateMany({
      where: { name, public: true },
      data: { keywords },
    });
  }
}

export const gearCategoryKeywords: ProductionSeed = {
  run,
  name: "gear-category-keywords",
};

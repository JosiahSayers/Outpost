import type { FluidUnit } from "$/frontend/shared-components/converter/fluid-conversions";
import type { WeightUnit } from "$/frontend/shared-components/converter/weight-conversions";
import type { FullTrip } from "$/transformers/trip";
import PDFDocument from "pdfkit";
import type { FoodSectionDay } from "./food-section";
import {
  drawMealPlanSection,
  type MealPlanSectionDay,
} from "./meal-plan-section";
import { drawTripPackingListSection } from "./packing-list-section";
import { drawTasksSection } from "./tasks-section";
import {
  drawTripDetailsSection,
  drawTripMasthead,
} from "./trip-details-section";

export type TripSummarySection =
  "details" | "tasks" | "mealPlan" | "packingList";

export interface TripSummaryPdfOptions {
  sections: Set<TripSummarySection>;
  taskBlank: boolean;
  packingListBlank: boolean;
  // Resolved client-side (account setting, falling back to a locale guess)
  // and passed straight through — see app/validation/trip.ts. weightUnit
  // isn't consumed by any section yet (nothing renders weight in this PDF
  // today) but is accepted now so the route's unit contract covers both
  // settings together.
  fluidUnit: FluidUnit;
  weightUnit: WeightUnit;
}

export function toMealPlanDays(trip: FullTrip): MealPlanSectionDay[] {
  return trip.mealPlanDays
    .slice()
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => ({
      dayNumber: day.dayNumber,
      date: day.date,
      items: day.items.map((item) => ({
        meal: item.meal,
        name: item.mealPlanItem.name,
        quantity: item.quantity,
        waterMl: item.mealPlanItem.waterMl,
      })),
    }));
}

export function toFoodDays(trip: FullTrip): FoodSectionDay[] {
  return trip.mealPlanDays
    .slice()
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => ({
      dayNumber: day.dayNumber,
      date: day.date,
      items: day.items.map((item) => ({
        meal: item.meal,
        name: item.mealPlanItem.name,
        quantity: item.quantity,
        purchased: item.purchased,
        packed: item.packed,
      })),
    }));
}

// Owns the whole PDF document lifecycle for BTP-78's combined trip summary:
// creates it, registers fonts, sets up the once-per-page logo, then draws
// whichever sections were requested — continuously, with no forced page
// break between them, letting pdfkit paginate wherever content actually
// overflows. Each section-drawing function only draws, never creates/ends
// the document itself (see trip-summary/shared.ts).
export async function generateTripSummaryPdf(
  trip: FullTrip,
  options: TripSummaryPdfOptions,
  output: NodeJS.WritableStream,
): Promise<void> {
  const document = new PDFDocument({
    info: {
      Title: `${trip.name} — Trip Summary`,
      Author: "Outpost",
    },
    margin: 36,
    permissions: {
      printing: "highResolution",
      modifying: true,
      copying: true,
      annotating: true,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: true,
    },
    size: "LETTER",
  });
  document.pipe(output);

  document.registerFont(
    "Playfair Display Bold",
    "./assets/fonts/playfair-display-bold.ttf",
  );
  document.registerFont(
    "Playfair Display Black",
    "./assets/fonts/playfair-display-black.ttf",
  );
  document.registerFont(
    "Source Sans 3",
    "./assets/fonts/source-sans-3-regular.ttf",
  );
  document.registerFont(
    "Source Sans 3 SemiBold",
    "./assets/fonts/source-sans-3-semibold.ttf",
  );

  const logoHeight = 22;
  const logoWidth = logoHeight * (430 / 107);
  const drawLogo = () => {
    document.image(
      "./assets/images/outpost-logo-no-tagline.png",
      document.page.width - document.page.margins.right - logoWidth,
      document.page.margins.top - logoHeight,
      { width: logoWidth, height: logoHeight },
    );
  };
  drawLogo();
  document.on("pageAdded", drawLogo);

  // Drawn once regardless of which sections are selected — even a lone
  // Packing List export should say whose trip it is.
  drawTripMasthead(document, trip);

  if (options.sections.has("details")) {
    drawTripDetailsSection(document, trip);
  }
  if (options.sections.has("tasks")) {
    drawTasksSection(document, trip.tasks, { blank: options.taskBlank });
  }
  if (options.sections.has("mealPlan")) {
    drawMealPlanSection(document, toMealPlanDays(trip), options.fluidUnit);
  }
  if (options.sections.has("packingList")) {
    const gearSections =
      trip.packingList?.packingList.packingListSections ?? [];
    drawTripPackingListSection(document, gearSections, toFoodDays(trip), {
      blank: options.packingListBlank,
    });
  }

  document.end();
}

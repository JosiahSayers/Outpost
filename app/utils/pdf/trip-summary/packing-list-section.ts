import {
  drawPackingListSection,
  type PackingListSectionInput,
} from "../packing-list-generator";
import { foodDaysToSections, type FoodSectionDay } from "./food-section";
import { drawSectionHeading } from "./shared";

export function drawTripPackingListSection(
  document: PDFKit.PDFDocument,
  sections: PackingListSectionInput[],
  foodDays: FoodSectionDay[],
  options: { blank: boolean },
): void {
  const allSections = [...sections, ...foodDaysToSections(foodDays)];
  const hasContent = allSections.some((section) => section.items.length > 0);
  if (!hasContent) return;

  drawSectionHeading(document, "Packing List");
  drawPackingListSection(document, allSections, { blank: options.blank });
}

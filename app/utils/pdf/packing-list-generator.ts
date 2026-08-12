import type { FullPackingList } from "$/transformers/packing-list";
import type { PackingListItemTransformerInput } from "$/transformers/packing-list-item";
import PDFDocument from "pdfkit";
import type {
  TripPackingListItemStatus,
  User,
} from "../../../generated/prisma/client";

// pdfkit positions text by the top of the font's ascender box, which varies
// by font. This returns the offset that centers the font's cap-height
// (rather than its full ascender) inside a box of `boxSize`, so item text
// lines up with its checkbox regardless of the active font's metrics.
export function capHeightCenterOffset(
  boxSize: number,
  font: { ascender: number; capHeight: number; fontSize: number },
): number {
  const scale = font.fontSize / 1000;
  const ascender = font.ascender * scale;
  const capHeight = font.capHeight * scale;
  return boxSize / 2 + capHeight / 2 - ascender;
}

// Same ascender-box quirk as above: returns how far the active font's
// cap-height sits below the nominal text-box top, so text set in a
// different font/size can have its cap-height aligned with a reference
// font's cap-height at the same nominal y.
export function capHeightTopOffset(font: {
  ascender: number;
  capHeight: number;
  fontSize: number;
}): number {
  const scale = font.fontSize / 1000;
  return (font.ascender - font.capHeight) * scale;
}

// A packing list item shows its assigned gear's name in place of its own
// name once one has been linked from the user's inventory.
export function getItemDisplayName(
  item: Pick<PackingListItemTransformerInput, "name" | "assignedGear">,
): string {
  return item.assignedGear?.name ?? item.name;
}

export function getQuantityLabel(
  item: Pick<PackingListItemTransformerInput, "quantity">,
): string {
  return item.quantity > 1 ? `  ×${item.quantity}` : "";
}

// Optional items always sort after required ones; within each group, items
// keep their manually-assigned sortPosition order.
export function compareItemsForDisplay(
  a: Pick<PackingListItemTransformerInput, "optional" | "sortPosition">,
  b: Pick<PackingListItemTransformerInput, "optional" | "sortPosition">,
): number {
  if (a.optional && !b.optional) {
    return 1;
  }

  if (!a.optional && b.optional) {
    return -1;
  }

  return a.sortPosition - b.sortPosition;
}

export async function generatePackingListPdf(
  packingList: FullPackingList & { owner: User | null },
  output: NodeJS.WritableStream,
) {
  const document = new PDFDocument({
    info: {
      Title: packingList.name,
      Author: packingList.owner?.name ?? "Outpost",
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

  // Mark every page with the Outpost logo, tucked into the top margin so it
  // never overlaps the title or the packing list content that starts below it.
  const logoHeight = 22;
  const logoWidth = logoHeight * (430 / 107); // source SVG aspect ratio
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

  document
    .fontSize(24)
    .font("Playfair Display Black")
    .text(packingList.name, { align: "center" });
  document.moveDown();

  document.font("Source Sans 3");
  if (packingList.description) {
    document
      .fontSize(8)
      .fillColor([100, 100, 100])
      .text(packingList.description, {
        align: "center",
      });
    document.moveDown();
  }

  if (packingList.sourceUrl) {
    document
      .fontSize(8)
      .fillColor("black")
      .text("Reference: ", { continued: true })
      .fillColor([100, 100, 100])
      .text(packingList.sourceUrl, {
        link: packingList.sourceUrl,
        underline: true,
      });
    document.moveDown();
  }

  document
    .moveTo(80, document.y + 10)
    .lineTo(document.page.width - 80, document.y + 10)
    .stroke();

  document.moveDown().moveDown().moveDown();

  drawPackingListSection(document, packingList.packingListSections);

  document.end();
}

export type PackingListSectionItemInput = Pick<
  PackingListItemTransformerInput,
  "name" | "quantity" | "optional" | "sortPosition" | "assignedGear"
> & {
  tripPackingListItemStatuses?: TripPackingListItemStatus[];
  // Food items merged in from the meal plan carry two independent
  // checkboxes (bought/packed) instead of gear's single packed status.
  foodStatus?: { purchased: boolean; packed: boolean };
};

export type PackingListSectionInput = {
  name: string;
  sortPosition: number;
  items: PackingListSectionItemInput[];
  // Present only for food sections — a short line drawn once beneath the
  // title (e.g. "Bought · Packed") explaining what the two checkboxes mean.
  checkboxLegend?: string;
};

function getItemStatus(
  item: PackingListSectionItemInput,
): TripPackingListItemStatus | undefined {
  return item.tripPackingListItemStatuses?.[0];
}

// Draws the categorized, 3-column checkbox list — the delicate part of the
// existing packing-list PDF (column balancing, page overflow, widow
// prevention). Takes an already-open document and draws from its current
// x/y, so it can be reused for a standalone packing list (via
// generatePackingListPdf above) or as one section of the combined trip
// summary PDF, which draws its own heading beforehand instead of this
// generator's title/description/reference block.
export function drawPackingListSection(
  document: PDFKit.PDFDocument,
  sections: PackingListSectionInput[],
  options: { blank?: boolean } = {},
): void {
  const blank = options.blank ?? true;

  document.fillColor("black");

  // pdfkit doesn't expose the active font's metrics publicly; read them off
  // its private fields so capHeightCenterOffset/capHeightTopOffset can stay
  // pure, plain-argument functions.
  const currentFontMetrics = () => {
    const internal = document as unknown as {
      _font: { ascender: number; capHeight: number };
      _fontSize: number;
    };
    return {
      ascender: internal._font.ascender,
      capHeight: internal._font.capHeight,
      fontSize: internal._fontSize,
    };
  };

  document.font("Playfair Display Bold").fontSize(12);
  const sectionTitleCapHeightTopOffset =
    capHeightTopOffset(currentFontMetrics());

  let checkboxX = document.x;
  const startingY = document.y;
  let column = 1;
  let currentPage = 1;
  const checkboxGap = 12;
  const checkboxSize = 8;
  const lineGap = 2;
  const columnGap = 24;
  const columnWidth =
    (document.page.width -
      document.page.margins.left -
      document.page.margins.right -
      columnGap -
      columnGap) /
    3;
  // Gap between a food row's two checkboxes (bought/packed) — narrower than
  // checkboxGap since it's just separating the pair, not leading into text.
  const foodCheckboxGap = 6;

  const moveToNextColumn = () => {
    checkboxX =
      document.page.margins.left + columnGap * column + columnWidth * column;
    column += 1;
    const newY = currentPage === 1 ? startingY : document.page.margins.top;
    document.x = checkboxX;
    document.y = newY;
  };

  const moveToNextPage = () => {
    column = 1;
    currentPage += 1;
    checkboxX = document.page.margins.left;
    document.x = document.page.margins.left;
    document.addPage();
  };

  const columnCalculations = (
    nextString: string,
    nextStringWidth: number,
    nextStringTopMargin: number = 0,
    extraTrailingHeight: number = 0,
  ) => {
    const atEndOfColumn =
      document.y >=
      document.page.height - lineGap - document.page.margins.bottom;
    const willOverflowPage =
      document.heightOfString(nextString, { width: nextStringWidth }) +
        document.y +
        nextStringTopMargin +
        extraTrailingHeight >
      document.page.height - document.page.margins.bottom;

    if ((atEndOfColumn || willOverflowPage) && column < 3) {
      moveToNextColumn();
      return true;
    } else if (atEndOfColumn || willOverflowPage) {
      moveToNextPage();
      return true;
    }

    return false;
  };

  sections
    .slice()
    .sort((a, b) => a.sortPosition - b.sortPosition)
    .forEach((section, index) => {
      // Not-needed is a decision about trip relevance, not checked state —
      // it's excluded whether printing blank or carried-over.
      const includedItems = section.items.filter(
        (item) => !getItemStatus(item)?.notNeeded,
      );
      if (includedItems.length === 0) return;

      // Food sections carry a bought/packed pair instead of one checkbox,
      // so they need more horizontal room reserved before the item text.
      const isFoodSection = !!section.checkboxLegend;
      const textOffsetFromCheckboxX = isFoodSection
        ? checkboxSize * 2 + foodCheckboxGap + checkboxGap
        : checkboxGap;
      const sectionTextWidth =
        columnWidth - textOffsetFromCheckboxX - checkboxSize;

      let titleTopMargin = index === 0 ? 0 : 24;
      const sectionTitleOptions = {
        width: columnWidth,
      };

      const drawContinuationLabel = () => {
        document.fontSize(9).font("Source Sans 3 SemiBold");
        const y =
          document.y +
          sectionTitleCapHeightTopOffset -
          capHeightTopOffset(currentFontMetrics());
        document
          .fillColor([130, 130, 130])
          .text(`${section.name} (continued)`, checkboxX, y, {
            width: columnWidth,
          });
        document.moveDown(0.5);
        document
          .fillColor("black")
          .fontSize(8)
          .font("Source Sans 3")
          .lineGap(lineGap);
      };

      const sortedItems = includedItems.slice().sort(compareItemsForDisplay);
      const firstItem = sortedItems[0];

      // A title alone at the bottom of a column, with all of its items
      // pushed to the next one, reads as a mistake. Measure how much room
      // the first line of content needs (the "Optional:" label if the
      // section leads with an optional item, otherwise the first item's
      // line) and require the title to have room for both, so the whole
      // section moves together when it doesn't fit.
      document
        .fontSize(12)
        .font("Playfair Display Bold")
        .lineGap(lineGap * 2);
      const titleHeight = document.heightOfString(section.name, {
        width: columnWidth,
      });

      let firstContentHeight = 0;
      if (isFoodSection && section.checkboxLegend) {
        document.font("Source Sans 3 SemiBold").fontSize(7).lineGap(lineGap);
        firstContentHeight +=
          8 +
          document.heightOfString(section.checkboxLegend, {
            width: columnWidth,
          });
      }
      if (firstItem) {
        if (firstItem.optional) {
          document
            .font("Source Sans 3 SemiBold")
            .fontSize(10)
            .lineGap(lineGap * 2);
          firstContentHeight +=
            12 + document.heightOfString("Optional:", { width: columnWidth });
        } else {
          document.font("Source Sans 3").fontSize(8).lineGap(lineGap);
          firstContentHeight += document.heightOfString(
            getItemDisplayName(firstItem) + getQuantityLabel(firstItem),
            { width: sectionTextWidth },
          );
        }
      }

      // columnCalculations measures `nextString` using whichever font is
      // active when it's called, so restore the title's font before
      // invoking it (firstContentHeight measurement above may have changed it).
      document
        .fontSize(12)
        .font("Playfair Display Bold")
        .lineGap(lineGap * 2);
      const overflowed = columnCalculations(
        section.name,
        columnWidth,
        titleTopMargin,
        titleHeight + firstContentHeight,
      );
      titleTopMargin = overflowed ? 0 : titleTopMargin;
      document
        .fontSize(12)
        .font("Playfair Display Bold")
        .lineGap(lineGap * 2)
        .text(
          section.name,
          checkboxX,
          document.y + titleTopMargin,
          sectionTitleOptions,
        );

      document.fontSize(8).font("Source Sans 3").lineGap(lineGap);

      if (isFoodSection && section.checkboxLegend) {
        const didMove = columnCalculations(
          section.checkboxLegend,
          columnWidth,
          8,
        );
        if (didMove) drawContinuationLabel();
        document
          .font("Source Sans 3 SemiBold")
          .fontSize(7)
          .fillColor([130, 130, 130])
          .text(
            section.checkboxLegend,
            checkboxX,
            document.y + (didMove ? 0 : 8),
            { width: columnWidth },
          );
        document.moveDown(0.6);
        document
          .fillColor("black")
          .fontSize(8)
          .font("Source Sans 3")
          .lineGap(lineGap);
      }

      let lastItemWasOptional = false;
      sortedItems.forEach((item) => {
        if (item.optional && !lastItemWasOptional) {
          const didMove = columnCalculations("Optional:", columnWidth, 12);
          if (didMove) drawContinuationLabel();
          document
            .font("Source Sans 3 SemiBold")
            .fontSize(10)
            .lineGap(lineGap * 2)
            .text("Optional:", checkboxX, document.y + (didMove ? 0 : 12), {
              width: columnWidth,
            });
          lastItemWasOptional = true;
          document.font("Source Sans 3").fontSize(8).lineGap(lineGap);
        }

        const quantityLabel = getQuantityLabel(item);
        const displayName = getItemDisplayName(item);

        const didMove = columnCalculations(
          displayName + quantityLabel,
          sectionTextWidth,
          1,
        );
        if (didMove) drawContinuationLabel();

        const drawCheckbox = (x: number, checked: boolean) => {
          document.rect(x, document.y, checkboxSize, checkboxSize).stroke();
          if (checked) {
            document.rect(x, document.y, checkboxSize, checkboxSize).fill();
          }
        };

        if (isFoodSection) {
          const purchased = !blank && (item.foodStatus?.purchased ?? false);
          const packed = !blank && (item.foodStatus?.packed ?? false);
          drawCheckbox(checkboxX, purchased);
          drawCheckbox(checkboxX + checkboxSize + foodCheckboxGap, packed);
        } else {
          const checked = !blank && (getItemStatus(item)?.packed ?? false);
          drawCheckbox(checkboxX, checked);
        }

        document.text(
          displayName,
          checkboxX + textOffsetFromCheckboxX,
          document.y +
            capHeightCenterOffset(checkboxSize, currentFontMetrics()),
          { width: sectionTextWidth, continued: !!quantityLabel },
        );
        if (quantityLabel) {
          document
            .fillColor([130, 130, 130])
            .text(quantityLabel)
            .fillColor("black");
        }
      });
    });
}

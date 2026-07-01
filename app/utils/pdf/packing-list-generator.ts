import type { FullPackingList } from "$/transformers/packing-list";
import PDFDocument from "pdfkit";
import type { User } from "../../../generated/prisma/client";

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

  document
    .fontSize(24)
    .font("./assets/fonts/carter-one.ttf")
    .text(packingList.name, { align: "center" });
  document.moveDown();

  document.font("Courier");
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

  document.fillColor("black");

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
  const columnTextWidth = columnWidth - checkboxGap - checkboxSize;

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
  ) => {
    const atEndOfColumn =
      document.y >=
      document.page.height - lineGap - document.page.margins.bottom;
    const willOverflowPage =
      document.heightOfString(nextString, { width: nextStringWidth }) +
        document.y +
        nextStringTopMargin >
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

  packingList.packingListSections
    .sort((a, b) => a.sortPosition - b.sortPosition)
    .forEach((section, index) => {
      let titleTopMargin = index === 0 ? 0 : 24;
      const sectionTitleOptions = {
        width: columnWidth,
      };
      const titleHeight =
        titleTopMargin +
        document.heightOfString(section.name, sectionTitleOptions);
      const optionalTitleHeight = section.items.find((item) => item.optional)
        ? 12 +
          document.heightOfString("Optional:", {
            width: columnWidth,
            lineGap: lineGap * 2,
          })
        : 0;
      const itemHeights = section.items.reduce((totalHeight, item) => {
        const itemHeight =
          1 + document.heightOfString(item.name, { width: columnTextWidth });
        return (totalHeight += itemHeight);
      }, 0);
      const sectionHeight = titleHeight + optionalTitleHeight + itemHeights;
      const willOverflowPage =
        column === 3 &&
        document.y + sectionHeight >
          document.page.height - document.page.margins.bottom;
      if (willOverflowPage) {
        moveToNextPage();
      }

      const overflowed = columnCalculations(
        section.name,
        columnWidth,
        titleTopMargin,
      );
      titleTopMargin = overflowed ? 0 : titleTopMargin;
      document
        .fontSize(12)
        .font("Courier-Bold")
        .lineGap(lineGap * 2)
        .text(
          section.name,
          checkboxX,
          document.y + titleTopMargin,
          sectionTitleOptions,
        );

      document.fontSize(8).font("Courier").lineGap(lineGap);

      let lastItemWasOptional = false;
      section.items
        .sort((a, b) => {
          if (a.optional && !b.optional) {
            return 1;
          }

          if (!a.optional && b.optional) {
            return -1;
          }

          return a.sortPosition - b.sortPosition;
        })
        .forEach((item) => {
          if (item.optional && !lastItemWasOptional) {
            const didMove = columnCalculations("Optional:", columnWidth, 12);
            document.font("Courier-Bold");
            document
              .font("Courier-Bold")
              .fontSize(10)
              .lineGap(lineGap * 2)
              .text("Optional:", checkboxX, document.y + (didMove ? 0 : 12), {
                width: columnWidth,
              });
            lastItemWasOptional = true;
            document.font("Courier").fontSize(8).lineGap(lineGap);
          }

          columnCalculations(item.name, columnTextWidth, 1);

          document
            .rect(checkboxX, document.y, checkboxSize, checkboxSize)
            .stroke();
          document.text(item.name, checkboxX + checkboxGap, document.y + 1, {
            width: columnTextWidth,
          });
        });
    });

  document.end();
}

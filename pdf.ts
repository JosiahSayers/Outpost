import { createWriteStream } from "node:fs";
import PDFDocument from "pdfkit";
import { db } from "$/utils/db";

const packingList = await db.packingList.findFirst({
  where: { name: "REI Backpacking Checklist" },
  include: {
    owner: true,
    packingListSections: {
      include: {
        items: true,
      },
    },
  },
});

if (!packingList) {
  console.error("Could not find packing list");
  process.exit(1);
}

console.time("pdf");
await new Promise((resolve, reject) => {
  const document = new PDFDocument({
    info: {
      Title: packingList.name,
      Author: packingList.owner?.name ?? "Backpacking Trip Planner",
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
  const stream = createWriteStream("./out.pdf");
  document.pipe(stream);

  document
    .fontSize(24)
    .font("Courier-Bold")
    .text(packingList.name, { align: "center" });
  document.moveDown();

  document.font("Courier");
  if (packingList.description) {
    document
      .fontSize(8)
      .fillColor("grey")
      .text(packingList.description, { align: "justify" });
    document.moveDown();
  }

  if (packingList.sourceUrl) {
    document
      .fontSize(8)
      .fillColor("black")
      .text("Reference: ", { continued: true })
      .fillColor("grey")
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
  const lineGap = 8;
  const columnGap = 24;
  const columnWidth =
    (document.page.width -
      document.page.margins.left -
      document.page.margins.right -
      columnGap -
      columnGap) /
    3;
  const columnTextWidth = columnWidth - checkboxGap - checkboxSize;
  console.log({
    columnWidth,
    columnTextWidth,
    pageWidth: document.page.width,
    margin: document.page.margins.left,
  });

  packingList.packingListSections
    .sort((a, b) => a.sortPosition - b.sortPosition)
    .forEach((section, index) => {
      const titleTopMargin = index === 0 ? 0 : 24;
      document
        .fontSize(12)
        .font("Courier-Bold")
        .text(section.name, checkboxX, document.y + titleTopMargin, {
          width: columnWidth,
        });

      document.fontSize(8).font("Courier");

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
          const atEndOfColumn =
            document.y >=
            document.page.height - lineGap - document.page.margins.bottom;
          const willOverflowPage =
            document.heightOfString(item.name, { width: columnTextWidth }) +
              document.y >
            document.page.height - document.page.margins.bottom;
          // console.log({
          //   checkboxX,
          //   y: document.y,
          //   pageHeight: document.page.height,
          //   lineGap,
          //   bottomMargin: document.page.margins.bottom,
          //   column,
          //   item: item.name,
          //   atEndOfColumn,
          //   willOverflowPage,
          // });

          if ((atEndOfColumn || willOverflowPage) && column < 3) {
            checkboxX =
              document.page.margins.left +
              columnGap * column +
              columnWidth * column;
            column += 1;
            const newY =
              currentPage === 1 ? startingY : document.page.margins.top;
            document.x = checkboxX;
            document.y = newY;
          } else if (atEndOfColumn || willOverflowPage) {
            column = 1;
            currentPage += 1;
            checkboxX = document.page.margins.left;
            document.x = document.page.margins.left;
            document.y =
              document.page.height * currentPage + document.page.margins.top;
          }

          document.lineGap(lineGap);
          if (item.optional && !lastItemWasOptional) {
            document.font("Courier-Bold");
            document
              .font("Courier-Bold")
              .fontSize(10)
              .text("Optional:", checkboxX, document.y + 12, {
                width: columnWidth,
              });
            lastItemWasOptional = true;
            document.font("Courier").fontSize(8);
          }

          document
            .rect(checkboxX, document.y, checkboxSize, checkboxSize)
            .stroke();
          document.text(item.name, checkboxX + checkboxGap, document.y + 1, {
            width: columnTextWidth,
          });
        });
    });

  document.end();

  stream.on("finish", resolve);
  stream.on("error", reject);
});
console.timeEnd("pdf");
console.timeLog("pdf");
process.exit(0);

import PDFDocument from "pdfkit";
import { Writable } from "node:stream";

// A document configured the same way as the real generators (same fonts
// registered, same page setup) but with `bufferPages: true` so tests can
// inspect `bufferedPageRange().count` synchronously without ever piping the
// document anywhere — most structural assertions (guard clauses, pagination,
// spacing) don't need actual output bytes.
export function makeTestDocument(): PDFKit.PDFDocument {
  const document = new PDFDocument({
    margin: 36,
    size: "LETTER",
    bufferPages: true,
  });
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
  document.font("Source Sans 3").fontSize(10).fillColor("black");
  return document;
}

export function pageCount(document: PDFKit.PDFDocument): number {
  return document.bufferedPageRange().count;
}

// Only needed when a test wants to assert on the actual output bytes (a
// valid "%PDF-" file, a minimum size) rather than just document structure.
export async function renderToBuffer(
  document: PDFKit.PDFDocument,
  draw: () => void,
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  const output = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(chunk);
      callback();
    },
  });
  const finished = new Promise<void>((resolve, reject) => {
    output.on("finish", resolve);
    output.on("error", reject);
  });

  document.pipe(output);
  draw();
  document.end();
  await finished;

  return Buffer.concat(chunks);
}

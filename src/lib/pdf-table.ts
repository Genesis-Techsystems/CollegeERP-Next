"use client";

/**
 * Angular Syncfusion `pdfExport()` parity — builds a bordered table PDF with an
 * optional logo + college banner and downloads it directly (no print dialog).
 */

export type PdfTableColumn = {
  header: string;
  /** Column width in points. */
  width: number;
};

export type PdfTableOptions = {
  fileName: string;
  columns: PdfTableColumn[];
  /** Cell text per row, in the same order as `columns`. */
  rows: string[][];
  title?: string;
  subtitle?: string;
  logoSrc?: string;
  orientation?: "portrait" | "landscape";
};

async function embedLogo(
  pdfDoc: import("pdf-lib").PDFDocument,
  logoSrc: string,
) {
  try {
    const res = await fetch(logoSrc);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const isPng =
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47;
    return isPng ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes);
  } catch {
    return null;
  }
}

export async function downloadTablePdf(opts: PdfTableOptions): Promise<void> {
  const {
    fileName,
    columns,
    rows,
    title,
    subtitle,
    logoSrc,
    orientation = "portrait",
  } = opts;

  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoImage = logoSrc ? await embedLogo(pdfDoc, logoSrc) : null;

  const pageWidth = orientation === "landscape" ? 842 : 595;
  const pageHeight = orientation === "landscape" ? 595 : 842;
  const marginX = 36;
  const marginTop = 28;
  const marginBottom = 28;
  const cellSize = 9;
  const rowH = 18;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - marginTop;

  const truncate = (text: string, maxWidth: number, useBold = false) => {
    const f = useBold ? fontBold : font;
    let t = text;
    if (f.widthOfTextAtSize(t, cellSize) <= maxWidth) return t;
    while (t.length > 0 && f.widthOfTextAtSize(`${t}…`, cellSize) > maxWidth) {
      t = t.slice(0, -1);
    }
    return t ? `${t}…` : "";
  };

  const drawBanner = () => {
    if (!title && !subtitle && !logoImage) return;
    const logoSize = 44;
    const textX = marginX + (logoImage ? logoSize + 14 : 0);
    if (logoImage) {
      page.drawImage(logoImage, {
        x: marginX,
        y: y - logoSize,
        width: logoSize,
        height: logoSize,
      });
    }
    if (title) {
      page.drawText(title, {
        x: textX,
        y: y - 16,
        size: 13,
        font: fontBold,
        color: rgb(0.1, 0.34, 0.63),
      });
    }
    if (subtitle) {
      page.drawText(subtitle, {
        x: textX,
        y: y - 32,
        size: 11,
        font: fontBold,
        color: rgb(0.1, 0.34, 0.63),
      });
    }
    y -= logoImage ? logoSize + 12 : 46;
  };

  const drawTableHeader = () => {
    let x = marginX;
    for (const col of columns) {
      page.drawRectangle({
        x,
        y: y - rowH,
        width: col.width,
        height: rowH,
        borderColor: rgb(0.35, 0.35, 0.35),
        borderWidth: 0.6,
      });
      page.drawText(truncate(col.header, col.width - 6, true), {
        x: x + 3,
        y: y - rowH + 5,
        size: cellSize,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      });
      x += col.width;
    }
    y -= rowH;
  };

  drawBanner();
  drawTableHeader();

  for (const row of rows) {
    if (y - rowH < marginBottom) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - marginTop;
      drawBanner();
      drawTableHeader();
    }
    let x = marginX;
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]!;
      page.drawRectangle({
        x,
        y: y - rowH,
        width: col.width,
        height: rowH,
        borderColor: rgb(0.35, 0.35, 0.35),
        borderWidth: 0.6,
      });
      page.drawText(truncate(String(row[i] ?? ""), col.width - 6), {
        x: x + 3,
        y: y - rowH + 5,
        size: cellSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      x += col.width;
    }
    y -= rowH;
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.toLowerCase().endsWith(".pdf")
    ? fileName
    : `${fileName}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
}

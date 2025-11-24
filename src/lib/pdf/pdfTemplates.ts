// src/lib/pdf/pdfTemplates.ts
// PDF templates, coordinates, and styling for CMA reports

import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';

// ─────────────────────────────────────────────────────────────────────────────
// COLOR PALETTE
// ─────────────────────────────────────────────────────────────────────────────

export const Colors = {
  // Primary brand colors
  primaryBlue: rgb(0.2, 0.4, 0.8),
  primaryGreen: rgb(0.0, 0.6, 0.4),
  accentGold: rgb(0.85, 0.65, 0.13),

  // Text colors
  textDark: rgb(0.15, 0.15, 0.15),
  textMedium: rgb(0.4, 0.4, 0.4),
  textLight: rgb(0.6, 0.6, 0.6),
  white: rgb(1, 1, 1),

  // Status colors
  successGreen: rgb(0.13, 0.7, 0.38),
  warningOrange: rgb(0.95, 0.61, 0.07),
  errorRed: rgb(0.86, 0.24, 0.24),
  infoBlue: rgb(0.2, 0.6, 0.86),

  // Background colors
  bgLight: rgb(0.98, 0.98, 0.98),
  bgMedium: rgb(0.95, 0.95, 0.95),
  bgDark: rgb(0.9, 0.9, 0.9),

  // Table colors
  tableHeader: rgb(0.2, 0.4, 0.8),
  tableRowEven: rgb(0.97, 0.97, 0.97),
  tableRowOdd: rgb(1, 1, 1),
  tableBorder: rgb(0.8, 0.8, 0.8),
};

// ─────────────────────────────────────────────────────────────────────────────
// FONT SIZES
// ─────────────────────────────────────────────────────────────────────────────

export const FontSizes = {
  title: 24,
  heading1: 20,
  heading2: 16,
  heading3: 14,
  body: 11,
  small: 9,
  tiny: 7,
};

// ─────────────────────────────────────────────────────────────────────────────
// LAYOUT CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export const Layout = {
  // Page dimensions (US Letter)
  pageWidth: 612,
  pageHeight: 792,

  // Margins
  marginLeft: 50,
  marginRight: 50,
  marginTop: 50,
  marginBottom: 50,

  // Content area
  contentWidth: 512, // pageWidth - marginLeft - marginRight
  contentHeight: 692, // pageHeight - marginTop - marginBottom

  // Spacing
  lineHeight: 14,
  paragraphSpacing: 10,
  sectionSpacing: 20,
  tableRowHeight: 20,

  // Header/Footer
  headerHeight: 60,
  footerHeight: 40,
};

// ─────────────────────────────────────────────────────────────────────────────
// COORDINATES FOR TEMPLATE PAGES
// ─────────────────────────────────────────────────────────────────────────────

export const CoverPageCoordinates = {
  title: { x: Layout.marginLeft, y: 650 },
  subtitle: { x: Layout.marginLeft, y: 620 },
  address: { x: Layout.marginLeft, y: 580 },
  date: { x: Layout.marginLeft, y: 550 },
  agentInfo: { x: Layout.marginLeft, y: 100 },
  logo: { x: Layout.pageWidth - 150, y: 700, width: 100, height: 50 },
};

export const SummaryPageCoordinates = {
  pageTitle: { x: Layout.marginLeft, y: 720 },

  // Estimated Value section
  estimatedValueLabel: { x: Layout.marginLeft, y: 680 },
  estimatedValue: { x: Layout.marginLeft, y: 655 },
  valueRange: { x: Layout.marginLeft, y: 630 },

  // Confidence section
  confidenceLabel: { x: Layout.marginLeft, y: 600 },
  confidenceScore: { x: Layout.marginLeft, y: 575 },
  confidenceBar: { x: Layout.marginLeft, y: 560, width: 300, height: 10 },

  // Key metrics grid
  metricsGrid: {
    x: Layout.marginLeft,
    y: 520,
    columnWidth: 150,
    rowHeight: 60,
  },
};

export const CompsTableCoordinates = {
  pageTitle: { x: Layout.marginLeft, y: 720 },
  tableStart: { x: Layout.marginLeft, y: 680 },

  // Column widths
  columns: {
    address: 140,
    price: 70,
    beds: 40,
    baths: 40,
    sqft: 60,
    pricePerSqft: 70,
    dom: 50,
    similarity: 60,
  },

  headerHeight: 25,
  rowHeight: 20,
};

export const AppreciationPageCoordinates = {
  pageTitle: { x: Layout.marginLeft, y: 720 },

  // CAGR section
  cagrLabel: { x: Layout.marginLeft, y: 680 },
  cagrValue: { x: Layout.marginLeft, y: 655 },

  // Chart area
  chartArea: {
    x: Layout.marginLeft,
    y: 400,
    width: Layout.contentWidth,
    height: 220,
  },

  // Forecast section
  forecastLabel: { x: Layout.marginLeft, y: 350 },
  forecastGrid: {
    x: Layout.marginLeft,
    y: 310,
    columnWidth: 120,
    rowHeight: 40,
  },
};

export const CashflowPageCoordinates = {
  pageTitle: { x: Layout.marginLeft, y: 720 },

  // Monthly breakdown
  monthlyLabel: { x: Layout.marginLeft, y: 680 },
  monthlyGrid: {
    x: Layout.marginLeft,
    y: 640,
    labelWidth: 200,
    valueWidth: 100,
    rowHeight: 25,
  },

  // Key metrics
  metricsLabel: { x: Layout.marginLeft, y: 450 },
  metricsGrid: {
    x: Layout.marginLeft,
    y: 410,
    columnWidth: 150,
    rowHeight: 60,
  },

  // ROI chart
  roiChart: {
    x: Layout.marginLeft,
    y: 200,
    width: Layout.contentWidth,
    height: 150,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function loadFonts(pdfDoc: PDFDocument) {
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const courier = await pdfDoc.embedFont(StandardFonts.Courier);

  return {
    regular: helvetica,
    bold: helveticaBold,
    italic: helveticaOblique,
    mono: courier,
  };
}

export function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  options: {
    font: any;
    size?: number;
    color?: any;
    maxWidth?: number;
  }
) {
  const { font, size = FontSizes.body, color = Colors.textDark, maxWidth } = options;

  let finalText = text;
  if (maxWidth) {
    const textWidth = font.widthOfTextAtSize(text, size);
    if (textWidth > maxWidth) {
      // Truncate with ellipsis
      let truncated = text;
      while (font.widthOfTextAtSize(truncated + '...', size) > maxWidth && truncated.length > 0) {
        truncated = truncated.slice(0, -1);
      }
      finalText = truncated + '...';
    }
  }

  page.drawText(finalText, {
    x,
    y,
    size,
    font,
    color,
  });
}

export function drawRectangle(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  options: {
    color?: any;
    borderColor?: any;
    borderWidth?: number;
  } = {}
) {
  const { color, borderColor, borderWidth = 1 } = options;

  if (color) {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      color,
    });
  }

  if (borderColor) {
    page.drawRectangle({
      x,
      y,
      width,
      height,
      borderColor,
      borderWidth,
    });
  }
}

export function drawLine(
  page: PDFPage,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  options: {
    color?: any;
    thickness?: number;
  } = {}
) {
  const { color = Colors.tableBorder, thickness = 1 } = options;

  page.drawLine({
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    color,
    thickness,
  });
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPercent(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return 'N/A';
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatNumber(value: number | null | undefined, decimals: number = 0): string {
  if (value === null || value === undefined) return 'N/A';
  return value.toLocaleString('en-US', { minimumFractionDigals: decimals, maximumFractionDigits: decimals });
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLE DRAWING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export interface TableColumn {
  header: string;
  width: number;
  align?: 'left' | 'center' | 'right';
}

export interface TableRow {
  [key: string]: string | number;
}

export function drawTable(
  page: PDFPage,
  x: number,
  y: number,
  columns: TableColumn[],
  rows: TableRow[],
  fonts: { regular: any; bold: any }
) {
  const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
  let currentY = y;

  // Draw header
  drawRectangle(page, x, currentY - CompsTableCoordinates.headerHeight, totalWidth, CompsTableCoordinates.headerHeight, {
    color: Colors.tableHeader,
  });

  let currentX = x;
  columns.forEach((col) => {
    drawText(page, col.header, currentX + 5, currentY - 18, {
      font: fonts.bold,
      size: FontSizes.small,
      color: Colors.white,
    });
    currentX += col.width;
  });

  currentY -= CompsTableCoordinates.headerHeight;

  // Draw rows
  rows.forEach((row, rowIndex) => {
    const rowColor = rowIndex % 2 === 0 ? Colors.tableRowEven : Colors.tableRowOdd;

    drawRectangle(page, x, currentY - Layout.tableRowHeight, totalWidth, Layout.tableRowHeight, {
      color: rowColor,
      borderColor: Colors.tableBorder,
      borderWidth: 0.5,
    });

    currentX = x;
    columns.forEach((col, colIndex) => {
      const cellValue = String(row[col.header] || '');
      const textX = col.align === 'right' ? currentX + col.width - 5 :
                    col.align === 'center' ? currentX + col.width / 2 :
                    currentX + 5;

      drawText(page, cellValue, textX, currentY - 15, {
        font: fonts.regular,
        size: FontSizes.small,
        color: Colors.textDark,
        maxWidth: col.width - 10,
      });

      currentX += col.width;
    });

    currentY -= Layout.tableRowHeight;
  });

  return currentY;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHART DRAWING UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export function drawBarChart(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  data: { label: string; value: number }[],
  fonts: { regular: any; bold: any }
) {
  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = (width / data.length) * 0.7;
  const barSpacing = (width / data.length) * 0.3;

  // Draw axes
  drawLine(page, x, y, x, y + height, { color: Colors.textMedium, thickness: 1.5 });
  drawLine(page, x, y, x + width, y, { color: Colors.textMedium, thickness: 1.5 });

  // Draw bars
  data.forEach((item, index) => {
    const barHeight = (item.value / maxValue) * height;
    const barX = x + (index * (barWidth + barSpacing));
    const barY = y;

    // Bar
    drawRectangle(page, barX, barY, barWidth, barHeight, {
      color: Colors.primaryBlue,
      borderColor: Colors.primaryBlue,
    });

    // Label
    drawText(page, item.label, barX + barWidth / 2 - 15, barY - 15, {
      font: fonts.regular,
      size: FontSizes.tiny,
      color: Colors.textMedium,
    });

    // Value
    drawText(page, formatCurrency(item.value), barX + 5, barY + barHeight + 5, {
      font: fonts.bold,
      size: FontSizes.tiny,
      color: Colors.textDark,
    });
  });
}

export function drawLineChart(
  page: PDFPage,
  x: number,
  y: number,
  width: number,
  height: number,
  data: { label: string; value: number }[],
  fonts: { regular: any; bold: any }
) {
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const valueRange = maxValue - minValue;

  // Draw axes
  drawLine(page, x, y, x, y + height, { color: Colors.textMedium, thickness: 1.5 });
  drawLine(page, x, y, x + width, y, { color: Colors.textMedium, thickness: 1.5 });

  // Draw data points and lines
  const stepX = width / (data.length - 1);

  data.forEach((item, index) => {
    const pointX = x + (index * stepX);
    const pointY = y + ((item.value - minValue) / valueRange) * height;

    // Draw point
    drawRectangle(page, pointX - 2, pointY - 2, 4, 4, {
      color: Colors.primaryBlue,
    });

    // Draw line to next point
    if (index < data.length - 1) {
      const nextPointX = x + ((index + 1) * stepX);
      const nextPointY = y + ((data[index + 1].value - minValue) / valueRange) * height;

      drawLine(page, pointX, pointY, nextPointX, nextPointY, {
        color: Colors.primaryBlue,
        thickness: 2,
      });
    }

    // Label
    if (index % 2 === 0) {
      drawText(page, item.label, pointX - 15, y - 15, {
        font: fonts.regular,
        size: FontSizes.tiny,
        color: Colors.textMedium,
      });
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BRANDING & FOOTER
// ─────────────────────────────────────────────────────────────────────────────

export function drawBrandedFooter(
  page: PDFPage,
  pageNumber: number,
  totalPages: number,
  fonts: { regular: any; bold: any }
) {
  const y = Layout.marginBottom - 20;

  // Branding text
  drawText(page, 'JPSREALTOR | Joseph Sardella', Layout.marginLeft, y, {
    font: fonts.bold,
    size: FontSizes.small,
    color: Colors.primaryBlue,
  });

  // Contact info
  drawText(page, 'Professional Real Estate Services', Layout.marginLeft + 200, y, {
    font: fonts.regular,
    size: FontSizes.tiny,
    color: Colors.textLight,
  });

  // Page number
  drawText(page, `Page ${pageNumber} of ${totalPages}`, Layout.pageWidth - Layout.marginRight - 60, y, {
    font: fonts.regular,
    size: FontSizes.tiny,
    color: Colors.textMedium,
  });

  // Footer line
  drawLine(page, Layout.marginLeft, y + 10, Layout.pageWidth - Layout.marginRight, y + 10, {
    color: Colors.tableBorder,
    thickness: 0.5,
  });
}

export function drawBrandedHeader(
  page: PDFPage,
  title: string,
  fonts: { regular: any; bold: any }
) {
  const y = Layout.pageHeight - Layout.marginTop + 10;

  // Title
  drawText(page, title, Layout.marginLeft, y, {
    font: fonts.bold,
    size: FontSizes.heading1,
    color: Colors.primaryBlue,
  });

  // Header line
  drawLine(page, Layout.marginLeft, y - 10, Layout.pageWidth - Layout.marginRight, y - 10, {
    color: Colors.primaryBlue,
    thickness: 2,
  });
}

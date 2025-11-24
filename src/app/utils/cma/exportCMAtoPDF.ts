// src/app/utils/cma/exportCMAtoPDF.ts
// PDF export utilities for CMA reports - FULL IMPLEMENTATION

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { CMAReport } from '@/lib/cma/cmaTypes';
import type { SavedCMA } from './saveCMA';
import * as PDFTemplates from '@/lib/pdf/pdfTemplates';

export interface PDFExportOptions {
  includeComps?: boolean;
  includeAppreciation?: boolean;
  includeCashflow?: boolean;
  includeCharts?: boolean;
  companyLogo?: string;
  agentInfo?: {
    name: string;
    phone: string;
    email: string;
    license?: string;
  };
}

export type CMAReportType = 'full' | 'mini' | 'buyer' | 'seller';

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Export CMA as Full Report PDF
 */
export async function generateFullCMAReportPDF(cma: SavedCMA, options: PDFExportOptions = {}): Promise<Blob> {
  console.debug('📄 Generating Full CMA Report PDF');

  const pdfDoc = await PDFDocument.create();
  const fonts = await PDFTemplates.loadFonts(pdfDoc);

  // Add pages
  await addCoverPage(pdfDoc, fonts, cma, options);
  await addSummaryPage(pdfDoc, fonts, cma.report);

  if (options.includeComps !== false && cma.report.comps.length > 0) {
    await addComparablePropertiesPage(pdfDoc, fonts, cma.report);
  }

  if (options.includeAppreciation !== false && cma.report.appreciation) {
    await addAppreciationPage(pdfDoc, fonts, cma.report);
  }

  if (options.includeCashflow !== false && cma.report.cashflow) {
    await addCashflowPage(pdfDoc, fonts, cma.report);
  }

  // Add branded footers to all pages
  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    PDFTemplates.drawBrandedFooter(page, index + 1, pages.length, fonts);
  });

  const pdfBytes = await pdfDoc.save();
  console.debug('✅ Full CMA Report PDF generated');
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Export CMA as Mini Report PDF (summary only)
 */
export async function generateMiniCMAReportPDF(cma: SavedCMA, options: PDFExportOptions = {}): Promise<Blob> {
  console.debug('📄 Generating Mini CMA Report PDF');

  const pdfDoc = await PDFDocument.create();
  const fonts = await PDFTemplates.loadFonts(pdfDoc);

  // Mini report: cover + summary only
  await addCoverPage(pdfDoc, fonts, cma, options);
  await addSummaryPage(pdfDoc, fonts, cma.report);

  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    PDFTemplates.drawBrandedFooter(page, index + 1, pages.length, fonts);
  });

  const pdfBytes = await pdfDoc.save();
  console.debug('✅ Mini CMA Report PDF generated');
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Export CMA as Buyer Packet PDF
 */
export async function generateBuyerPacketPDF(cma: SavedCMA, options: PDFExportOptions = {}): Promise<Blob> {
  console.debug('📄 Generating Buyer CMA Packet PDF');

  const pdfDoc = await PDFDocument.create();
  const fonts = await PDFTemplates.loadFonts(pdfDoc);

  // Buyer packet: cover + summary + comps + appreciation
  await addCoverPage(pdfDoc, fonts, cma, { ...options, packetType: 'Buyer' });
  await addSummaryPage(pdfDoc, fonts, cma.report);

  if (cma.report.comps.length > 0) {
    await addComparablePropertiesPage(pdfDoc, fonts, cma.report);
  }

  if (cma.report.appreciation) {
    await addAppreciationPage(pdfDoc, fonts, cma.report);
  }

  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    PDFTemplates.drawBrandedFooter(page, index + 1, pages.length, fonts);
  });

  const pdfBytes = await pdfDoc.save();
  console.debug('✅ Buyer CMA Packet PDF generated');
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Export CMA as Seller Packet PDF
 */
export async function generateSellerPacketPDF(cma: SavedCMA, options: PDFExportOptions = {}): Promise<Blob> {
  console.debug('📄 Generating Seller CMA Packet PDF');

  const pdfDoc = await PDFDocument.create();
  const fonts = await PDFTemplates.loadFonts(pdfDoc);

  // Seller packet: cover + summary + comps + appreciation + cashflow
  await addCoverPage(pdfDoc, fonts, cma, { ...options, packetType: 'Seller' });
  await addSummaryPage(pdfDoc, fonts, cma.report);

  if (cma.report.comps.length > 0) {
    await addComparablePropertiesPage(pdfDoc, fonts, cma.report);
  }

  if (cma.report.appreciation) {
    await addAppreciationPage(pdfDoc, fonts, cma.report);
  }

  if (cma.report.cashflow) {
    await addCashflowPage(pdfDoc, fonts, cma.report);
  }

  const pages = pdfDoc.getPages();
  pages.forEach((page, index) => {
    PDFTemplates.drawBrandedFooter(page, index + 1, pages.length, fonts);
  });

  const pdfBytes = await pdfDoc.save();
  console.debug('✅ Seller CMA Packet PDF generated');
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE BUILDERS
// ─────────────────────────────────────────────────────────────────────────────

async function addCoverPage(
  pdfDoc: PDFDocument,
  fonts: { regular: any; bold: any; italic: any },
  cma: SavedCMA,
  options: PDFExportOptions & { packetType?: string } = {}
): Promise<void> {
  const page = pdfDoc.addPage([PDFTemplates.Layout.pageWidth, PDFTemplates.Layout.pageHeight]);

  const packetLabel = options.packetType ? ` - ${options.packetType} Packet` : '';

  // Title
  PDFTemplates.drawText(page, 'Comparative Market Analysis' + packetLabel,
    PDFTemplates.CoverPageCoordinates.title.x,
    PDFTemplates.CoverPageCoordinates.title.y, {
    font: fonts.bold,
    size: PDFTemplates.FontSizes.title,
    color: PDFTemplates.Colors.primaryBlue,
  });

  // Subject property address
  const address = cma.subjectAddress || 'Property Address';
  PDFTemplates.drawText(page, address,
    PDFTemplates.CoverPageCoordinates.address.x,
    PDFTemplates.CoverPageCoordinates.address.y, {
    font: fonts.regular,
    size: PDFTemplates.FontSizes.heading2,
    color: PDFTemplates.Colors.textDark,
  });

  // Generated date
  const date = new Date(cma.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  PDFTemplates.drawText(page, `Generated: ${date}`,
    PDFTemplates.CoverPageCoordinates.date.x,
    PDFTemplates.CoverPageCoordinates.date.y, {
    font: fonts.italic,
    size: PDFTemplates.FontSizes.body,
    color: PDFTemplates.Colors.textMedium,
  });

  // Agent info (if provided)
  if (options.agentInfo) {
    const agentY = PDFTemplates.CoverPageCoordinates.agentInfo.y;
    PDFTemplates.drawText(page, 'Prepared by:', PDFTemplates.CoverPageCoordinates.agentInfo.x, agentY + 60, {
      font: fonts.bold,
      size: PDFTemplates.FontSizes.small,
      color: PDFTemplates.Colors.textMedium,
    });

    PDFTemplates.drawText(page, options.agentInfo.name, PDFTemplates.CoverPageCoordinates.agentInfo.x, agentY + 40, {
      font: fonts.bold,
      size: PDFTemplates.FontSizes.heading3,
      color: PDFTemplates.Colors.textDark,
    });

    if (options.agentInfo.phone) {
      PDFTemplates.drawText(page, `Phone: ${options.agentInfo.phone}`, PDFTemplates.CoverPageCoordinates.agentInfo.x, agentY + 25, {
        font: fonts.regular,
        size: PDFTemplates.FontSizes.small,
        color: PDFTemplates.Colors.textDark,
      });
    }

    if (options.agentInfo.email) {
      PDFTemplates.drawText(page, `Email: ${options.agentInfo.email}`, PDFTemplates.CoverPageCoordinates.agentInfo.x, agentY + 10, {
        font: fonts.regular,
        size: PDFTemplates.FontSizes.small,
        color: PDFTemplates.Colors.textDark,
      });
    }

    if (options.agentInfo.license) {
      PDFTemplates.drawText(page, `License: ${options.agentInfo.license}`, PDFTemplates.CoverPageCoordinates.agentInfo.x, agentY - 5, {
        font: fonts.regular,
        size: PDFTemplates.FontSizes.tiny,
        color: PDFTemplates.Colors.textLight,
      });
    }
  }

  console.debug('✓ Added cover page');
}

async function addSummaryPage(
  pdfDoc: PDFDocument,
  fonts: { regular: any; bold: any },
  report: CMAReport
): Promise<void> {
  const page = pdfDoc.addPage([PDFTemplates.Layout.pageWidth, PDFTemplates.Layout.pageHeight]);

  PDFTemplates.drawBrandedHeader(page, 'Property Valuation Summary', fonts);

  let y = 680;

  // Estimated Value
  PDFTemplates.drawText(page, 'Estimated Market Value', PDFTemplates.Layout.marginLeft, y, {
    font: fonts.bold,
    size: PDFTemplates.FontSizes.heading2,
    color: PDFTemplates.Colors.primaryBlue,
  });

  y -= 30;
  const estValue = PDFTemplates.formatCurrency(report.summary.estimatedValue);
  PDFTemplates.drawText(page, estValue, PDFTemplates.Layout.marginLeft, y, {
    font: fonts.bold,
    size: 28,
    color: PDFTemplates.Colors.successGreen,
  });

  // Value Range
  y -= 25;
  const lowRange = PDFTemplates.formatCurrency(report.summary.lowRange);
  const highRange = PDFTemplates.formatCurrency(report.summary.highRange);
  PDFTemplates.drawText(page, `Range: ${lowRange} - ${highRange}`, PDFTemplates.Layout.marginLeft, y, {
    font: fonts.regular,
    size: PDFTemplates.FontSizes.body,
    color: PDFTemplates.Colors.textMedium,
  });

  // Confidence Score
  y -= 40;
  PDFTemplates.drawText(page, 'Confidence Score', PDFTemplates.Layout.marginLeft, y, {
    font: fonts.bold,
    size: PDFTemplates.FontSizes.heading3,
    color: PDFTemplates.Colors.textDark,
  });

  y -= 20;
  const confidence = report.summary.confidenceScore !== null
    ? `${Math.round(report.summary.confidenceScore * 100)}%`
    : 'N/A';
  PDFTemplates.drawText(page, confidence, PDFTemplates.Layout.marginLeft, y, {
    font: fonts.bold,
    size: PDFTemplates.FontSizes.heading2,
    color: PDFTemplates.Colors.primaryBlue,
  });

  // Confidence bar
  if (report.summary.confidenceScore !== null) {
    y -= 20;
    const barWidth = 300;
    const fillWidth = barWidth * report.summary.confidenceScore;

    PDFTemplates.drawRectangle(page, PDFTemplates.Layout.marginLeft, y, barWidth, 10, {
      color: PDFTemplates.Colors.bgMedium,
    });

    PDFTemplates.drawRectangle(page, PDFTemplates.Layout.marginLeft, y, fillWidth, 10, {
      color: PDFTemplates.Colors.successGreen,
    });
  }

  // Key Metrics Grid
  y -= 50;
  PDFTemplates.drawText(page, 'Key Metrics', PDFTemplates.Layout.marginLeft, y, {
    font: fonts.bold,
    size: PDFTemplates.FontSizes.heading3,
    color: PDFTemplates.Colors.textDark,
  });

  y -= 30;
  const metrics = [
    { label: 'Comparables Used', value: report.comps.length.toString() },
    { label: 'Avg Price/Sqft', value: PDFTemplates.formatCurrency(report.summary.avgPricePerSqft) },
    { label: 'Avg Days on Market', value: report.summary.avgDaysOnMarket?.toString() || 'N/A' },
    { label: 'Market Conditions', value: report.summary.marketConditions || 'N/A' },
  ];

  const gridCols = 2;
  const colWidth = 250;
  const rowHeight = 50;

  metrics.forEach((metric, index) => {
    const col = index % gridCols;
    const row = Math.floor(index / gridCols);
    const x = PDFTemplates.Layout.marginLeft + (col * colWidth);
    const metricY = y - (row * rowHeight);

    PDFTemplates.drawText(page, metric.label, x, metricY, {
      font: fonts.regular,
      size: PDFTemplates.FontSizes.small,
      color: PDFTemplates.Colors.textMedium,
    });

    PDFTemplates.drawText(page, metric.value, x, metricY - 18, {
      font: fonts.bold,
      size: PDFTemplates.FontSizes.heading3,
      color: PDFTemplates.Colors.textDark,
    });
  });

  console.debug('✓ Added summary page');
}

async function addComparablePropertiesPage(
  pdfDoc: PDFDocument,
  fonts: { regular: any; bold: any },
  report: CMAReport
): Promise<void> {
  const page = pdfDoc.addPage([PDFTemplates.Layout.pageWidth, PDFTemplates.Layout.pageHeight]);

  PDFTemplates.drawBrandedHeader(page, 'Comparable Properties', fonts);

  const columns: PDFTemplates.TableColumn[] = [
    { header: 'Address', width: 140, align: 'left' },
    { header: 'Price', width: 70, align: 'right' },
    { header: 'Beds', width: 35, align: 'center' },
    { header: 'Baths', width: 35, align: 'center' },
    { header: 'Sqft', width: 55, align: 'right' },
    { header: '$/Sqft', width: 60, align: 'right' },
    { header: 'DOM', width: 40, align: 'right' },
    { header: 'Match', width: 50, align: 'right' },
  ];

  const rows = report.comps.slice(0, 15).map(comp => ({
    'Address': comp.address?.substring(0, 22) || 'N/A',
    'Price': PDFTemplates.formatCurrency(comp.price),
    'Beds': comp.beds?.toString() || '-',
    'Baths': comp.baths?.toString() || '-',
    'Sqft': comp.sqft ? PDFTemplates.formatNumber(comp.sqft) : '-',
    '$/Sqft': PDFTemplates.formatCurrency(comp.pricePerSqft),
    'DOM': comp.daysOnMarket?.toString() || '-',
    'Match': comp.similarityScore ? `${Math.round(comp.similarityScore * 100)}%` : '-',
  }));

  PDFTemplates.drawTable(page, PDFTemplates.Layout.marginLeft, 670, columns, rows, fonts);

  console.debug('✓ Added comparables page');
}

async function addAppreciationPage(
  pdfDoc: PDFDocument,
  fonts: { regular: any; bold: any },
  report: CMAReport
): Promise<void> {
  const page = pdfDoc.addPage([PDFTemplates.Layout.pageWidth, PDFTemplates.Layout.pageHeight]);

  PDFTemplates.drawBrandedHeader(page, 'Appreciation Analysis', fonts);

  let y = 680;

  // 5-Year CAGR
  PDFTemplates.drawText(page, '5-Year Compound Annual Growth Rate (CAGR)', PDFTemplates.Layout.marginLeft, y, {
    font: fonts.bold,
    size: PDFTemplates.FontSizes.heading3,
    color: PDFTemplates.Colors.textDark,
  });

  y -= 25;
  const cagr = report.appreciation?.cagr5 !== null
    ? PDFTemplates.formatPercent(report.appreciation?.cagr5, 2)
    : 'N/A';
  PDFTemplates.drawText(page, cagr, PDFTemplates.Layout.marginLeft, y, {
    font: fonts.bold,
    size: 22,
    color: PDFTemplates.Colors.successGreen,
  });

  // Year-over-Year Trends
  if (report.appreciation?.yoyTrends && report.appreciation.yoyTrends.length > 0) {
    y -= 50;
    PDFTemplates.drawText(page, 'Year-over-Year Appreciation', PDFTemplates.Layout.marginLeft, y, {
      font: fonts.bold,
      size: PDFTemplates.FontSizes.heading3,
      color: PDFTemplates.Colors.textDark,
    });

    y -= 40;
    const chartData = report.appreciation.yoyTrends.map(trend => ({
      label: trend.year.toString(),
      value: trend.avgPrice || 0,
    }));

    PDFTemplates.drawLineChart(page, PDFTemplates.Layout.marginLeft, y - 200, 450, 180, chartData, fonts);
    y -= 250;
  }

  // Volatility Index
  if (report.appreciation?.volatilityIndex !== null) {
    y -= 30;
    PDFTemplates.drawText(page, 'Market Volatility Index', PDFTemplates.Layout.marginLeft, y, {
      font: fonts.bold,
      size: PDFTemplates.FontSizes.heading3,
      color: PDFTemplates.Colors.textDark,
    });

    y -= 20;
    const volatility = PDFTemplates.formatPercent(report.appreciation.volatilityIndex, 2);
    PDFTemplates.drawText(page, volatility, PDFTemplates.Layout.marginLeft, y, {
      font: fonts.regular,
      size: PDFTemplates.FontSizes.body,
      color: PDFTemplates.Colors.textDark,
    });
  }

  console.debug('✓ Added appreciation page');
}

async function addCashflowPage(
  pdfDoc: PDFDocument,
  fonts: { regular: any; bold: any },
  report: CMAReport
): Promise<void> {
  const page = pdfDoc.addPage([PDFTemplates.Layout.pageWidth, PDFTemplates.Layout.pageHeight]);

  PDFTemplates.drawBrandedHeader(page, 'Investment Cashflow Analysis', fonts);

  let y = 680;

  // Monthly Mortgage Payment
  if (report.cashflow?.mortgage !== null) {
    PDFTemplates.drawText(page, 'Monthly Mortgage Payment', PDFTemplates.Layout.marginLeft, y, {
      font: fonts.bold,
      size: PDFTemplates.FontSizes.heading3,
      color: PDFTemplates.Colors.textDark,
    });

    y -= 25;
    PDFTemplates.drawText(page, PDFTemplates.formatCurrency(report.cashflow.mortgage), PDFTemplates.Layout.marginLeft, y, {
      font: fonts.bold,
      size: 20,
      color: PDFTemplates.Colors.textDark,
    });
    y -= 40;
  }

  // Estimated Rental Income
  if (report.cashflow?.estimatedRent !== null) {
    PDFTemplates.drawText(page, 'Estimated Monthly Rent', PDFTemplates.Layout.marginLeft, y, {
      font: fonts.bold,
      size: PDFTemplates.FontSizes.heading3,
      color: PDFTemplates.Colors.textDark,
    });

    y -= 25;
    PDFTemplates.drawText(page, PDFTemplates.formatCurrency(report.cashflow.estimatedRent), PDFTemplates.Layout.marginLeft, y, {
      font: fonts.bold,
      size: 20,
      color: PDFTemplates.Colors.successGreen,
    });
    y -= 40;
  }

  // Net Operating Income
  if (report.cashflow?.netOperatingIncome !== null) {
    PDFTemplates.drawText(page, 'Net Operating Income (NOI)', PDFTemplates.Layout.marginLeft, y, {
      font: fonts.bold,
      size: PDFTemplates.FontSizes.heading3,
      color: PDFTemplates.Colors.textDark,
    });

    y -= 25;
    PDFTemplates.drawText(page, PDFTemplates.formatCurrency(report.cashflow.netOperatingIncome), PDFTemplates.Layout.marginLeft, y, {
      font: fonts.bold,
      size: 20,
      color: PDFTemplates.Colors.textDark,
    });
    y -= 50;
  }

  // Key Investment Metrics
  PDFTemplates.drawText(page, 'Key Investment Metrics', PDFTemplates.Layout.marginLeft, y, {
    font: fonts.bold,
    size: PDFTemplates.FontSizes.heading3,
    color: PDFTemplates.Colors.textDark,
  });

  y -= 30;
  const metrics = [
    {
      label: 'Cap Rate',
      value: report.cashflow?.capRate !== null ? PDFTemplates.formatPercent(report.cashflow.capRate) : 'N/A'
    },
    {
      label: 'Cash-on-Cash Return',
      value: report.cashflow?.cashOnCashReturn !== null ? PDFTemplates.formatPercent(report.cashflow.cashOnCashReturn) : 'N/A'
    },
    {
      label: 'Monthly Cashflow',
      value: report.cashflow?.monthlyCashflow !== null ? PDFTemplates.formatCurrency(report.cashflow.monthlyCashflow) : 'N/A'
    },
    {
      label: 'Annual Cashflow',
      value: report.cashflow?.monthlyCashflow !== null ? PDFTemplates.formatCurrency(report.cashflow.monthlyCashflow * 12) : 'N/A'
    },
  ];

  const gridCols = 2;
  const colWidth = 250;
  const rowHeight = 50;

  metrics.forEach((metric, index) => {
    const col = index % gridCols;
    const row = Math.floor(index / gridCols);
    const x = PDFTemplates.Layout.marginLeft + (col * colWidth);
    const metricY = y - (row * rowHeight);

    PDFTemplates.drawText(page, metric.label, x, metricY, {
      font: fonts.regular,
      size: PDFTemplates.FontSizes.small,
      color: PDFTemplates.Colors.textMedium,
    });

    PDFTemplates.drawText(page, metric.value, x, metricY - 18, {
      font: fonts.bold,
      size: PDFTemplates.FontSizes.heading3,
      color: PDFTemplates.Colors.textDark,
    });
  });

  console.debug('✓ Added cashflow page');
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFIED EXPORT FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export async function exportCMA(
  cma: SavedCMA,
  type: CMAReportType,
  options: PDFExportOptions = {}
): Promise<{ blob: Blob; filename: string }> {
  console.debug(`📄 Exporting CMA as ${type} report`);

  let blob: Blob;
  let filename: string;

  switch (type) {
    case 'full':
      blob = await generateFullCMAReportPDF(cma, options);
      filename = `CMA_Full_${generateFilenameBase(cma)}.pdf`;
      break;

    case 'mini':
      blob = await generateMiniCMAReportPDF(cma, options);
      filename = `CMA_Mini_${generateFilenameBase(cma)}.pdf`;
      break;

    case 'buyer':
      blob = await generateBuyerPacketPDF(cma, options);
      filename = `CMA_Buyer_${generateFilenameBase(cma)}.pdf`;
      break;

    case 'seller':
      blob = await generateSellerPacketPDF(cma, options);
      filename = `CMA_Seller_${generateFilenameBase(cma)}.pdf`;
      break;

    default:
      throw new Error(`Unknown CMA report type: ${type}`);
  }

  console.debug(`✅ CMA exported: ${filename}`);
  return { blob, filename };
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

function generateFilenameBase(cma: SavedCMA): string {
  const date = new Date(cma.generatedAt).toISOString().split('T')[0];
  const address = cma.subjectAddress
    ? cma.subjectAddress.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)
    : 'Property';

  return `${address}_${date}`;
}

export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  console.debug(`📥 PDF download initiated: ${filename}`);
}

export function generatePDFFilename(cma: SavedCMA, type: CMAReportType = 'full'): string {
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
  return `CMA_${typeLabel}_${generateFilenameBase(cma)}.pdf`;
}

export async function exportAndDownloadCMA(
  cma: SavedCMA,
  type: CMAReportType = 'full',
  options: PDFExportOptions = {}
): Promise<void> {
  try {
    const { blob, filename } = await exportCMA(cma, type, options);
    downloadPDF(blob, filename);
    console.debug('✅ CMA PDF downloaded:', filename);
  } catch (error) {
    console.error('Failed to export and download CMA:', error);
    throw error;
  }
}

export async function previewCMAPDF(
  cma: SavedCMA,
  type: CMAReportType = 'full',
  options: PDFExportOptions = {}
): Promise<void> {
  try {
    const { blob } = await exportCMA(cma, type, options);
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    console.debug('✅ CMA PDF preview opened');
  } catch (error) {
    console.error('Failed to preview CMA PDF:', error);
    throw error;
  }
}

export function estimatePDFSize(cma: SavedCMA, type: CMAReportType, options: PDFExportOptions = {}): string {
  let estimate = 50; // Base size in KB

  // Full report has more pages
  if (type === 'full') {
    estimate += cma.report.comps.length * 2;
    estimate += 30; // appreciation + cashflow
  }

  if (type === 'buyer' || type === 'seller') {
    estimate += cma.report.comps.length * 2;
    estimate += 20; // appreciation

    if (type === 'seller') {
      estimate += 15; // cashflow
    }
  }

  if (options.companyLogo) {
    estimate += 5;
  }

  if (estimate < 1024) {
    return `${Math.round(estimate)} KB`;
  }

  return `${(estimate / 1024).toFixed(1)} MB`;
}

export function isPDFExportSupported(): boolean {
  return typeof window !== 'undefined' && 'Blob' in window;
}

export function getPDFExportStatus(): {
  supported: boolean;
  message: string;
} {
  if (!isPDFExportSupported()) {
    return {
      supported: false,
      message: 'PDF export is not supported in this browser',
    };
  }

  return {
    supported: true,
    message: 'PDF export is ready',
  };
}

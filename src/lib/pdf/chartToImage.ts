// src/lib/pdf/chartToImage.ts
// Utility functions for converting React chart components to base64 PNG images for PDF export

/**
 * Convert a chart DOM element to a base64 PNG string
 * @param elementId - The DOM element ID of the chart to capture
 * @param width - Desired width of the image
 * @param height - Desired height of the image
 * @returns Promise<string> - Base64 encoded PNG image
 */
export async function captureChartAsBase64(
  elementId: string,
  width: number = 800,
  height: number = 400
): Promise<string | null> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      console.warn(`Chart element not found: ${elementId}`);
      return null;
    }

    // Use html2canvas to capture the element
    // Note: html2canvas should be imported dynamically to avoid SSR issues
    const html2canvas = await import('html2canvas');

    const canvas = await html2canvas.default(element, {
      width,
      height,
      backgroundColor: '#ffffff',
      scale: 2, // Higher quality
      logging: false,
    });

    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to capture chart as image:', error);
    return null;
  }
}

/**
 * Capture an SVG chart element as base64 PNG
 * @param svgElement - The SVG element to capture
 * @returns Promise<string | null>
 */
export async function captureSVGAsBase64(svgElement: SVGElement): Promise<string | null> {
  try {
    // Serialize SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Create image from SVG
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    return new Promise((resolve) => {
      img.onload = () => {
        canvas.width = img.width || 800;
        canvas.height = img.height || 400;
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch (error) {
    console.error('Failed to capture SVG as image:', error);
    return null;
  }
}

/**
 * Helper to wait for charts to render before capturing
 */
export async function waitForChartsToRender(delay: number = 500): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Batch capture multiple charts by their IDs
 * @param chartIds - Array of chart element IDs
 * @returns Promise<Record<string, string | null>> - Map of chart IDs to base64 images
 */
export async function captureMultipleCharts(
  chartIds: string[]
): Promise<Record<string, string | null>> {
  const results: Record<string, string | null> = {};

  // Wait for charts to render
  await waitForChartsToRender();

  // Capture each chart
  for (const id of chartIds) {
    results[id] = await captureChartAsBase64(id);
  }

  return results;
}

/**
 * Type definition for chart images to be passed to PDF generator
 */
export interface ChartImages {
  priceRangeChart?: string | null;
  appreciationChart?: string | null;
  forecastChart?: string | null;
  cashflowChart?: string | null;
  riskGauge?: string | null;
  comparisonScatter?: string | null;
  pricePerSqftTrend?: string | null;
  subdivisionMarketCharts?: string | null;
}

/**
 * Capture all standard CMA charts
 * @returns Promise<ChartImages>
 */
export async function captureAllCMACharts(): Promise<ChartImages> {
  const chartIds = [
    'price-range-chart',
    'appreciation-chart',
    'forecast-chart',
    'cashflow-chart',
    'risk-gauge',
    'comparison-scatter-chart',
    'price-per-sqft-chart',
    'subdivision-market-charts',
  ];

  await waitForChartsToRender(1000); // Wait longer for all charts

  const results: ChartImages = {};

  for (const id of chartIds) {
    const key = id.replace(/-/g, '') as keyof ChartImages;
    results[key] = await captureChartAsBase64(id);
  }

  return results;
}

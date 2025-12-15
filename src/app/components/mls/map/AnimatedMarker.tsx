"use client";

interface AnimatedMarkerProps {
  price: string;
  propertyType?: string;
  mlsSource?: string;
  isSelected?: boolean;
  isHovered?: boolean;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isLight?: boolean;
  showAsDot?: boolean; // New prop: if true, render as small dot instead of price bubble
}

function getMarkerStyles(
  propertyType?: string,
  mlsSource?: string,
  isSelected?: boolean,
  isHovered?: boolean,
  isLight?: boolean
) {
  const isRental = propertyType === "B";
  const isMultiFamily = propertyType === "C";
  const isLand = propertyType === "D";
  const isCRMLS = mlsSource === "CRMLS";

  if (isSelected) {
    return "bg-cyan-500 text-white border-2 border-white shadow-lg";
  }

  if (isRental) {
    return isCRMLS
      ? "bg-violet-600 text-white border border-violet-700 shadow-md"
      : "bg-purple-600 text-white border border-purple-700 shadow-md";
  }

  if (isMultiFamily) {
    return isCRMLS
      ? "bg-yellow-400 text-black border border-yellow-500 shadow-md"
      : "bg-yellow-600 text-black border border-yellow-700 shadow-md";
  }

  if (isLand) {
    return isCRMLS
      ? "bg-blue-500 text-white border border-blue-600 shadow-md"
      : "bg-blue-600 text-white border border-blue-700 shadow-md";
  }

  // Sale properties
  if (isLight) {
    return isCRMLS
      ? "bg-emerald-400 text-emerald-900 border border-emerald-500 shadow-md"
      : "bg-emerald-500 text-white border border-emerald-600 shadow-md";
  } else {
    return isCRMLS
      ? "bg-emerald-500 text-white border border-emerald-600 shadow-md"
      : "bg-emerald-600 text-white border border-emerald-700 shadow-md";
  }
}

export default function AnimatedMarker({
  price,
  propertyType,
  mlsSource,
  isSelected = false,
  isHovered = false,
  onClick,
  onMouseEnter,
  onMouseLeave,
  isLight = false,
  showAsDot = false
}: AnimatedMarkerProps) {
  const markerStyles = getMarkerStyles(
    propertyType,
    mlsSource,
    isSelected,
    isHovered,
    isLight
  );

  // Dot mode: render as small circular dot
  if (showAsDot) {
    return (
      <div
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`
          cursor-pointer rounded-full
          transition-all duration-200 active:scale-90
          ${markerStyles}
          ${isSelected ? 'w-4 h-4 scale-125 z-[100] ring-2 ring-white' : isHovered ? 'w-3.5 h-3.5 scale-110 z-40 shadow-lg' : 'w-3 h-3 scale-100 z-30'}
        `}
        style={{
          minWidth: isSelected ? '16px' : isHovered ? '14px' : '12px',
          minHeight: isSelected ? '16px' : isHovered ? '14px' : '12px',
        }}
      />
    );
  }

  // Price bubble mode: original behavior
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`
        cursor-pointer px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap
        transition-all duration-200 active:scale-90
        ${markerStyles}
        ${isSelected ? 'scale-110 z-[100] ring-2 ring-white ring-offset-1' : isHovered ? 'scale-105 z-40 shadow-xl' : 'scale-100 z-30'}
      `}
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        letterSpacing: "-0.02em",
        minHeight: "18px",
        lineHeight: "18px"
      }}
    >
      {price}
    </div>
  );
}

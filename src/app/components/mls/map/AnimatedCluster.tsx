"use client";

interface AnimatedClusterProps {
  count: number;
  size: number;
  onClick?: () => void;
  isLight?: boolean;
  avgPrice?: number | null;
}

function formatClusterPrice(price?: number | null): string {
  if (!price) return "";
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}m`;
  if (price >= 1_000) return `$${Math.round(price / 1_000)}k`;
  return `$${price}`;
}

export default function AnimatedCluster({
  count,
  size,
  onClick,
  isLight = false,
  avgPrice
}: AnimatedClusterProps) {
  const priceLabel = formatClusterPrice(avgPrice);

  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-full flex flex-col items-center justify-center font-bold transition-transform active:scale-95 ${
        isLight
          ? 'bg-blue-500 text-white border-2 border-blue-600 shadow-md hover:shadow-lg'
          : 'bg-gray-800 text-white border-2 border-gray-700 shadow-md hover:shadow-lg'
      }`}
      style={{
        width: size,
        height: size,
      }}
    >
      <span style={{ fontSize: Math.max(11, size * 0.28) }}>{count}</span>
      {priceLabel && size >= 50 && (
        <span style={{ fontSize: Math.max(8, size * 0.18) }} className="opacity-80">
          ~{priceLabel}
        </span>
      )}
    </div>
  );
}

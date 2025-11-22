"use client";

interface AnimatedClusterProps {
  count: number;
  size: number;
  onClick?: () => void;
  isLight?: boolean;
}

export default function AnimatedCluster({
  count,
  size,
  onClick,
  isLight = false
}: AnimatedClusterProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-full flex items-center justify-center font-bold transition-transform active:scale-95 ${
        isLight
          ? 'bg-blue-500 text-white border-2 border-blue-600 shadow-md hover:shadow-lg'
          : 'bg-gray-800 text-white border-2 border-gray-700 shadow-md hover:shadow-lg'
      }`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, size * 0.3),
      }}
    >
      {count}
    </div>
  );
}

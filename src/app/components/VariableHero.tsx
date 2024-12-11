import React from 'react';
import Image from 'next/image';

interface VariableHeroProps {
  backgroundImage: string;
  heroContext?: string; // Renamed from serviceName
  description?: string; // Make optional
  alignment?: 'left' | 'center' | 'right'; // Alignment prop
}

const VariableHero: React.FC<VariableHeroProps> = ({
  backgroundImage,
  heroContext,
  description,
  alignment = 'center',
}) => {
  // Determine alignment classes
  const alignmentClass = alignment === 'left' ? 'text-left items-start' : alignment === 'right' ? 'text-right items-end' : 'text-center items-center';

  return (
    <div
      className="relative bg-cover bg-center h-[60vh] flex justify-center text-white mx-auto max-w-7xl"
      style={{
        backgroundImage: `url(${backgroundImage}), url('/path-to-low-quality-placeholder.jpg')`,
      }}
      aria-label={`Background hero image for ${heroContext || 'hero section'}`}
    >
      {/* Fallback Image for optimization */}
      <Image
        src={backgroundImage}
        alt={`Hero image for ${heroContext || 'hero section'}`}
        fill
        priority
        className="absolute inset-0 object-cover rounded-lg"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black opacity-50 rounded-lg"></div>

      {/* Content */}
      <div className={`relative z-10 px-4 flex flex-col justify-center ${alignmentClass} h-full`}>
        <h1 className="text-5xl font-bold sm:text-6xl lg:text-7xl">
          {heroContext || 'Hero Section'}
        </h1>
        {description && (
          <p className="mt-4 pt-2 text-2xl sm:text-3xl lg:text-4xl">
            {description}
          </p>
        )}
      </div>
    </div>
  );
};

export default VariableHero;

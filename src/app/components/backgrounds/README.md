# Spatical Background Components

Reusable animated starfield background (Spatical) that can be used across multiple pages.

## Usage

### Basic Usage

```tsx
import SpaticalBackground from "@/app/components/backgrounds/SpaticalBackground";

export default function MyPage() {
  return (
    <SpaticalBackground>
      <div className="min-h-screen">
        {/* Your page content here */}
      </div>
    </SpaticalBackground>
  );
}
```

### With Options

```tsx
<SpaticalBackground
  className="min-h-screen"
  showGradient={true}
>
  <div className="py-12 px-4">
    {/* Your page content */}
  </div>
</SpaticalBackground>
```

## Props

- `children`: React node - Your page content
- `showGradient`: boolean (default: `true`) - Shows subtle purple/pink gradient overlay
- `className`: string - Additional CSS classes for the wrapper

## Pages Currently Using This Component

- `/chat` - Main chat interface
- `/dashboard` - User dashboard
- `/admin` - Admin dashboard

## Pages That Should NOT Use This Component

- `/map` - Has its own map background
- `/neighborhoods` - Has map visualization

## Technical Details

The component uses:
- Three.js for 3D starfield rendering
- Dynamic import with SSR disabled for performance
- Gradient overlay for visual depth
- Absolute positioning for proper layering

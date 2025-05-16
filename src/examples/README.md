# Examples Directory

This directory contains example components that can be used throughout the application.

## ImagesSlider

The `ImagesSlider` component provides a dynamic image slider with customizable sizing for individual images.

### Usage

```tsx
import { ImagesSlider, ImageConfig } from '@/components/ui/images-slider';

// String format (default behavior)
const simpleImages = [
  '/images/1.jpg',
  '/images/2.jpg',
];

// Mixed format with custom sizing
const dynamicImages: (string | ImageConfig)[] = [
  '/images/1.jpg', // Default full size
  {
    src: '/images/2.jpg',
    width: '400px',
    height: '300px',
    objectFit: 'contain',
  },
  {
    src: '/images/3.jpg',
    width: '80%',
    height: '60%',
    objectFit: 'cover',
    objectPosition: 'top center',
  },
];

<ImagesSlider images={dynamicImages} autoplay={true}>
  <div>Your overlay content</div>
</ImagesSlider>
```

### ImageConfig Properties

- `src`: string - The image source URL (required)
- `width`: string - CSS width value (default: '100%')
- `height`: string - CSS height value (default: '100%')
- `objectFit`: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down' (default: 'cover')
- `objectPosition`: string - CSS object-position value (default: 'center')

### Example Component

```tsx
import { ImagesSliderExample } from "@/examples/ImagesSliderExample";

// Use it in your component
<ImagesSliderExample />
```

## AuroraBackground

The `AuroraBackground` component provides a beautiful animated gradient background effect.

### Usage

```tsx
import { AuroraBackground } from "@/components/ui/aurora-background";

export default function YourPage() {
  return (
    <AuroraBackground intensity="low">
      {/* Your content here */}
    </AuroraBackground>
  );
}
```

### Properties

- `intensity`: 'low' | 'medium' | 'high' - Controls animation performance vs quality
  - 'low': Best performance, less visual impact
  - 'medium': Balanced choice
  - 'high': Most visually striking but more resource intensive

- `showRadialGradient`: boolean - Whether to show the radial gradient effect (default: true)

### Performance Tips

If your page seems to lock up or perform slowly with the Aurora background:

1. Use the `low` intensity setting (default)
2. Consider only using it on specific pages rather than site-wide
3. For critical performance sections, disable the background or use a static gradient

### Example Component

For a quick demonstration, you can import the example component:

```tsx
import AuroraBackgroundExample from "@/examples/AuroraBackgroundExample";

// Then use it in your component
<AuroraBackgroundExample />
```
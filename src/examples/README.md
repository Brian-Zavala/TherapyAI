# Examples Directory

This directory contains example components that can be used throughout the application.

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
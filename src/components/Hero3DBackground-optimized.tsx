// src/components/Hero3DBackground-optimized.tsx
import { useRef, useMemo, memo, useEffect, Suspense, useState, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

// Define the props if you want to customize color, count etc. from outside
interface Hero3DBackgroundProps {
  pointColor?: string;
  pointSize?: number;
  isVisible?: boolean; // Add visibility prop
  onReady?: () => void; // Callback when component is ready
  initialPointCount?: number; // Initial reduced density
  targetPointCount?: number; // Target full density
}

// Pre-generate sphere positions once at module level
let SPHERE_POSITIONS: Float32Array | null = null;

// Add cleanup function to force garbage collection
export function cleanupSpherePositions() {
  if (SPHERE_POSITIONS) {
    SPHERE_POSITIONS = null;
  }
}

const generateSpherePositions = (pointCount = 3000) => { // Reduced default from 5000 to 3000
  // If we already have the positions and they're the right size, return them
  if (SPHERE_POSITIONS && SPHERE_POSITIONS.length === pointCount * 3) {
    return SPHERE_POSITIONS;
  }
  
  // Otherwise generate new positions
  const positions = new Float32Array(pointCount * 3);
  for (let i = 0; i < positions.length; i += 3) {
    const r = 1.2 * Math.cbrt(Math.random());
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    
    positions[i] = r * Math.sin(phi) * Math.cos(theta);
    positions[i+1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i+2] = r * Math.cos(phi);
  }
  
  // Store the positions if this is the full set (3000 points)
  if (pointCount === 3000) {
    SPHERE_POSITIONS = positions;
  }
  
  return positions;
};

const Stars = memo(function Stars(props: Hero3DBackgroundProps) {
  const ref = useRef<THREE.Points>(null!);
  const initialized = useRef(false);
  const pointCount = useRef(props.initialPointCount || 500); // Much lower default
  
  // Start with reduced number of points, then increase to full density
  const sphere = useMemo(() => 
    generateSpherePositions(pointCount.current), 
  []);
  
  // Clean up properly on unmount - fixes WebGL context errors
  useEffect(() => {
    const currentRef = ref.current;
    
    return () => {
      if (currentRef) {
        // Properly dispose of Three.js resources
        try {
          const geometry = currentRef.geometry;
          if (geometry) {
            // Force immediate garbage collection
            geometry.dispose();
            (geometry as any).__webglBuffers = null;
            (geometry as any).__webglVertexArrayObject = null;
          }
          
          const material = currentRef.material;
          if (material && Array.isArray(material)) {
            material.forEach(m => {
              m.dispose();
              (m as any).program = null;
              (m as any).__webglShader = null;
            });
          } else if (material) {
            material.dispose();
            (material as any).program = null;
            (material as any).__webglShader = null;
          }
        } catch (e) {
          console.warn('Failed to dispose of Three.js resources:', e);
        }
      }
    };
  }, []);
  
  // Gradually increase point count for smoother loading
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (props.initialPointCount && props.targetPointCount && 
        pointCount.current < props.targetPointCount) {
      
      // Transition to full density after a delay
      timer = setTimeout(() => {
        pointCount.current = props.targetPointCount || 5000;
        timer = null;
        // Force re-render will happen due to animation frame
      }, 500);
    }
    
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [props.initialPointCount, props.targetPointCount]);

  // Notify when stars are ready
  useEffect(() => {
    if (!initialized.current && ref.current) {
      initialized.current = true;
      // Delay reporting ready to allow for smooth animation
      setTimeout(() => {
        props.onReady?.();
      }, 200);
    }
  }, [props]);

  // Rotate the points over time - slower for better performance
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 30; // Halved speed
      ref.current.rotation.y -= delta / 40; // Halved speed
    }
  });

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={sphere} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color={props.pointColor || "#6366f1"} // Softer indigo
          size={props.pointSize || 0.004}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
});

// Preload canvas assets
const preloadCanvas = () => {
  if (typeof window !== 'undefined') {
    try {
      // Create a dummy WebGL context to initialize early
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        // Perform basic GL operations to warm up
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      
      // Pre-generate positions
      generateSpherePositions();
    } catch (error) {
      console.warn('WebGL preload failed:', error);
    }
  }
};

const Hero3DBackground = memo(function Hero3DBackground(props: Hero3DBackgroundProps) {
  const canvasReady = useRef(false);
  const componentReady = useRef(false);
  const mountedRef = useRef(true); // Track component mount state
  const [canvasError, setCanvasError] = useState(false);
  
  // Track mount status to prevent calling callbacks after unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  
  // Preload canvas on mount but do it safely
  useEffect(() => {
    try {
      preloadCanvas();
    } catch (e) {
      console.warn('Failed to preload canvas:', e);
    }
  }, []);

  const handleCanvasReady = () => {
    if (!canvasReady.current && mountedRef.current) {
      canvasReady.current = true;
      checkReady();
    }
  };

  const handleStarsReady = () => {
    if (!componentReady.current && mountedRef.current) {
      componentReady.current = true;
      checkReady();
    }
  };

  const checkReady = () => {
    if (canvasReady.current && componentReady.current && mountedRef.current) {
      props.onReady?.();
    }
  };

  // If not visible, don't render the canvas at all
  if (props.isVisible === false) {
    return null;
  }
  
  // Handle WebGL context loss with a forceUpdate pattern
  const handleContextLost = useCallback(() => {
    console.warn('WebGL context lost - disabling 3D background');
    setCanvasError(true);
  }, []);
  
  // Setup global context loss handler
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('webglcontextlost', handleContextLost, false);
      
      return () => {
        window.removeEventListener('webglcontextlost', handleContextLost, false);
      };
    }
  }, [handleContextLost]);
  
  // If there was a WebGL context error, render nothing
  if (canvasError) {
    return null;
  }
  
  return (
    // Position canvas absolutely to fill the container
    <div className="absolute inset-0 w-full h-full z-1 opacity-50 pointer-events-none">
      <Suspense fallback={null}>
        <Canvas 
          camera={{ position: [0, 0, 1] }}
          dpr={[1, 1]} // Fixed DPR for consistency  
          performance={{ min: 0.3 }} // Lower threshold
          onCreated={handleCanvasReady}
          frameloop="demand" // Only render when needed
          gl={{ 
            powerPreference: "high-performance", 
            antialias: false,
            preserveDrawingBuffer: false,
            alpha: true,
            stencil: false,
            depth: false, // Disable depth buffer for simple points
            precision: "lowp" // Use low precision
          }}
          style={{ touchAction: 'none' }}
          onError={(error) => {
            console.error('Canvas error:', error);
            setCanvasError(true);
          }}
        >
          <Stars {...props} onReady={handleStarsReady} />
        </Canvas>
      </Suspense>
    </div>
  );
});

// Create a component with static method
interface Hero3DBackgroundComponent extends React.FC<Hero3DBackgroundProps> {
  preload: () => void;
}

// Attach the static method
(Hero3DBackground as any).preload = preloadCanvas;

export default Hero3DBackground as Hero3DBackgroundComponent;
export { cleanupSpherePositions };
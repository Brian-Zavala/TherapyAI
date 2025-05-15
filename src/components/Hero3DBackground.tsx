// src/components/Hero3DBackground.tsx
import { useRef, useMemo, memo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Points, PointMaterial } from "@react-three/drei";
import * as random from "maath/random/dist/maath-random.esm";
import * as THREE from "three";

// Define the props if you want to customize color, count etc. from outside
interface Hero3DBackgroundProps {
  pointColor?: string;
  pointSize?: number;
  isVisible?: boolean; // Add visibility prop
}

const Stars = memo(function Stars(props: Hero3DBackgroundProps) {
  const ref = useRef<THREE.Points>(null!);
  
  // Generate spherical points - moved to useMemo to avoid recreating on each render
  const sphere = useMemo(() => {
    // Create points array
    const positions = new Float32Array(5000 * 3); // 5000 points * 3 coordinates (x,y,z)
    
    // Fill with valid data to avoid NaN values
    for (let i = 0; i < positions.length; i += 3) {
      // Generate random position in a sphere
      const r = 1.2 * Math.cbrt(Math.random()); // Cube root for uniform distribution
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i] = r * Math.sin(phi) * Math.cos(theta);
      positions[i+1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i+2] = r * Math.cos(phi);
    }
    
    return positions;
  }, []); // Empty dependencies so it's created only once

  // Rotate the points over time
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta / 15;
      ref.current.rotation.y -= delta / 20;
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

const Hero3DBackground = memo(function Hero3DBackground(props: Hero3DBackgroundProps) {
  // If not visible, don't render the canvas at all
  if (props.isVisible === false) {
    return null;
  }
  
  return (
    // Position canvas absolutely to fill the container
    <div className="absolute inset-0 w-full h-full z-1 opacity-50 pointer-events-none">
      <Canvas camera={{ position: [0, 0, 1] }}>
        {/* <ambientLight intensity={0.5} />  Optional: Add lights if needed */}
        <Stars {...props} />
      </Canvas>
    </div>
  );
});

export default Hero3DBackground;
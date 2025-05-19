// src/components/Hero3DBackground.tsx
import { useRef, useMemo, memo, useEffect, useState } from "react";
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
  
  // Generate spherical points with separate groups for different sizes
  const { smallPositions, largePositions } = useMemo(() => {
    const numSmall = 240; // 20% of 1200
    const numLarge = 960; // 80% of 1200
    
    const smallPositions = new Float32Array(numSmall * 3);
    const largePositions = new Float32Array(numLarge * 3);
    
    // Generate small points
    for (let i = 0; i < smallPositions.length; i += 3) {
      const r = 1.2 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      smallPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      smallPositions[i+1] = r * Math.sin(phi) * Math.sin(theta);
      smallPositions[i+2] = r * Math.cos(phi);
    }
    
    // Generate large points
    for (let i = 0; i < largePositions.length; i += 3) {
      const r = 1.2 * Math.cbrt(Math.random());
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      largePositions[i] = r * Math.sin(phi) * Math.cos(theta);
      largePositions[i+1] = r * Math.sin(phi) * Math.sin(theta);
      largePositions[i+2] = r * Math.cos(phi);
    }
    
    return { smallPositions, largePositions };
  }, []); // Empty dependencies so it's created only once

  // Rotate the points over time - throttled for performance
  const groupRef = useRef<THREE.Group>(null!);
  
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.x -= delta / 25;
      groupRef.current.rotation.y -= delta / 30;
    }
  });

  return (
    <group ref={groupRef} rotation={[0, 0, Math.PI / 4]}>
      {/* Small points */}
      <Points positions={smallPositions} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color={props.pointColor || "#6366f1"} // Softer indigo
          size={0.002}
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
      
      {/* Large points */}
      <Points positions={largePositions} stride={3} frustumCulled={false} {...props}>
        <PointMaterial
          transparent
          color={props.pointColor || "#6366f1"} // Softer indigo
          size={0.006} // Reduced from 0.008
          sizeAttenuation={true}
          depthWrite={false}
        />
      </Points>
    </group>
  );
});

const Hero3DBackground = memo(function Hero3DBackground(props: Hero3DBackgroundProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // If not visible or not mounted, don't render the canvas at all
  if (!isMounted || props.isVisible === false) {
    return null;
  }
  
  return (
    // Position canvas absolutely to fill the container
    <div className="absolute inset-0 w-full h-full z-1 pointer-events-none">
      <Canvas 
        camera={{ position: [0, 0, 1] }}
        gl={{ 
          antialias: false,
          alpha: true,  // Changed to true to allow transparency
          stencil: false,
          depth: false,
          powerPreference: "low-power"
        }}
        dpr={[1, 1.5]}
      >
        {/* <ambientLight intensity={0.5} />  Optional: Add lights if needed */}
        <Stars {...props} />
      </Canvas>
    </div>
  );
});

export default Hero3DBackground;
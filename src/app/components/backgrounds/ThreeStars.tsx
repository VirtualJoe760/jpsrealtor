"use client";

import { useEffect, useRef } from "react";

// Spherical distribution generator (matching maath.random.inSphere)
function generateSphere(count: number, radius: number): Float32Array {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random()) * radius; // Cubic root for even distribution

    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  return positions;
}

export default function ThreeStars() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();
    window.addEventListener("resize", setCanvasSize);

    // Generate 5000 stars in spherical distribution
    const sphere = generateSphere(5000, 1.2);

    // Group rotation: [0, 0, Math.PI / 4] = 45° Z-axis tilt
    const groupRotationZ = Math.PI / 4;

    let rotationX = 0;
    let rotationY = 0;
    let lastTime = performance.now();

    // Animation loop with delta time
    const animate = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1); // Cap delta to prevent jumps
      lastTime = currentTime;

      // Clear with pure black background for space effect
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update rotation - Smooth and fluid
      rotationX += delta * 0.08;
      rotationY += delta * 0.12;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const scale = Math.min(canvas.width, canvas.height) * 0.4;

      // Pre-calculate rotation matrices for better performance
      const cosZ = Math.cos(groupRotationZ);
      const sinZ = Math.sin(groupRotationZ);
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);
      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);

      // Render each star
      for (let i = 0; i < 5000; i++) {
        let x = sphere[i * 3] ?? 0;
        let y = sphere[i * 3 + 1] ?? 0;
        let z = sphere[i * 3 + 2] ?? 0;

        // Apply group rotation (45° Z-axis tilt)
        const tempX = x * cosZ - y * sinZ;
        const tempY = x * sinZ + y * cosZ;
        x = tempX;
        y = tempY;

        // Apply animation rotations
        // Rotation Y
        const rotatedX = x * cosY + (z ?? 0) * sinY;
        const rotatedZ = -x * sinY + (z ?? 0) * cosY;

        // Rotation X
        const rotatedY = y * cosX - rotatedZ * sinX;
        const finalZ = y * sinX + rotatedZ * cosX;

        // 3D to 2D projection (camera at [0, 0, 1])
        const distance = 1 - finalZ;
        if (distance > 0.1) {
          const perspective = 1 / distance;
          const projectedX = rotatedX * scale * perspective + centerX;
          const projectedY = rotatedY * scale * perspective + centerY;

          // Size based on distance
          const size = 0.002 * scale * perspective;
          const opacity = Math.min(1, perspective * 0.4);

          // Draw star with white color for space effect
          if (size > 0.3 && opacity > 0.05 &&
              projectedX >= 0 && projectedX <= canvas.width &&
              projectedY >= 0 && projectedY <= canvas.height) {

            // Vary star brightness for depth
            const brightness = 200 + Math.floor(55 * opacity);
            ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${opacity})`;
            ctx.beginPath();
            ctx.arc(projectedX, projectedY, size, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", setCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ background: "#000000" }}
      />
    </div>
  );
}

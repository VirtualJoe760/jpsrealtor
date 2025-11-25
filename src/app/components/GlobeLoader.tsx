"use client";

import { useEffect, useRef } from "react";
import { useThemeClasses } from "@/app/contexts/ThemeContext";

interface GlobeLoaderProps {
  text?: string;
  subtext?: string;
}

export default function GlobeLoader({ text = "Loading...", subtext = "Please wait" }: GlobeLoaderProps) {
  const { currentTheme } = useThemeClasses();
  const isLight = currentTheme === "lightgradient";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;

    let rotation = 0;
    let lastTime = performance.now();

    const points: { x: number; y: number; z: number }[] = [];
    const latLines = 18;
    const lonLines = 36;

    for (let lat = 0; lat < latLines; lat++) {
      for (let lon = 0; lon < lonLines; lon++) {
        const phi = (lat / latLines) * Math.PI;
        const theta = (lon / lonLines) * Math.PI * 2;
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.cos(phi);
        const z = Math.sin(phi) * Math.sin(theta);
        points.push({ x, y, z });
      }
    }

    const animate = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      ctx.fillStyle = isLight ? "#ffffff" : "#000000";
      ctx.fillRect(0, 0, size, size);

      rotation += delta * 1.5;

      const cosY = Math.cos(rotation);
      const sinY = Math.sin(rotation);

      const projectedPoints = points.map(point => {
        const rotatedX = point.x * cosY + point.z * sinY;
        const rotatedZ = -point.x * sinY + point.z * cosY;
        const scale = radius / (2 - rotatedZ * 0.5);
        const x2d = rotatedX * scale + centerX;
        const y2d = point.y * scale + centerY;
        return { x: x2d, y: y2d, z: rotatedZ };
      }).filter(p => p.z > -0.8);

      projectedPoints.forEach(point => {
        const brightness = (point.z + 1) / 2;
        const alpha = brightness * 0.8 + 0.2;
        const r = isLight ? 59 : 16;
        const g = isLight ? 130 : 185;
        const b = isLight ? 246 : 129;
        ctx.fillStyle = "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
        const dotSize = 2 + brightness * 1.5;
        ctx.beginPath();
        ctx.arc(point.x, point.y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.strokeStyle = isLight ? "rgba(59, 130, 246, 0.3)" : "rgba(16, 185, 129, 0.3)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isLight]);

  const bgClass = isLight ? 'bg-white' : 'bg-black';
  const textClass = isLight ? 'text-gray-900' : 'text-white';
  const subtextClass = isLight ? 'text-gray-600' : 'text-gray-400';

  return (
    <div className={"fixed inset-0 z-[9999] flex items-center justify-center " + bgClass}>
      <div className="flex flex-col items-center gap-6">
        <canvas ref={canvasRef} width={200} height={200} className="drop-shadow-lg" />
        <div className="text-center">
          <p className={"text-lg font-semibold " + textClass}>{text}</p>
          <p className={"text-sm " + subtextClass}>{subtext}</p>
        </div>
      </div>
    </div>
  );
}

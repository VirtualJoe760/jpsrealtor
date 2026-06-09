"use client";

// Animated spiral galaxy backdrop (raw three.js — NOT react-three-fiber, which
// can't mount in this Next 16 / React 19 stack). A procedural particle galaxy
// with a Coachella-sunset palette (warm gold core → magenta/purple arms), slowly
// rotating. Renders into an absolutely-positioned canvas; pauses when offscreen.

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function GalaxyBackground({
  insideColor = "#ffcf7a",   // warm desert gold core
  outsideColor = "#9b3fd1",  // sunset magenta/purple arms
}: {
  insideColor?: string;
  outsideColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;
    let raf = 0;
    let renderer: THREE.WebGLRenderer | null = null;
    let cleanup = () => {};

    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 100);
      camera.position.set(0, 2.9, 3.5);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      const resize = () => {
        const w = container.clientWidth || 1;
        const h = container.clientHeight || 1;
        renderer!.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      const canvas = renderer.domElement;
      Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", display: "block" });
      container.appendChild(canvas);

      // ── Generate the galaxy ──────────────────────────────────
      const small = (window.innerWidth || 1024) < 768;
      const COUNT = small ? 14000 : 30000;
      const RADIUS = 5;
      const BRANCHES = 4;
      const SPIN = 1.05;
      const RANDOMNESS = 0.34;
      const POWER = 3.2;

      const positions = new Float32Array(COUNT * 3);
      const colors = new Float32Array(COUNT * 3);
      const cIn = new THREE.Color(insideColor);
      const cOut = new THREE.Color(outsideColor);

      for (let i = 0; i < COUNT; i++) {
        const i3 = i * 3;
        const r = Math.pow(Math.random(), 1.5) * RADIUS;
        const branchAngle = ((i % BRANCHES) / BRANCHES) * Math.PI * 2;
        const spinAngle = r * SPIN;
        const rx = Math.pow(Math.random(), POWER) * (Math.random() < 0.5 ? 1 : -1) * RANDOMNESS * r;
        const ry = Math.pow(Math.random(), POWER) * (Math.random() < 0.5 ? 1 : -1) * RANDOMNESS * r * 0.45;
        const rz = Math.pow(Math.random(), POWER) * (Math.random() < 0.5 ? 1 : -1) * RANDOMNESS * r;
        positions[i3] = Math.cos(branchAngle + spinAngle) * r + rx;
        positions[i3 + 1] = ry;
        positions[i3 + 2] = Math.sin(branchAngle + spinAngle) * r + rz;
        const col = cIn.clone().lerp(cOut, Math.min(1, r / RADIUS));
        colors[i3] = col.r;
        colors[i3 + 1] = col.g;
        colors[i3 + 2] = col.b;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const material = new THREE.PointsMaterial({
        size: 0.022,
        sizeAttenuation: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
        transparent: true,
      });
      const points = new THREE.Points(geometry, material);
      points.rotation.x = 0.06;
      // Sit the galaxy toward the lower-left so it glows around the portrait,
      // leaving the right (text) column as clean dark space.
      points.position.x = small ? 0 : -1.3;
      points.position.y = -0.15;
      scene.add(points);

      // ── Animate ──────────────────────────────────────────────
      window.addEventListener("resize", resize);
      let visible = true;
      const io = new IntersectionObserver((e) => { visible = e[0]?.isIntersecting ?? true; }, { threshold: 0 });
      io.observe(container);

      const clock = new THREE.Clock();
      const animate = () => {
        raf = requestAnimationFrame(animate);
        if (!visible) return;
        points.rotation.y = clock.getElapsedTime() * 0.055;
        renderer!.render(scene, camera);
      };
      animate();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        io.disconnect();
        geometry.dispose();
        material.dispose();
        renderer!.dispose();
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      };
    } catch {
      // WebGL unavailable — leave empty; the section's CSS fallback shows.
      cleanup = () => cancelAnimationFrame(raf);
    }

    return () => cleanup();
  }, [insideColor, outsideColor]);

  return <div ref={ref} className="absolute inset-0 overflow-hidden" aria-hidden />;
}

"use client";

// Scroll-scrubbed particle morph (raw three.js — NOT react-three-fiber, which
// can't mount in this Next16/React19 stack). A pinned section: as the user
// scrolls, thousands of nodes fly between reference photos (sampled to colored
// points), morphing one landmark into the next. Scroll position = the playhead.
// Data-driven by `images` (same-origin paths, so pixels can be sampled).
// Tuned for all devices: fewer particles + bigger points on mobile, capped DPR,
// rect-based scroll progress (works with the app's <body> scroll).

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const SAMPLE = 130; // sampling grid (SAMPLE×SAMPLE pixels per image)

function loadImageData(src: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = SAMPLE;
      c.height = SAMPLE;
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return reject(new Error("no ctx"));
      ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
      resolve(ctx.getImageData(0, 0, SAMPLE, SAMPLE));
    };
    img.onerror = reject;
    img.src = src;
  });
}

// Distribute N particles over an image, denser in brighter/detailed areas.
// Returns normalized positions (u,v ∈ [-0.5,0.5]) + per-particle colors.
function sampleTargets(d: ImageData, N: number) {
  const { data, width: W, height: H } = d;
  const px = W * H;
  const cum = new Float32Array(px);
  let total = 0;
  for (let i = 0; i < px; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    total += 0.2 + lum; // base weight so darker areas still get some points
    cum[i] = total;
  }
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  for (let n = 0; n < N; n++) {
    const t = Math.random() * total;
    let lo = 0, hi = px - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < t) lo = mid + 1;
      else hi = mid;
    }
    const idx = lo;
    const x = idx % W, y = (idx / W) | 0;
    pos[n * 3] = (x + Math.random()) / W - 0.5;
    pos[n * 3 + 1] = 0.5 - (y + Math.random()) / H;
    pos[n * 3 + 2] = 0;
    // lift + boost so the photo pops as glowing points on the dark backdrop
    col[n * 3] = Math.min(1, (data[idx * 4] / 255) * 1.35 + 0.06);
    col[n * 3 + 1] = Math.min(1, (data[idx * 4 + 1] / 255) * 1.35 + 0.06);
    col[n * 3 + 2] = Math.min(1, (data[idx * 4 + 2] / 255) * 1.35 + 0.06);
  }
  return { pos, col };
}

export default function ParticleMorph({
  images,
  labels = [],
  heading,
}: {
  images: string[];
  labels?: string[];
  heading?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const progRef = useRef(0);
  const activeRef = useRef(0);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);

  // Scroll → target progress (0..1) + manual pin. We can't use position:sticky
  // because the app's <body>/[data-main-content] both have overflow:auto, which
  // breaks sticky. So we pin the canvas with position:fixed while the section
  // spans the viewport, parking it absolutely before/after.
  useEffect(() => {
    const onScroll = () => {
      const el = wrapRef.current;
      const pin = pinRef.current;
      if (!el) return;
      const vh = window.innerHeight;
      const r = el.getBoundingClientRect();
      progRef.current = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - vh)));
      if (pin) {
        if (r.top <= 0 && r.bottom >= vh) {
          // pinned: fixed to the viewport, aligned to the content column
          pin.style.position = "fixed";
          pin.style.top = "0px";
          pin.style.bottom = "auto";
          pin.style.left = `${r.left}px`;
          pin.style.width = `${r.width}px`;
        } else if (r.top > 0) {
          // before: parked at the top of the wrapper
          pin.style.position = "absolute";
          pin.style.top = "0px";
          pin.style.bottom = "auto";
          pin.style.left = "0px";
          pin.style.width = "100%";
        } else {
          // after: parked at the bottom of the wrapper
          pin.style.position = "absolute";
          pin.style.top = "auto";
          pin.style.bottom = "0px";
          pin.style.left = "0px";
          pin.style.width = "100%";
        }
      }
    };
    onScroll();
    document.body.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.body.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // three.js setup + morph loop.
  useEffect(() => {
    const container = canvasRef.current;
    if (!container) return;
    let raf = 0;
    let mounted = true;
    let cleanup = () => {};

    (async () => {
      try {
        const small = window.innerWidth < 768;
        const N = small ? 7000 : 14000;
        const targets: { pos: Float32Array; col: Float32Array }[] = [];
        for (const src of images) {
          const d = await loadImageData(src);
          if (!mounted) return;
          targets.push(sampleTargets(d, N));
        }
        if (!mounted || targets.length === 0) return;

        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 2;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

        let fitHalf = 0.85;
        const resize = () => {
          const w = container.clientWidth || 1;
          const h = container.clientHeight || 1;
          renderer.setSize(w, h, false);
          const a = w / h;
          camera.left = -a; camera.right = a; camera.top = 1; camera.bottom = -1;
          camera.updateProjectionMatrix();
          fitHalf = Math.min(a, 1) * 0.82;
        };
        resize();
        const cv = renderer.domElement;
        Object.assign(cv.style, { position: "absolute", inset: "0", width: "100%", height: "100%" });
        container.appendChild(cv);

        // init from first image
        const pos = new Float32Array(N * 3);
        const col = new Float32Array(N * 3);
        for (let i = 0; i < N * 3; i += 3) {
          pos[i] = targets[0].pos[i] * 2 * fitHalf;
          pos[i + 1] = targets[0].pos[i + 1] * 2 * fitHalf;
        }
        col.set(targets[0].col);

        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        const mat = new THREE.PointsMaterial({
          size: small ? 3.4 : 2.8,
          sizeAttenuation: false,
          vertexColors: true,
          transparent: true,
          opacity: 0.92,
          depthWrite: false,
        });
        const pts = new THREE.Points(geo, mat);
        scene.add(pts);
        window.addEventListener("resize", resize);
        setReady(true);

        const posArr = geo.attributes.position.array as Float32Array;
        const colArr = geo.attributes.color.array as Float32Array;
        const clock = new THREE.Clock();
        let cur = 0;
        const nT = targets.length;

        const animate = () => {
          raf = requestAnimationFrame(animate);
          const t = clock.getElapsedTime();
          cur += (progRef.current - cur) * 0.08; // smooth scrub
          const seg = cur * (nT - 1);
          let a = Math.floor(seg);
          if (a > nT - 2) a = nT - 2;
          if (a < 0) a = 0;
          const f = seg - a;
          const A = targets[a], B = targets[a + 1];
          const pA = A.pos, pB = B.pos, cA = A.col, cB = B.col;
          const s = 2 * fitHalf;
          for (let i = 0; i < N; i++) {
            const i3 = i * 3;
            const ux = pA[i3] + (pB[i3] - pA[i3]) * f;
            const uy = pA[i3 + 1] + (pB[i3 + 1] - pA[i3 + 1]) * f;
            posArr[i3] = ux * s + 0.006 * Math.sin(t * 0.8 + i * 0.7);
            posArr[i3 + 1] = uy * s + 0.006 * Math.cos(t * 0.7 + i * 1.3);
            colArr[i3] = cA[i3] + (cB[i3] - cA[i3]) * f;
            colArr[i3 + 1] = cA[i3 + 1] + (cB[i3 + 1] - cA[i3 + 1]) * f;
            colArr[i3 + 2] = cA[i3 + 2] + (cB[i3 + 2] - cA[i3 + 2]) * f;
          }
          geo.attributes.position.needsUpdate = true;
          geo.attributes.color.needsUpdate = true;
          renderer.render(scene, camera);

          const idx = Math.round(cur * (nT - 1));
          if (idx !== activeRef.current) {
            activeRef.current = idx;
            setActive(idx);
          }
        };
        animate();

        cleanup = () => {
          cancelAnimationFrame(raf);
          window.removeEventListener("resize", resize);
          geo.dispose();
          mat.dispose();
          renderer.dispose();
          if (cv.parentNode) cv.parentNode.removeChild(cv);
        };
      } catch {
        cleanup = () => cancelAnimationFrame(raf);
      }
    })();

    return () => {
      mounted = false;
      cleanup();
    };
  }, [images]);

  return (
    <div ref={wrapRef} style={{ height: `${Math.max(2, images.length) * 90}vh` }} className="relative">
      <div ref={pinRef} className="absolute top-0 left-0 w-full h-[100svh] overflow-hidden bg-[#05060c]">
        <div ref={canvasRef} className="absolute inset-0" aria-hidden />

        {/* fixed section heading */}
        {heading && (
          <div className="absolute top-[12%] left-0 right-0 z-10 text-center px-6 pointer-events-none">
            <p className="text-xs md:text-sm font-semibold tracking-[0.3em] uppercase text-white/60">{heading}</p>
          </div>
        )}

        {/* active landmark label */}
        {labels.length > 0 && (
          <div className="absolute bottom-[14%] left-0 right-0 z-10 text-center px-6 pointer-events-none">
            {labels.map((l, i) => (
              <h3
                key={i}
                className="text-3xl md:text-6xl font-bold text-white absolute left-0 right-0 transition-all duration-500"
                style={{
                  opacity: i === active ? 1 : 0,
                  transform: i === active ? "translateY(0)" : "translateY(12px)",
                  textShadow: "0 2px 24px rgba(0,0,0,0.6)",
                }}
              >
                {l}
              </h3>
            ))}
          </div>
        )}

        {/* progress dots */}
        <div className="absolute bottom-[7%] left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {images.map((_, i) => (
            <span key={i} className="h-1.5 rounded-full transition-all duration-300" style={{ width: i === active ? 22 : 6, backgroundColor: i === active ? "#fff" : "rgba(255,255,255,0.35)" }} />
          ))}
        </div>

        {!ready && <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">Loading…</div>}
      </div>
    </div>
  );
}

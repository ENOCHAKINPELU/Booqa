import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Move3d, AlertTriangle } from 'lucide-react';

// Three's own loader cache — without it, React.StrictMode's double-invoked
// effect (dev only) fetches the same multi-MB panorama twice in parallel,
// and revisiting a tour a guest already opened this session re-downloads
// it instead of reusing the decoded texture.
THREE.Cache.enabled = true;

// Embedded, drag-to-look-around equirectangular panorama viewer — the
// standard Three.js "camera at the center of an inside-out sphere" pattern
// (the same technique behind threejs.org's own panorama example), adapted
// as a self-contained React component. Replaces the previous behavior of
// just opening the tour_360 media URL in a new tab (see MediaGallery.jsx).
//
// Deliberately has no ambient/auto-rotate animation of its own — the view
// only moves in response to a real drag, which is what makes this respect
// prefers-reduced-motion "for free" without needing to special-case it.
export default function Room360Viewer({ url }) {
  const containerRef = useRef(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setStatus('error');
      return;
    }

    const camera = new THREE.PerspectiveCamera(75, 1, 1, 1100);
    const scene = new THREE.Scene();

    // A sphere viewed from the inside — scale.x = -1 flips the geometry's
    // winding order so the texture faces inward toward the camera at the
    // origin, instead of outward like a normal sphere would render it.
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let texture;
    let disposed = false;
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        if (disposed) return;
        tex.colorSpace = THREE.SRGBColorSpace;
        material.map = tex;
        material.needsUpdate = true;
        texture = tex;
        setStatus('ready');
      },
      (evt) => {
        if (evt.lengthComputable) setLoadProgress(Math.round((evt.loaded / evt.total) * 100));
      },
      (err) => {
        console.error('[Room360Viewer] texture load failed for', url, err);
        if (!disposed) setStatus('error');
      }
    );

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = container;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x111827, 1); // gray-900 — matches the loading/error state instead of Three's default white-through-transparent
    // insertBefore, not appendChild: the loading/error/hint overlays below
    // are React-rendered children of this same container, and an
    // imperatively appended canvas would land *after* them in DOM order —
    // painting over them for the entire time status is 'loading' or
    // 'error', since nothing here sets an explicit z-index.
    container.insertBefore(renderer.domElement, container.firstChild);
    resize();

    // Classic lon/lat drag control: the camera never moves from the
    // sphere's center, only the point it looks at does.
    let lon = 90, lat = 0, phi = 0, theta = 0;
    let dragging = false;
    let startX = 0, startY = 0, startLon = 0, startLat = 0;
    const target = new THREE.Vector3();

    const pointerDown = (clientX, clientY) => {
      dragging = true;
      startX = clientX; startY = clientY;
      startLon = lon; startLat = lat;
      setShowHint(false);
    };
    const pointerMove = (clientX, clientY) => {
      if (!dragging) return;
      lon = (startX - clientX) * 0.15 + startLon;
      lat = (clientY - startY) * 0.15 + startLat;
    };
    const pointerUp = () => { dragging = false; };

    const onMouseDown = (e) => pointerDown(e.clientX, e.clientY);
    const onMouseMove = (e) => pointerMove(e.clientX, e.clientY);
    const onTouchStart = (e) => { if (e.touches[0]) pointerDown(e.touches[0].clientX, e.touches[0].clientY); };
    const onTouchMove = (e) => { if (e.touches[0]) pointerMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onWheel = (e) => {
      e.preventDefault();
      camera.fov = THREE.MathUtils.clamp(camera.fov + e.deltaY * 0.02, 40, 90);
      camera.updateProjectionMatrix();
    };

    const el = renderer.domElement;
    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', pointerUp);
    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', pointerUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    let rafId;
    const animate = () => {
      rafId = requestAnimationFrame(animate);
      lat = Math.max(-85, Math.min(85, lat));
      phi = THREE.MathUtils.degToRad(90 - lat);
      theta = THREE.MathUtils.degToRad(lon);
      target.set(500 * Math.sin(phi) * Math.cos(theta), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(theta));
      camera.lookAt(target);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      ro.disconnect();
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', pointerUp);
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', pointerUp);
      el.removeEventListener('wheel', onWheel);
      geometry.dispose();
      material.dispose();
      texture?.dispose();
      renderer.dispose();
      if (el.parentNode === container) container.removeChild(el);
    };
  }, [url]);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-900 cursor-grab active:cursor-grabbing touch-none select-none">
      {status === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 pointer-events-none">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-xs">{loadProgress > 0 ? `Loading 360° tour… ${loadProgress}%` : 'Loading 360° tour…'}</span>
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/70 px-6 text-center">
          <AlertTriangle className="w-6 h-6" />
          <span className="text-xs">This 360° tour couldn't load. Your browser or connection may not support it.</span>
        </div>
      )}
      {status === 'ready' && showHint && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-xs font-medium text-white bg-black/50 rounded-full px-3 py-1.5 pointer-events-none animate-pulse">
          <Move3d className="w-3.5 h-3.5" /> Drag to look around
        </div>
      )}
    </div>
  );
}

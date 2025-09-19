const blueprintRoot = document.querySelector('[data-blueprint]');

if (blueprintRoot) {
  const viewport = blueprintRoot.querySelector('[data-blueprint-viewport]');
  const scene = blueprintRoot.querySelector('[data-blueprint-scene]');
  const zoomInButton = blueprintRoot.querySelector('[data-blueprint-zoom-in]');
  const zoomOutButton = blueprintRoot.querySelector('[data-blueprint-zoom-out]');
  const resetButton = blueprintRoot.querySelector('[data-blueprint-reset]');

  if (!viewport || !scene) {
    return;
  }

  const state = {
    scale: 1,
    minScale: 1,
    maxScale: 3,
    translateX: 0,
    translateY: 0,
  };

  const pointerPositions = new Map();
  let lastSinglePointer = null;
  let lastPinchDistance = null;
  let lastPinchCenter = null;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const applyTransform = () => {
    scene.style.transform = `translate(${state.translateX}px, ${state.translateY}px) scale(${state.scale})`;
  };

  const setScale = (nextScale, center) => {
    const targetScale = clamp(nextScale, state.minScale, state.maxScale);
    const currentScale = state.scale;

    if (targetScale === currentScale) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const cx = center?.x ?? rect.width / 2;
    const cy = center?.y ?? rect.height / 2;

    const originX = (cx - state.translateX) / currentScale;
    const originY = (cy - state.translateY) / currentScale;

    state.scale = targetScale;
    state.translateX = cx - originX * targetScale;
    state.translateY = cy - originY * targetScale;
    applyTransform();
  };

  const resetTransform = () => {
    state.scale = 1;
    state.translateX = 0;
    state.translateY = 0;
    applyTransform();
  };

  const updatePan = (dx, dy) => {
    state.translateX += dx;
    state.translateY += dy;
    applyTransform();
  };

  const getPinchMetrics = () => {
    const pointers = Array.from(pointerPositions.values());
    if (pointers.length < 2) return null;

    const [a, b] = pointers;
    const center = {
      x: (a.x + b.x) / 2,
      y: (a.y + b.y) / 2,
    };
    const distance = Math.hypot(a.x - b.x, a.y - b.y);

    return { center, distance };
  };

  viewport.addEventListener('wheel', (event) => {
    event.preventDefault();
    const zoomIntensity = 0.0014;
    const scaleFactor = Math.exp(-event.deltaY * zoomIntensity);
    const rect = viewport.getBoundingClientRect();
    const center = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    setScale(state.scale * scaleFactor, center);
  }, { passive: false });

  viewport.addEventListener('pointerdown', (event) => {
    viewport.setPointerCapture(event.pointerId);
    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointerPositions.size === 1) {
      lastSinglePointer = { x: event.clientX, y: event.clientY };
      viewport.classList.add('is-dragging');
    } else if (pointerPositions.size === 2) {
      const metrics = getPinchMetrics();
      lastPinchDistance = metrics?.distance ?? null;
      lastPinchCenter = metrics?.center ?? null;
      viewport.classList.add('is-dragging');
    }
  });

  viewport.addEventListener('pointermove', (event) => {
    if (!pointerPositions.has(event.pointerId)) {
      return;
    }

    pointerPositions.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointerPositions.size === 1 && lastSinglePointer) {
      const position = pointerPositions.get(event.pointerId);
      const dx = position.x - lastSinglePointer.x;
      const dy = position.y - lastSinglePointer.y;
      lastSinglePointer = { ...position };
      updatePan(dx, dy);
    }

    if (pointerPositions.size >= 2) {
      const metrics = getPinchMetrics();
      if (!metrics) return;

      const rect = viewport.getBoundingClientRect();
      const centerRelative = {
        x: metrics.center.x - rect.left,
        y: metrics.center.y - rect.top,
      };

      if (lastPinchDistance) {
        const distanceDelta = metrics.distance / lastPinchDistance;
        setScale(state.scale * distanceDelta, centerRelative);
      }

      if (lastPinchCenter) {
        const centerDeltaX = metrics.center.x - lastPinchCenter.x;
        const centerDeltaY = metrics.center.y - lastPinchCenter.y;
        updatePan(centerDeltaX, centerDeltaY);
      }

      lastPinchDistance = metrics.distance;
      lastPinchCenter = metrics.center;
    }
  });

  const endPointerInteraction = (event) => {
    pointerPositions.delete(event.pointerId);
    viewport.releasePointerCapture(event.pointerId);

    if (pointerPositions.size === 1) {
      const remaining = Array.from(pointerPositions.values())[0];
      lastSinglePointer = { ...remaining };
    } else {
      lastSinglePointer = null;
    }

    if (pointerPositions.size < 2) {
      lastPinchDistance = null;
      lastPinchCenter = null;
    }

    if (pointerPositions.size === 0) {
      viewport.classList.remove('is-dragging');
    }
  };

  viewport.addEventListener('pointerup', endPointerInteraction);
  viewport.addEventListener('pointercancel', endPointerInteraction);
  viewport.addEventListener('pointerleave', (event) => {
    if (!viewport.hasPointerCapture(event.pointerId)) {
      pointerPositions.delete(event.pointerId);
    }
  });

  zoomInButton?.addEventListener('click', () => {
    const rect = viewport.getBoundingClientRect();
    setScale(state.scale * 1.2, { x: rect.width / 2, y: rect.height / 2 });
  });

  zoomOutButton?.addEventListener('click', () => {
    const rect = viewport.getBoundingClientRect();
    setScale(state.scale / 1.2, { x: rect.width / 2, y: rect.height / 2 });
  });

  resetButton?.addEventListener('click', () => {
    resetTransform();
  });

  viewport.addEventListener('dblclick', (event) => {
    event.preventDefault();
    const rect = viewport.getBoundingClientRect();
    const center = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    setScale(state.scale * 1.4, center);
  });

  applyTransform();
}

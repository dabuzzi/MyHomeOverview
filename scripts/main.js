const viewport = document.querySelector('[data-slider-viewport]');
const track = viewport?.querySelector('[data-slider-track]');
const slides = track ? Array.from(track.children) : [];
const prevButton = document.querySelector('[data-slider-prev]');
const nextButton = document.querySelector('[data-slider-next]');
const dotButtons = Array.from(document.querySelectorAll('[data-slider-dot]'));

if (viewport && track && slides.length) {
  let currentIndex = 0;
  let startX = 0;
  let currentX = 0;
  let isDragging = false;
  let activePointerId = null;
  let viewportWidth = viewport.clientWidth;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const updateDots = () => {
    dotButtons.forEach((button, index) => {
      const isActive = index === currentIndex;
      button.setAttribute('aria-selected', String(isActive));
      button.tabIndex = isActive ? 0 : -1;
    });
  };

  const updateButtons = () => {
    if (prevButton) {
      prevButton.disabled = currentIndex === 0;
    }
    if (nextButton) {
      nextButton.disabled = currentIndex === slides.length - 1;
    }
  };

  const setTransform = (offsetPx) => {
    track.style.transform = `translateX(${offsetPx}px)`;
  };

  const snapToIndex = () => {
    viewportWidth = viewport.clientWidth;
    setTransform(-currentIndex * viewportWidth);
    updateDots();
    updateButtons();
  };

  const goToIndex = (index) => {
    const nextIndex = clamp(index, 0, slides.length - 1);
    if (nextIndex === currentIndex) {
      snapToIndex();
      return;
    }
    currentIndex = nextIndex;
    snapToIndex();
  };

  const handlePointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    isDragging = true;
    activePointerId = event.pointerId;
    startX = event.clientX;
    currentX = startX;
    viewportWidth = viewport.clientWidth;
    track.classList.add('is-dragging');
    track.style.transition = 'none';

    try {
      viewport.setPointerCapture(event.pointerId);
    } catch (error) {
      // Ignore if pointer capture is not supported
    }
  };

  const handlePointerMove = (event) => {
    if (!isDragging || event.pointerId !== activePointerId) return;

    currentX = event.clientX;
    const delta = currentX - startX;
    setTransform(-currentIndex * viewportWidth + delta);
  };

  const endDrag = (event) => {
    if (!isDragging || (event && event.pointerId !== activePointerId)) return;

    const delta = currentX - startX;
    const threshold = Math.min(160, viewportWidth * 0.2);

    isDragging = false;
    activePointerId = null;
    track.classList.remove('is-dragging');
    track.style.transition = '';

    if (event) {
      try {
        viewport.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Ignore if pointer capture cannot be released
      }
    }

    if (delta < -threshold) {
      goToIndex(currentIndex + 1);
    } else if (delta > threshold) {
      goToIndex(currentIndex - 1);
    } else {
      snapToIndex();
    }
  };

  viewport.addEventListener('pointerdown', handlePointerDown);
  viewport.addEventListener('pointermove', handlePointerMove);
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('pointerleave', (event) => {
    if (isDragging) {
      endDrag(event);
    }
  });

  const handleKeyNavigation = (event) => {
    switch (event.key) {
      case 'ArrowRight':
      case 'PageDown':
        event.preventDefault();
        goToIndex(currentIndex + 1);
        break;
      case 'ArrowLeft':
      case 'PageUp':
        event.preventDefault();
        goToIndex(currentIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        goToIndex(0);
        break;
      case 'End':
        event.preventDefault();
        goToIndex(slides.length - 1);
        break;
      default:
        break;
    }
  };

  viewport.addEventListener('keydown', handleKeyNavigation);
  viewport.tabIndex = 0;
  viewport.setAttribute('role', 'region');
  viewport.setAttribute('aria-roledescription', 'carrousel');

  dotButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const index = Number.parseInt(button.dataset.sliderDot ?? '0', 10);
      goToIndex(index);
    });
  });

  if (prevButton) {
    prevButton.addEventListener('click', () => {
      goToIndex(currentIndex - 1);
    });
  }

  if (nextButton) {
    nextButton.addEventListener('click', () => {
      goToIndex(currentIndex + 1);
    });
  }

  window.addEventListener('resize', () => {
    snapToIndex();
  });

  snapToIndex();
}

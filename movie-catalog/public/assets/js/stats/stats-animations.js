// stats-animations.js
import { formatBytes } from '../utils/format.js';

export function animateNumber(el, target, duration = 700) {
    if (!el) return;

    const start = 0;
    const end = Number(target) || 0; // Ensure it's a valid number
    const range = end - start;
    const startTime = performance.now();

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        el.textContent = Math.floor(start + range * progress).toLocaleString();
        if (progress < 1) requestAnimationFrame(step);
    }

    // Start the animation
    requestAnimationFrame(step);
}

export function animateBytes(el, bytes, duration = 900) {
    if (!el) return;

    const startTime = performance.now();
    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(bytes * progress);
        el.textContent = formatBytes(value);
        if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
}

import { formatBytes } from '../utils/format.js';

const animationTokens = new WeakMap();

function runAnimation(element, target, duration, formatter) {
    if (!element) return;

    const end = Number(target) || 0;
    const reduceMotion = typeof matchMedia === 'function' &&
        matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduceMotion || duration <= 0) {
        animationTokens.delete(element);
        element.textContent = formatter(end);
        return;
    }

    const startedAt = performance.now();
    const token = Symbol('stats-animation');
    animationTokens.set(element, token);

    function step(now) {
        if (animationTokens.get(element) !== token) return;

        const elapsed = now - startedAt;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        element.textContent = formatter(end * easedProgress);

        if (progress < 1) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

export function animateMetric(
    element,
    target,
    {
        duration = 700,
        decimals = 0,
        suffix = ''
    } = {}
) {
    runAnimation(
        element,
        target,
        duration,
        value => `${value.toLocaleString(undefined, {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })}${suffix}`
    );
}

export function animateNumber(element, target, duration = 700) {
    animateMetric(element, target, { duration });
}

export function animateBytes(element, bytes, duration = 900) {
    runAnimation(
        element,
        bytes,
        duration,
        value => formatBytes(Math.floor(value))
    );
}

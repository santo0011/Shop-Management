import { useState, useEffect, useRef } from 'react';

/**
 * Count-up animation hook.
 * Animates from 0 to `end` over `duration` ms when `end` changes.
 * Uses requestAnimationFrame for smooth performance.
 *
 * @param {number} end   - The target value to count up to.
 * @param {number} duration - Animation duration in ms (default 400).
 * @returns {number} Current animated value.
 */
const useCountUp = (end, duration = 100) => {
  const [value, setValue] = useState(0);
  const prevEndRef = useRef(end);
  const rafRef = useRef(null);

  useEffect(() => {
    // Only animate if the target value actually changed
    if (prevEndRef.current === end) return;
    prevEndRef.current = end;

    const startTime = performance.now();
    const startValue = 0;

    const step = (timestamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (end - startValue) * eased);

      setValue(current);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [end, duration]);

  // Reset to 0 if end becomes 0 or falsy
  useEffect(() => {
    if (!end) setValue(0);
  }, [end]);

  return value;
};

export default useCountUp;
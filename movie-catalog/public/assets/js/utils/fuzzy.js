// utils/fuzzy.js
export function fuzzyMatch(text, pattern, threshold = 0.6) {
  if (!text || !pattern) return false;

  text = text.toLowerCase();
  pattern = pattern.toLowerCase();

  let tIndex = 0, pIndex = 0;

  while (tIndex < text.length && pIndex < pattern.length) {
    if (text[tIndex] === pattern[pIndex]) {
      pIndex++;
    }
    tIndex++;
  }

  const score = pIndex / pattern.length;
  return score >= threshold; // e.g., 0.6 means 60% chars matched in order
}

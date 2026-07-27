export function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
  return {
    median: at(0.5),
    q1: at(0.25),
    q3: at(0.75),
    min: sorted[0],
    max: sorted[sorted.length - 1]
  };
}

/**
 * The signature element: a row of small flame silhouettes tracing a shallow
 * arc, evoking the diya lit at the start of every Shakha gathering. Used
 * once per page, directly under a hero heading — never as decoration
 * elsewhere, so it stays meaningful rather than becoming wallpaper.
 */
export default function FlameDivider({ className = '' }: { className?: string }) {
  const flameCount = 7;
  const flames = Array.from({ length: flameCount });

  return (
    <svg
      viewBox="0 0 400 40"
      className={`w-full max-w-xs h-8 ${className}`}
      aria-hidden="true"
    >
      {flames.map((_, i) => {
        const t = i / (flameCount - 1);
        const x = 20 + t * 360;
        const arc = Math.sin(t * Math.PI) * 14;
        const y = 28 - arc;
        const scale = 0.7 + Math.sin(t * Math.PI) * 0.5;
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${scale})`}>
            <path
              d="M0 10 C-4 4 -3 -2 0 -8 C3 -2 4 4 0 10 Z"
              fill={i % 2 === 0 ? '#E08D3C' : '#A23B2E'}
              opacity={0.55 + Math.sin(t * Math.PI) * 0.45}
            />
          </g>
        );
      })}
    </svg>
  );
}

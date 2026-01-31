export default function Logo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 200 200"
      style={{
        filter: 'drop-shadow(0 2px 4px rgba(0, 113, 227, 0.2))',
      }}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0071e3', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
        </linearGradient>
        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer Ring */}
      <circle
        cx="100"
        cy="100"
        r="50"
        fill="none"
        stroke="url(#logoGradient)"
        strokeWidth="2"
        opacity="0.5"
      />

      {/* Eye Upper */}
      <path
        d="M 75 100 Q 100 80 125 100"
        fill="none"
        stroke="url(#logoGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Eye Lower */}
      <path
        d="M 75 100 Q 100 120 125 100"
        fill="none"
        stroke="url(#logoGradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Iris */}
      <circle
        cx="100"
        cy="100"
        r="12"
        fill="url(#logoGradient)"
        filter="url(#logoGlow)"
      />

      {/* Pupil */}
      <circle
        cx="100"
        cy="100"
        r="6"
        fill="#ffffff"
        opacity="0.85"
      />
    </svg>
  );
}

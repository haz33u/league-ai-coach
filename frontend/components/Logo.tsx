export default function Logo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 200 200"
      style={{
        filter: 'drop-shadow(0 2px 6px rgba(88, 101, 242, 0.35))',
      }}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#22d3ee', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#7c3aed', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#10b981', stopOpacity: 1 }} />
        </linearGradient>
        <filter id="logoGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <circle
        cx="100"
        cy="100"
        r="54"
        fill="none"
        stroke="url(#logoGradient)"
        strokeWidth="2"
        strokeDasharray="6 8"
        opacity="0.7"
      />

      <path
        d="M 62 100 Q 100 70 138 100"
        fill="none"
        stroke="url(#logoGradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M 62 100 Q 100 130 138 100"
        fill="none"
        stroke="url(#logoGradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <path
        d="M 86 78 L 114 122"
        stroke="rgba(244, 114, 182, 0.8)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M 114 78 L 86 122"
        stroke="rgba(59, 130, 246, 0.8)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <circle
        cx="100"
        cy="100"
        r="12"
        fill="url(#logoGradient)"
        filter="url(#logoGlow)"
      />

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

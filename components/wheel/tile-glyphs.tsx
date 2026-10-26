/** 格子图标：统一圆角笔触和内高光，颜色仍按格子类型区分。 */
const ink = {
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function TileGlyph({ type }: { type: string }) {
  switch (type) {
    case "opportunity":
      return (
        <g>
          <circle cx="-3.1" cy="-3.1" r="2.15" fill="#1f6b45" />
          <circle cx="3.1" cy="-3.1" r="2.15" fill="#1f6b45" />
          <circle cx="-3.1" cy="3.1" r="2.15" fill="#1f6b45" />
          <circle cx="3.1" cy="3.1" r="2.15" fill="#1f6b45" />
          <circle cx="-3.1" cy="-3.1" r="1.15" fill="#7dffa8" opacity="0.9" />
          <circle cx="3.1" cy="-3.1" r="1.15" fill="#7dffa8" opacity="0.9" />
          <circle cx="-3.1" cy="3.1" r="1.15" fill="#7dffa8" opacity="0.9" />
          <circle cx="3.1" cy="3.1" r="1.15" fill="#7dffa8" opacity="0.9" />
          <rect x="-0.55" y="2.4" width="1.1" height="3.6" rx="0.4" fill="#d8ffe6" />
        </g>
      );
    case "risk":
      return (
        <g {...ink}>
          <path d="M0,-6.6 L6,5.4 L-6,5.4 Z" fill="#f0b429" />
          <path d="M0,-4.2 L3.5,4.1 L-3.5,4.1 Z" fill="#ffe7a3" opacity="0.55" />
          <path d="M0,-1.5 V1.5" stroke="#1a1408" strokeWidth="1.2" />
          <circle cy="3.15" r="0.65" fill="#1a1408" />
        </g>
      );
    case "market":
      return (
        <g fill="none" stroke="#8cbcff" strokeWidth="1.25" {...ink}>
          <circle cx="-3" cy="1" r="2.7" />
          <circle cx="3.2" cy="-1" r="2.7" />
          <path d="M-1,-5 H3 M3,-5 L1.5,-6.3 M3,-5 L1.5,-3.7" />
          <path d="M1,5 H-3 M-3,5 L-1.5,6.3 M-3,5 L-1.5,3.7" />
        </g>
      );
    case "settlement":
      return (
        <g {...ink}>
          <rect x="-4.8" y="-6" width="9.6" height="12" rx="1.6" fill="#c4473a" />
          <rect x="-3.6" y="-4.6" width="7.2" height="2" rx="0.4" fill="#ffd0c8" opacity="0.8" />
          <path d="M-2.2,-0.6 H2.2 M-2.2,1.6 H2.2 M-2.2,3.6 H0.4" stroke="#2a0c0c" strokeWidth="0.9" />
        </g>
      );
    case "child":
      return (
        <g fill="none" stroke="#d7b0ff" strokeWidth="1.25" {...ink}>
          <path d="M-6,2.2 Q0,6.6 6,2.2" />
          <path d="M-6.2,2.2 H6.2" />
          <circle cy="-1.3" r="1.85" fill="#e7d4ff" stroke="none" />
        </g>
      );
    case "health":
    case "study":
      return (
        <g {...ink}>
          <path d="M0,-6.8 C2.6,-4 3,0.2 0,2.8 C-3,0.2 -2.6,-4 0,-6.8 Z" fill="#ff8a5b" />
          <path d="M0,-5.2 C1.4,-3.4 1.5,-0.4 0,1.2 C-1.5,-0.4 -1.4,-3.4 0,-5.2 Z" fill="#ffe0c2" opacity="0.7" />
          <path d="M-1.4,2 L-3.8,5.8 L-0.5,3.1 Z" fill="#f5c542" />
          <path d="M1.4,2 L3.8,5.8 L0.5,3.1 Z" fill="#f5c542" />
        </g>
      );
    case "charity":
      return (
        <g>
          <path d="M0,5 C-5.2,-0.4 -3.2,-5.6 0,-3 C3.2,-5.6 5.2,-0.4 0,5 Z" fill="#f3e2b3" />
          <path d="M0,3.2 C-2.8,-0.2 -1.6,-3.2 0,-1.8 C1.6,-3.2 2.8,-0.2 0,3.2 Z" fill="#fff6df" opacity="0.65" />
        </g>
      );
    case "financial_storm":
      return (
        <g {...ink}>
          <path
            d="M-6,1.4 Q-2,-5.4 2,-0.4 Q5,-4 5.4,2"
            fill="none"
            stroke="#ff8d8d"
            strokeWidth="1.35"
          />
          <path d="M0.1,-1 L-1.2,2.8 H1 L-0.15,5.6 L2.3,-1 Z" fill="#ffe08a" />
        </g>
      );
    case "investment":
      return (
        <path
          d="M0,1.1 a1.15,1.15 0 1 1 0.08,0 M0,1.1 a2.5,2.5 0 1 0 0.08,0 M0,1.1 a4,4 0 1 1 0.08,0"
          fill="none"
          stroke="#9ec4ff"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      );
    case "wealth_leisure":
      return (
        <g stroke="#d7b0ff" fill="none" strokeWidth="1.25" {...ink}>
          <circle r="4.8" />
          <path d="M0,-2.1 V0.3 L1.8,1.5" />
          <circle cx="3.8" cy="3.6" r="1.7" fill="#e7d4ff" stroke="none" />
        </g>
      );
    case "quality_life":
      return (
        <g>
          <path d="M0,-6 L4.8,0 L0,6 L-4.8,0 Z" fill="#2f9e62" />
          <path d="M0,-3.2 L2.4,0 L0,3.2 L-2.4,0 Z" fill="#b6ffd0" opacity="0.85" />
        </g>
      );
    case "tax_audit":
      return (
        <g fill="none" stroke="#b9d4ff" strokeWidth="1.15" {...ink}>
          <rect x="-4.4" y="-5.8" width="8.8" height="11.6" rx="1.2" />
          <path d="M-2,-2.2 H2 M-2,0.4 H2 M-2,3 H0.2" />
        </g>
      );
    case "divorce":
      return (
        <g {...ink}>
          <path d="M0,5.2 C-5.6,-0.6 -3.6,-5.8 0,-3.2 C3.6,-5.8 5.6,-0.6 0,5.2 Z" fill="#c084fc" />
          <path d="M0,2.8 C-2.6,-0.2 -1.5,-2.8 0,-1.6 C1.5,-2.8 2.6,-0.2 0,2.8 Z" fill="#f3e8ff" opacity="0.55" />
          <path d="M-0.15,-1.4 L1,0.6 L-0.5,0.6 L0.7,3.2" stroke="#241433" strokeWidth="0.85" fill="none" />
        </g>
      );
    default:
      return <circle r="2.6" fill="var(--ll-gold)" />;
  }
}

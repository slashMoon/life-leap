/** 实物沙盘图标：颜色按格子类型固定，尺寸按 16px 视框绘制。 */
export function TileGlyph({ type }: { type: string }) {
  switch (type) {
    case "opportunity":
      return (
        <g fill="#3ddc84">
          <circle cx="-3.1" cy="-3.1" r="2.3" />
          <circle cx="3.1" cy="-3.1" r="2.3" />
          <circle cx="-3.1" cy="3.1" r="2.3" />
          <circle cx="3.1" cy="3.1" r="2.3" />
          <rect x="-0.7" y="2.2" width="1.4" height="4.2" rx="0.4" />
        </g>
      );
    case "risk":
      return (
        <g>
          <path d="M0,-7 L6.4,5.6 L-6.4,5.6 Z" fill="#f5c542" />
          <path d="M0,-2.2 V1.6" stroke="#1a1408" strokeWidth="1.3" />
          <circle cy="3.3" r="0.7" fill="#1a1408" />
        </g>
      );
    case "market":
      return (
        <g fill="none" stroke="#5b9dff" strokeWidth="1.3">
          <circle cx="-3" cy="1" r="3" />
          <circle cx="3.2" cy="-1" r="3" />
          <path d="M-1,-5.2 H3.2 M3.2,-5.2 L1.6,-6.6 M3.2,-5.2 L1.6,-3.8" />
          <path d="M1,5.2 H-3.2 M-3.2,5.2 L-1.6,6.6 M-3.2,5.2 L-1.6,3.8" />
        </g>
      );
    case "settlement":
      return (
        <g>
          <rect x="-5" y="-6.2" width="10" height="12.4" rx="1.4" fill="#e85d4c" />
          <path d="M-2.4,-2.2 H2.4 M-2.4,0.6 H2.4 M-2.4,3.2 H0.6" stroke="#2a0c0c" strokeWidth="1" />
        </g>
      );
    case "child":
      return (
        <g fill="none" stroke="#c084fc" strokeWidth="1.3">
          <path d="M-6.2,2.2 Q0,7.2 6.2,2.2" />
          <path d="M-6.6,2.2 H6.6" />
          <circle cy="-1.2" r="2.1" fill="#c084fc" stroke="none" />
        </g>
      );
    case "health":
    case "study":
      return (
        <g>
          <path d="M0,-7.2 C2.8,-4.2 3.2,0.4 0,3.2 C-3.2,0.4 -2.8,-4.2 0,-7.2 Z" fill="#ff7a45" />
          <path d="M-1.6,2.2 L-4.2,6.2 L-0.6,3.4 Z" fill="#f5c542" />
          <path d="M1.6,2.2 L4.2,6.2 L0.6,3.4 Z" fill="#f5c542" />
        </g>
      );
    case "charity":
      return (
        <path
          d="M0,5.2 C-5.6,-0.6 -3.4,-6 0,-3.2 C3.4,-6 5.6,-0.6 0,5.2 Z"
          fill="#f3e2b3"
        />
      );
    case "financial_storm":
      return (
        <g>
          <path
            d="M-6,1.5 Q-2,-6 2.2,-0.6 Q5.4,-4.6 5.6,2.2"
            fill="none"
            stroke="#ff6b6b"
            strokeWidth="1.4"
          />
          <path d="M0.2,-1.2 L-1.4,3.2 H1.2 L-0.2,6.4 L2.6,-1.2 Z" fill="#f5c542" />
        </g>
      );
    case "investment":
      return (
        <path
          d="M0,1.2 a1.2,1.2 0 1 1 0.1,0 M0,1.2 a2.6,2.6 0 1 0 0.1,0 M0,1.2 a4.2,4.2 0 1 1 0.1,0"
          fill="none"
          stroke="#5b9dff"
          strokeWidth="1.25"
        />
      );
    case "wealth_leisure":
      return (
        <g stroke="#c084fc" fill="none" strokeWidth="1.3">
          <circle r="5.2" />
          <path d="M0,-2.4 V0.4 L2.1,1.8" />
          <circle cx="4.2" cy="4" r="2" fill="#c084fc" stroke="none" />
        </g>
      );
    case "quality_life":
      return <path d="M0,-6.4 L5.2,0 L0,6.4 L-5.2,0 Z" fill="#3ddc84" />;
    case "tax_audit":
      return (
        <g fill="none" stroke="#7eb6ff" strokeWidth="1.2">
          <rect x="-4.6" y="-6" width="9.2" height="12" rx="1" />
          <path d="M-2.2,-2.4 H2.2 M-2.2,0.4 H2.2 M-2.2,3.2 H0.4" />
        </g>
      );
    case "divorce":
      return (
        <g>
          <path d="M0,5.4 C-6,-0.8 -3.8,-6.2 0,-3.4 C3.8,-6.2 6,-0.8 0,5.4 Z" fill="#c084fc" />
          <path d="M-0.2,-1.6 L1.2,0.8 L-0.6,0.8 L0.8,3.6" stroke="#241433" strokeWidth="0.9" fill="none" />
        </g>
      );
    default:
      return <circle r="3" fill="var(--ll-gold)" />;
  }
}

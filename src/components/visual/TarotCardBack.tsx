type TarotCardBackProps = {
  readonly className?: string;
};

export function TarotCardBack({ className = "" }: TarotCardBackProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-card-back=""
      data-card-back-pattern="quiet-celestial-medallion"
      fill="none"
      focusable="false"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 80 112"
    >
      <rect className="fill-ts-blush" height="112" rx="12" width="80" />
      <rect
        className="stroke-ts-action"
        height="101"
        rx="8.5"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        width="69"
        x="5.5"
        y="5.5"
      />
      <rect
        className="stroke-ts-gold"
        height="93"
        rx="6.5"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        width="61"
        x="9.5"
        y="9.5"
      />

      <g className="fill-ts-gold" data-card-back-ornament="">
        <circle cx="34" cy="19" r="1.25" />
        <circle cx="40" cy="19" r="2" />
        <circle cx="46" cy="19" r="1.25" />
        <circle cx="17" cy="56" r="1.5" />
        <circle cx="63" cy="56" r="1.5" />
        <circle cx="34" cy="93" r="1.25" />
        <circle cx="40" cy="93" r="2" />
        <circle cx="46" cy="93" r="1.25" />
      </g>

      <g data-card-back-medallion="">
        <circle
          className="fill-ts-canvas stroke-ts-action"
          cx="40"
          cy="56"
          r="22"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          className="fill-ts-surface stroke-ts-gold"
          cx="40"
          cy="56"
          r="17"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <path
          className="fill-ts-blush stroke-ts-action"
          d="M40 39 44 50 55 46 46 55 57 56 46 57 55 66 44 62 40 73 36 62 25 66 34 57 23 56 34 55 25 46 36 50Z"
          strokeLinejoin="round"
          strokeWidth="1.25"
          vectorEffect="non-scaling-stroke"
        />
        <circle className="fill-ts-gold" cx="40" cy="56" r="3" />
      </g>
    </svg>
  );
}

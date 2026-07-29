type CelestialMarkProps = {
  readonly className?: string;
};

export function CelestialMark({ className = "" }: CelestialMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 72 36"
    >
      <path
        d="M18 4v18M9 13h18M13.5 8.5l9 9M22.5 8.5l-9 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1"
      />
      <path
        d="M49 15v12M43 21h12M45.5 17.5l7 7M52.5 17.5l-7 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1"
      />
      <circle cx="63" cy="7" r="1.5" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

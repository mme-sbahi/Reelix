const HOLE_COUNT = 8;

export default function ReelSpinner({ size = 56, label }) {
  const holes = new Array(HOLE_COUNT).fill(0);

  return (
    <div className="ht-reel-wrap">
      <svg className="ht-reel" width={size} height={size} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="none" stroke="var(--line)" strokeWidth="3" />
        <circle
          cx="50" cy="50" r="46" fill="none" stroke="var(--marquee)" strokeWidth="3"
          strokeDasharray="80 210" strokeLinecap="round"
        />
        {holes.map((_, i) => {
          const angle = (i / holes.length) * Math.PI * 2;
          const r = 30;
          return (
            <circle
              key={i}
              cx={50 + r * Math.cos(angle)}
              cy={50 + r * Math.sin(angle)}
              r="6"
              fill="var(--void)"
              stroke="var(--line)"
              strokeWidth="2"
            />
          );
        })}
        <circle cx="50" cy="50" r="8" fill="var(--marquee)" />
      </svg>
      {label && <span className="ht-reel__label">{label}</span>}
    </div>
  );
}

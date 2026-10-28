export default function AmbientBackground() {
  return (
    <div className="ht-ambient" aria-hidden="true">
      <div className="ht-ambient__beam" />
      <div className="ht-ambient__beam ht-ambient__beam--b" />
      <svg className="ht-ambient__grain" width="100%" height="100%">
        <filter id="ht-noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#ht-noise)" />
      </svg>
    </div>
  );
}

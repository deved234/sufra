// Placeholder block shown while content loads. Pulsing stops for reduced-motion users.
export default function Skeleton({ className = "" }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-surface-muted motion-reduce:animate-none ${className}`} />;
}

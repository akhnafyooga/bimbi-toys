export default function ImagePlaceholder({ className = "" }: { className?: string }) {
  return <div className={`flex items-center justify-center bg-bimbi-sky/15 text-5xl ${className}`} />;
}
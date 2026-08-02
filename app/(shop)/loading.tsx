import Loader from "@/components/Loader";

// Shown by Next while a shop route's server component is streaming in.
// Fixed and above the header's z-50 on purpose: loading.tsx only replaces the
// layout's {children}, so without covering the viewport the header and footer
// would stay on screen around the spinner.
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <Loader />
    </div>
  );
}

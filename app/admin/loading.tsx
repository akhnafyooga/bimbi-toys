import Loader from "@/components/Loader";

// Same full-viewport treatment as the shop: loading.tsx only swaps out the
// layout's {children}, so it has to cover the chrome itself.
export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <Loader />
    </div>
  );
}

import Loader from "@/components/Loader";

// The loading screen behind every route's loading.tsx. loading.tsx only swaps
// out the layout's {children}, so it has to cover the chrome itself — fixed,
// and above the header's z-50 on purpose, or the header and footer would stay
// on screen around the spinner.
export default function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white">
      <Loader />
    </div>
  );
}

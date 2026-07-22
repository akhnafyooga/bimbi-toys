import Link from "next/link";

type Props = {
  icon?: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
};

export default function EmptyState({ icon, message, actionHref, actionLabel }: Props) {
  return (
    <div className="text-center py-14 px-4">
      {icon ? <div className="text-5xl">{icon}</div> : null}
      <p className="mt-3 text-slate-500 text-sm max-w-sm mx-auto">{message}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-4 inline-block bg-bimbi-sky hover:bg-blue-800 text-white font-bold text-sm px-5 py-2.5 rounded-md transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

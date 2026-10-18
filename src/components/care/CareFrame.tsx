import type { ReactNode } from "react";
import { useAppStore } from "@/stores/appStore";
export function CareFrame({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: ReactNode;
}) {
  const setPage = useAppStore((s) => s.setPage);
  const page = useAppStore((s) => s.currentPage);
  return (
    <div className="max-w-4xl mx-auto px-5 py-8 pb-28">
      {page !== "discover" && (
        <button
          onClick={() =>
            setPage(
              ["growth", "health", "interests"].includes(page)
                ? "child-profile"
                : "discover",
            )
          }
          className="text-clay underline text-sm mb-6"
        >
          ←{" "}
          {["growth", "health", "interests"].includes(page)
            ? "Child profile"
            : "Discover"}
        </button>
      )}
      <h1 className="font-heading text-4xl mb-4">{title}</h1>
      <p className="text-slate-600 max-w-2xl leading-relaxed mb-8">{intro}</p>
      {children}
    </div>
  );
}
export function CareError({
  error,
  reload,
}: {
  error: string;
  reload: () => void;
}) {
  return error ? (
    <div role="alert" className="border border-clay p-4 rounded-xl mb-5">
      <p>{error}</p>
      <button className="underline mt-2" onClick={reload}>
        Reload saved records (discards unsaved changes)
      </button>
    </div>
  ) : null;
}
export const fieldClass =
  "block w-full mt-2 rounded-xl border border-slate-300 bg-paper p-3 text-slate-850";
export const buttonClass =
  "rounded-full bg-clay px-5 py-3 text-white disabled:opacity-50";

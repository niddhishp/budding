import { useShop } from "./useShop";
export function FinancialPartners() {
  const { data, error, reload } = useShop();
  return (
    <section className="border-t mt-8 pt-6">
      <h2 className="font-heading text-2xl">When you want professional help</h2>
      <p className="text-sm text-slate-600 mt-3">
        Financial referral partners appear here only after a separate review.
        This directory is not a recommendation based on your goals or a promise
        of returns. Your child’s details and savings are never sent with a link.
      </p>
      {error ? (
        <p role="alert" className="text-sm mt-3">
          The partner directory is unavailable.{" "}
          <button className="underline" onClick={() => void reload()}>
            Retry
          </button>
        </p>
      ) : !data ? (
        <p className="text-sm mt-3">Loading partner directory…</p>
      ) : data.partners.length === 0 ? (
        <p className="text-sm mt-4">
          No financial referral partners are active yet. Your planner works
          independently.
        </p>
      ) : (
        data.partners.map((p) => (
          <article key={p.id} className="py-5 border-b">
            <h3 className="font-heading text-xl">{p.title}</h3>
            <p className="mt-2">{p.description}</p>
            <p className="text-sm mt-2">Registration: {p.registration}</p>
            <p className="text-sm mt-3">{p.disclosure}</p>
            <a
              className="inline-block text-clay underline mt-3"
              href={p.url}
              target="_blank"
              rel="sponsored noopener noreferrer"
            >
              Visit partner (referral link) ↗
            </a>
          </article>
        ))
      )}
    </section>
  );
}

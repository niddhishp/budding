import Link from "next/link";

/** One honest, visible explanation of how guidance is made, used instead of scattered fine print. */
export function GuidanceTrust({ className = "" }: { className?: string }) {
  return <details className={`rounded-2xl border border-slate-200 px-5 py-3 ${className}`}>
    <summary className="cursor-pointer py-2 font-medium text-slate-800">How Kahiye writes this guidance</summary>
    <ul className="mt-2 mb-3 space-y-2 text-sm leading-6 text-slate-700 list-disc pl-5">
      <li>Handbook conversations are drafted with AI assistance from published sources, linked on each card.</li>
      <li>Ask answers are written by AI for your situation, then checked automatically for safety, diagnosis and harsh discipline before you see them.</li>
      <li>Worrying messages go straight to help numbers instead of ordinary advice, and never use your allowance.</li>
      <li>Independent clinical and safeguarding review has not happened yet. We will name the reviewers when it does.</li>
    </ul>
    <Link href="/editorial" className="inline-block text-sm text-clay underline py-2">Read our editorial approach</Link>
  </details>;
}

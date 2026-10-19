"use client";
import Link from "next/link";
import { useState } from "react";
import { ARTICLES, readingMinutes } from "@/data/articles";
export function ArticleLibrary() {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("All");
  const matches = ARTICLES.filter(
    (a) =>
      (category === "All" || a.category === category) &&
      `${a.title} ${a.summary} ${a.age} ${a.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <div className="grid sm:grid-cols-[1fr_220px] gap-4 my-8">
        <label>
          Find a guide
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Try periods, safety or sleep"
            className="block w-full bg-paper border border-slate-300 rounded-xl p-3 mt-2"
          />
        </label>
        <label>
          Topic
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full bg-paper border border-slate-300 rounded-xl p-3 mt-2"
          >
            {["All", ...new Set(ARTICLES.map((a) => a.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <p role="status" className="text-sm text-slate-600 mb-6">
        {matches.length} {matches.length === 1 ? "guide" : "guides"} · Start
        wherever you are today.
      </p>
      <div className="divide-y divide-slate-200">
        {matches.map((a) => (
          <article
            key={a.slug}
            className="py-7 grid sm:grid-cols-[150px_1fr] gap-3"
          >
            <div className="text-sm text-clay">
              {a.category}
              <span className="block text-slate-500 mt-1">
                {readingMinutes(a)} min read
              </span>
            </div>
            <div>
              <h2 className="font-heading text-2xl">
                <Link
                  className="hover:text-clay underline decoration-clay/30 underline-offset-4"
                  href={`/articles/${a.slug}`}
                >
                  {a.title}
                </Link>
              </h2>
              <p className="text-slate-600 mt-3 leading-relaxed">{a.summary}</p>
              <p className="text-xs text-slate-500 mt-3">{a.age}</p>
            </div>
          </article>
        ))}
      </div>
      {!matches.length && (
        <p className="py-12">
          No matching guides. Try another word or choose All topics.
        </p>
      )}
    </>
  );
}

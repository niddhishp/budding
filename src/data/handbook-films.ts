// Founder-made short films that act out a Handbook situation. Add an entry keyed by the card id once a film is
// finished and reviewed; cards without one render exactly as before. Only Vimeo and YouTube links are embedded.
export type HandbookFilm = { url: string; title: string; minutes: number };
export const HANDBOOK_FILMS: Record<string, HandbookFilm> = {};

/** A privacy-friendly embed address for an allowed host, or null for anything else. */
export function filmEmbed(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "");
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const [id, hash] = u.pathname.split("/").filter(p => p && p !== "video");
    if (!/^\d+$/.test(id ?? "")) return null;
    const h = u.searchParams.get("h") ?? (hash && /^[a-f0-9]+$/.test(hash) ? hash : null);
    return `https://player.vimeo.com/video/${id}?dnt=1${h ? `&h=${h}` : ""}`;
  }
  const yt = host === "youtu.be" ? u.pathname.slice(1) : (host === "youtube.com" || host === "m.youtube.com") ? u.searchParams.get("v") : null;
  return yt && /^[\w-]{11}$/.test(yt) ? `https://www.youtube-nocookie.com/embed/${yt}` : null;
}

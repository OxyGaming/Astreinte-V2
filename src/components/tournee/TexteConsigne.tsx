import { parseTexte, type Segment } from "@/lib/tournee/texte";

function Segments({ segments }: { segments: Segment[] }) {
  return (
    <>
      {segments.map((s, i) => (s.bold ? <strong key={i}>{s.text}</strong> : <span key={i}>{s.text}</span>))}
    </>
  );
}

/** Rendu du mini-format des consignes (puces, sous-puces, gras). */
export default function TexteConsigne({ texte, className = "" }: { texte: string; className?: string }) {
  const lignes = parseTexte(texte);
  if (!lignes.length) return null;
  return (
    <div className={`space-y-1 text-sm leading-relaxed ${className}`}>
      {lignes.map((l, i) =>
        l.kind === "p" ? (
          <p key={i}>
            <Segments segments={l.segments} />
          </p>
        ) : (
          <div key={i} className={`flex gap-2 ${l.level === 2 ? "pl-6" : "pl-1"}`}>
            <span className="flex-shrink-0 select-none opacity-60">{l.level === 2 ? "–" : "•"}</span>
            <span>
              <Segments segments={l.segments} />
            </span>
          </div>
        ),
      )}
    </div>
  );
}

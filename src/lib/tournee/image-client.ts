/**
 * Redimensionnement client des photos avant envoi (module client-only).
 * Sortie JPEG ≤ 1600 px : léger sur le réseau terrain, et embarquable tel
 * quel dans les PDF générés (react-pdf ne lit ni HEIC ni WebP).
 */

export async function resizeImage(file: File, maxDim = 1600, quality = 0.82): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Image illisible (format non pris en charge ?)"));
      i.src = url;
    });
    const ratio = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * ratio);
    const h = Math.round(img.naturalHeight * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas indisponible");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) throw new Error("Conversion de l'image impossible");
    const name = (file.name || "photo").replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Source d'image (même URL que le précache hors ligne du service worker). */
export const photoUrl = (id: string) => `/api/documents/${id}/download`;
/** Ouverture dans un onglet (affichage plutôt que téléchargement). */
export const photoOpenUrl = (id: string) => `/api/documents/${id}/download?inline=1`;

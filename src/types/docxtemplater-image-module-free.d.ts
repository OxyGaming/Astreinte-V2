// `docxtemplater-image-module-free` ne fournit pas de typages.
// Déclaration minimale pour l'incrustation des photos dans le .docx RCI
// (cf. src/lib/rci/render.ts et src/app/rci/poc/RciPocClient.tsx).
declare module "docxtemplater-image-module-free" {
  interface ImageModuleOptions {
    centered?: boolean;
    getImage: (tagValue: string, tagName: string) => Buffer | ArrayBuffer | Uint8Array;
    getSize: (
      img: Buffer | ArrayBuffer | Uint8Array,
      tagValue: string,
      tagName: string
    ) => [number, number];
  }
  export default class ImageModule {
    constructor(options: ImageModuleOptions);
  }
}

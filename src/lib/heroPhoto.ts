import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export interface InlineHero {
  /** `data:image/avif;base64,...` for a real <img> inlined once in the HTML (SOP first-frame §3). */
  src: string;
  width: number;
  height: number;
  bytes: number;
}

interface Options {
  /** Source file, relative to the project root. */
  file: string;
  /** Crop box in the source image. */
  crop: { left: number; top: number; width: number; height: number };
  /** Output width in px (about 1280 for a full-bleed desktop hero). */
  width: number;
  quality?: number;
}

/** Crops, bakes in grayscale and encodes one AVIF at build time. Called once per page that has a photo hero. */
export async function inlineHeroAvif({ file, crop, width, quality = 60 }: Options): Promise<InlineHero> {
  const input = await readFile(path.resolve(file));
  const { data, info } = await sharp(input)
    .extract(crop)
    .resize({ width })
    .grayscale()
    .avif({ quality, effort: 9 })
    .toBuffer({ resolveWithObject: true });
  return {
    src: `data:image/avif;base64,${data.toString("base64")}`,
    width: info.width,
    height: info.height,
    bytes: data.length,
  };
}

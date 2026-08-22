import { Resvg } from "@resvg/resvg-js";
import { mkdir } from "node:fs/promises";

const OUT_DIR = "app/frontend/public/icons";

const targets: Array<{ src: string; out: string; size: number }> = [
  { src: "assets/images/outpost-compass.svg", out: "icon-192.png", size: 192 },
  { src: "assets/images/outpost-compass.svg", out: "icon-512.png", size: 512 },
  {
    src: "assets/images/outpost-compass-maskable.svg",
    out: "icon-512-maskable.png",
    size: 512,
  },
  {
    src: "assets/images/outpost-compass-maskable.svg",
    out: "apple-touch-icon.png",
    size: 180,
  },
];

await mkdir(OUT_DIR, { recursive: true });

for (const { src, out, size } of targets) {
  const svg = await Bun.file(src).text();
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: size } });
  const png = resvg.render().asPng();
  await Bun.write(`${OUT_DIR}/${out}`, png);
  console.log(`wrote ${OUT_DIR}/${out} (${size}x${size})`);
}

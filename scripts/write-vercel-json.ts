import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildVercelConfig } from "../src/data/vercelConfig";

const target = fileURLToPath(new URL("../vercel.json", import.meta.url));
writeFileSync(target, `${JSON.stringify(buildVercelConfig(), null, 2)}\n`);
console.log(`Wrote ${target}`);

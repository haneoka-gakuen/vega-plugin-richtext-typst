import { readFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";

const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));

if (!manifest.repository?.url?.endsWith("/vega-plugin-richtext-typst.git")) {
  throw new Error("package repository must point to the independent Typst plugin repository");
}
if (manifest.publishConfig?.access !== "public" || manifest.publishConfig?.provenance !== true) {
  throw new Error("public provenance publishing is required");
}
if (!manifest.vega?.formats?.includes("typst") || !manifest.vega?.formats?.includes("typ")) {
  throw new Error("Typst format metadata is required");
}
if (
  manifest.dependencies?.["@myriaddreamin/typst.ts"] !== "0.7.0" ||
  manifest.dependencies?.["@myriaddreamin/typst-ts-renderer"] !== "0.7.0" ||
  manifest.dependencies?.["@myriaddreamin/typst-ts-web-compiler"] !== "0.7.0" ||
  manifest.dependencies?.dompurify !== "3.4.12"
) {
  throw new Error("audited renderer dependencies must remain pinned");
}

for (const [packageName, name] of [
  ["typst-ts-web-compiler", "typst_ts_web_compiler_bg"],
  ["typst-ts-renderer", "typst_ts_renderer_bg"],
]) {
  const packed = await readFile(new URL(`../dist/${name}.wasm.gz`, import.meta.url));
  const source = await readFile(
    new URL(`../node_modules/@myriaddreamin/${packageName}/pkg/${name}.wasm`, import.meta.url),
  );
  if (packed.byteLength > 25 * 1024 ** 2 || !gunzipSync(packed).equals(source))
    throw new Error(`Invalid compressed runtime: ${name}`);
}
process.stdout.write("Typst rich-text package boundary verified\n");

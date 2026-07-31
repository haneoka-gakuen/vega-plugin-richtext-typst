import { readFile } from "node:fs/promises";

const manifest = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

if (!manifest.repository?.url?.endsWith("/vega-plugin-richtext-typst.git")) {
  throw new Error(
    "package repository must point to the independent Typst plugin repository",
  );
}
if (
  manifest.publishConfig?.access !== "public" ||
  manifest.publishConfig?.provenance !== true
) {
  throw new Error("public provenance publishing is required");
}
if (
  !manifest.vega?.formats?.includes("typst") ||
  !manifest.vega?.formats?.includes("typ")
) {
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

process.stdout.write("Typst rich-text package boundary verified\n");

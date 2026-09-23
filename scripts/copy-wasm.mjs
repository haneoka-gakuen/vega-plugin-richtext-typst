import { copyFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const assets = [
  [
    new URL("../node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm", import.meta.url),
    new URL("../dist/typst_ts_web_compiler_bg.wasm", import.meta.url),
  ],
  [
    new URL("../node_modules/@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm", import.meta.url),
    new URL("../dist/typst_ts_renderer_bg.wasm", import.meta.url),
  ],
];

for (const [source, destination] of assets) {
  await mkdir(dirname(fileURLToPath(destination)), { recursive: true });
  await copyFile(source, destination);
}

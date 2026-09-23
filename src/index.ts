import createDOMPurify from "dompurify";
import { defineVegaPlugin, type VegaPlugin } from "@haneoka/vega/plugin";
import {
  VEGA_RICH_TEXT_SERVICE,
  type VegaRichTextRenderRequest,
  type VegaRichTextRenderer,
} from "@haneoka/vega-plugin-richtext";

export interface TypstSvgCompiler {
  renderSvg(source: string, signal: AbortSignal): Promise<string>;
}

export interface TypstRichTextOptions {
  readonly compiler?: TypstSvgCompiler;
}

let browserWasmReady: Promise<void> | undefined;

const prepareBrowserWasm = async (typst: typeof import("@myriaddreamin/typst.ts").$typst): Promise<void> => {
  if (typeof window === "undefined") return;
  browserWasmReady ??= Promise.resolve().then(() => {
    const compiler = new URL("./typst_ts_web_compiler_bg.wasm", import.meta.url);
    const renderer = new URL("./typst_ts_renderer_bg.wasm", import.meta.url);
    typst.setCompilerInitOptions({
      getModule: () => compiler,
    });
    typst.setRendererInitOptions({
      getModule: () => renderer,
    });
  });
  await browserWasmReady;
};

const throwIfAborted = (signal: AbortSignal): void => {
  signal.throwIfAborted();
};

const FORBIDDEN_SVG_ELEMENTS = new Set(["script", "style", "foreignobject", "iframe", "object", "embed"]);

export const typstTsCompiler: TypstSvgCompiler = Object.freeze({
  async renderSvg(source: string, signal: AbortSignal): Promise<string> {
    throwIfAborted(signal);
    const { $typst } = await import("@myriaddreamin/typst.ts");
    await prepareBrowserWasm($typst);
    throwIfAborted(signal);
    const svg = await $typst.svg({
      mainContent: `#set page(width: auto, height: auto, margin: 0pt)\n` + `#set text(size: 22pt)\n${source}`,
    });
    throwIfAborted(signal);
    return svg;
  },
});

const removeExternalReferences = (root: SVGSVGElement): void => {
  for (const element of [...root.querySelectorAll("*")]) {
    if (FORBIDDEN_SVG_ELEMENTS.has(element.localName.toLowerCase())) {
      element.remove();
    }
  }
  for (const element of [root, ...root.querySelectorAll("*")]) {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name === "style" || name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if ((name === "href" || name === "xlink:href") && !attribute.value.trim().startsWith("#")) {
        element.removeAttribute(attribute.name);
      }
    }
  }
};

const sanitizeSvg = (document: Document, markup: string): SVGSVGElement => {
  const window = document.defaultView;
  if (!window) throw new Error("Typst rich text requires a DOM window");
  // typst.ts includes browser helpers containing HTML entities such as
  // `&nbsp;`. The browser's strict XML parser rejects those before DOMPurify
  // can remove the helper script, so parse inertly as HTML and select the SVG.
  const parsed = new window.DOMParser().parseFromString(markup, "text/html");
  const parsedRoot = parsed.body.querySelector("svg");
  if (!parsedRoot) {
    throw new TypeError("Typst compiler output must contain one SVG root");
  }

  const purifier = createDOMPurify(window);
  const sanitized = purifier.sanitize(parsedRoot.outerHTML, {
    RETURN_DOM_FRAGMENT: true,
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ["use"],
    ADD_ATTR: ["href", "xlink:href"],
    FORBID_TAGS: ["script", "style", "foreignObject", "iframe", "object", "embed"],
    FORBID_ATTR: ["style"],
  }) as unknown as DocumentFragment;
  const sanitizedRoot = sanitized.querySelector("svg");
  if (!sanitizedRoot) {
    throw new TypeError("Typst compiler output was removed during sanitation");
  }
  const root = document.importNode(sanitizedRoot, true) as SVGSVGElement;
  removeExternalReferences(root);
  return root;
};

export const createTypstRichTextRenderer = (options: TypstRichTextOptions = {}): VegaRichTextRenderer => {
  const compiler = options.compiler ?? typstTsCompiler;
  return Object.freeze({
    id: "haneoka-typst",
    formats: ["typst", "typ"],
    async render(request: VegaRichTextRenderRequest) {
      throwIfAborted(request.signal);
      const markup = await compiler.renderSvg(request.source, request.signal);
      throwIfAborted(request.signal);
      const result = sanitizeSvg(request.document, markup);
      throwIfAborted(request.signal);
      return result;
    },
  });
};

export const createTypstRichTextPlugin = (options: TypstRichTextOptions = {}): VegaPlugin =>
  defineVegaPlugin({
    manifest: {
      id: "haneoka.vega-richtext-typst",
      name: "Vega Rich Text — Typst",
      version: "0.1.0",
      apiVersion: 1,
      description: "Lazy, sanitized Typst-to-SVG rich-text renderer",
      dependencies: {
        "haneoka.vega-richtext": "^0.1.0",
      },
      capabilities: ["rich-text"],
    },
    setup(context) {
      const service = context.service(VEGA_RICH_TEXT_SERVICE);
      if (!service) {
        throw new Error("Typst rich text requires haneoka.vega-richtext to be installed first");
      }
      const registration = service.register(createTypstRichTextRenderer(options));
      return { dispose: () => registration.dispose() };
    },
  });

export const typstRichTextPlugin = createTypstRichTextPlugin();

export default typstRichTextPlugin;

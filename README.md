# Vega Rich Text — Typst

Typst renderer for Vega's rich-text service. Typst is loaded only when content
is rendered, compiled to SVG, then sanitized before it reaches the document.

```ts
import typstRichText from "@haneoka/vega-plugin-richtext-typst";

service.render(target, {
  format: "typst",
  source: String.raw`$ integral_0^1 x dif x = 1/2 $`,
});
```

Install `@haneoka/vega-plugin-richtext` before this plugin. Invalid source stays
visible as plain text and is marked as a render error by the service.

Applications may inject a `TypstSvgCompiler` when compilation is hosted in a
worker or another process. The returned SVG is always passed through the same
sanitization boundary.

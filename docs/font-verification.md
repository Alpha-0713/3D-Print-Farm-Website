# Safari font verification · 2026-10-30

The user's existing Safari tab was at `http://localhost:8000/#/`. The earlier in-app preview was `http://127.0.0.1:8048/`. These origins have separate caches and were not treated as interchangeable verification targets.

The process serving port 8000 was confirmed to use the v2.4 project directory. Its font asset returned HTTP 200, Content-Type `font/woff2`, and 352240 bytes. A read-only diagnostic was opened in a separate Safari tab at `http://localhost:8000/tests/font-check.html`; it embeds a freshly loaded production homepage from that same origin.

After versioning the current styles, font and local module graph (`inter-20261030-3`), Safari verified:

- The homepage heading's first computed family is Inter.
- The Inter FontFace reports `loaded`, weights 100–900.
- A canvas glyph sample using that loaded Inter face exactly matches a second face loaded from a fresh, cache-bypassed copy of the bundled Inter file.
- The same glyph sample differs from Arial fallback: Inter width 853.224px versus Arial 911.777px.
- Current homepage heading: 56px, weight 600, letter spacing −1.96px.

This proves the freshly loaded page uses Inter in Safari. It does **not** establish which font was rendered in the user's earlier screenshot or in an already-open tab before reloading. The original tight spacing and weight remain to preserve the layout.

No fonts, dimensions or spacing were changed during this rendering investigation; asset revision URLs and canonical module mappings were added, along with the diagnostic page. Previous follow-up changes removed remaining generic monospace aliases from authored page/test typography. Only Inter is bundled. Browser chrome and operating-system dialogs remain outside the website's font styling.

The 70 Node tests passed again after the cache revision. All 72 canonical local module mappings resolve to existing current source files. Original files were retained under the project's `work/font-render-cache-20261030-133450` folder.

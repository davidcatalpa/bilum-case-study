# Bilum Case Study

A vertical scrollytelling case study of the Bilum Program — a partnership between the Papua New Guinea Department of Implementation and Rural Development (DIRD) and Catalpa International.

## Stack

- Plain HTML / CSS / JS (no build step, no framework)
- [GSAP 3 + ScrollTrigger](https://gsap.com/scrolltrigger/) for scroll-linked animation
- [Lenis](https://github.com/darkroomengineering/lenis) for smooth scrolling
- Editorial serif (Fraunces) + humanist sans (Inter) via Google Fonts
- Progressive enhancement: all content is visible without JS — `.js-enhanced` on `<html>` opts in to hidden-until-revealed behaviour

## Run locally

Because the site uses ES-style imports and CDN scripts, it needs to be served over HTTP (not `file://`).

```bash
# From this directory
python3 -m http.server 8000
# then open http://localhost:8000/
```

Or any equivalent static server (e.g. `npx serve`, `caddy file-server`).

## Structure

```
.
├── index.html        # Semantic 16-chapter markup
├── styles.css        # Design tokens + per-section rules
├── app.js            # GSAP/ScrollTrigger orchestration + Lenis + reveals
└── assets/           # Imagery (hero, approach, brand marks, OG cover)
```

## Sources

Copy and statistics are adapted from:

- *Bilum Final Completion Report* — February 2026
- *DIRD Case Study Report* — November 2025
- *Independent Rapid Review: Bilum Program* — 2025

All pull-quotes are verbatim and attributed inline.

## Design

Editorial palette inspired by the Figma reference at [red-schema-43509685.figma.site](https://red-schema-43509685.figma.site/): warm cream background, deep terracotta accent, charcoal ink, ochre highlights for statistics. Subtle SVG grain overlay for documentary texture.

## Accessibility

- Semantic landmarks (`<main>`, `<section aria-labelledby>`, `<figure>/<figcaption>`)
- Visible skip-to-content link
- `prefers-reduced-motion` honoured — pins and scrubs disabled, fades kept minimal
- Focus rings preserved, quote attribution via `<cite>`
- All imagery has descriptive alt text

## License

© Catalpa International.

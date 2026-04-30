/* =========================================================================
 * Bilum Case Study — scrollytelling orchestration
 * GSAP + ScrollTrigger + Lenis + light IntersectionObserver fallbacks.
 * ========================================================================= */

(function () {
  'use strict';

  const prefersReduced =
    window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) document.documentElement.classList.add('no-motion');

  // Wait for deferred scripts (gsap, lenis) to be present.
  function ready(fn) {
    if (document.readyState === 'complete') fn();
    else window.addEventListener('load', fn, { once: true });
  }

  ready(function () {
    const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);

    // Opt-in to enhanced mode — CSS only hides [data-reveal] when this is set,
    // so if GSAP fails to load the content stays visible (progressive enhancement).
    if (hasGSAP && !prefersReduced) {
      document.documentElement.classList.add('js-enhanced');
    }

    // ---------- Smooth scroll (skip on reduced-motion / touch-first) ----------
    let lenis = null;
    if (!prefersReduced && typeof window.Lenis !== 'undefined') {
      lenis = new Lenis({
        duration: 1.05,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        smoothTouch: false,
      });
      function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
      requestAnimationFrame(raf);
      if (hasGSAP) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.lagSmoothing(0);
      }
    }

    // ---------- Reveal (shared across all sections) ----------
    // Skip any element that has a bespoke section-level animation — prevents
    // double-triggering that would otherwise cause a visible re-hide/re-show.
    const customSelectors = [
      '.compare__col',
      '.compare__list li',
      '.impact .tile',
      '.challenge__stack > *',
      '.rollout__stage',
      '.embed-card',
      '.method__item',
    ];
    const isCustom = (el) => customSelectors.some((s) => el.matches(s));
    const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));
    const genericReveal = revealEls.filter((el) => !isCustom(el));
    const customReveal = revealEls.filter(isCustom);

    // Neutralise [data-reveal] CSS for elements with bespoke tweens so that
    // their subsequent gsap.from() reads a visible baseline as "current".
    if (hasGSAP && !prefersReduced && customReveal.length) {
      gsap.set(customReveal, { autoAlpha: 1, y: 0 });
    }

    if (hasGSAP && !prefersReduced) {
      genericReveal.forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 30 },
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.9,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 85%', once: true },
          }
        );
      });
    } else {
      // IO fallback: just show them
      const io = new IntersectionObserver(
        (entries) => entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.style.opacity = 1;
            e.target.style.transform = 'none';
          }
        }),
        { rootMargin: '0px 0px -10% 0px' }
      );
      revealEls.forEach((el) => io.observe(el));
    }

    // ---------- Headline line-by-line split (manual, no SplitText plugin needed) ----------
    document.querySelectorAll('[data-split]').forEach((node) => {
      // Wrap words in spans for a simple stagger (works on all devices).
      const html = node.innerHTML;
      // Only split the visible text; preserve <em> inner tags.
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      const walker = document.createTreeWalker(tmp, NodeFilter.SHOW_TEXT, null);
      const textNodes = [];
      let n;
      while ((n = walker.nextNode())) textNodes.push(n);
      textNodes.forEach((tn) => {
        const frag = document.createDocumentFragment();
        const parts = tn.nodeValue.split(/(\s+)/);
        parts.forEach((p) => {
          if (/^\s+$/.test(p)) frag.appendChild(document.createTextNode(p));
          else if (p.length) {
            const s = document.createElement('span');
            s.className = 'split-word';
            s.style.display = 'inline-block';
            s.style.willChange = 'transform,opacity';
            s.textContent = p;
            frag.appendChild(s);
          }
        });
        tn.parentNode.replaceChild(frag, tn);
      });
      node.innerHTML = tmp.innerHTML;

      const words = node.querySelectorAll('.split-word');
      if (hasGSAP && !prefersReduced) {
        gsap.fromTo(
          words,
          { yPercent: 110, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            duration: 0.9,
            ease: 'power4.out',
            stagger: 0.035,
            scrollTrigger: { trigger: node, start: 'top 82%', once: true },
          }
        );
      }
    });

    // ---------- Counter tweens ----------
    document.querySelectorAll('[data-counter]').forEach((node) => {
      const end = parseFloat(node.dataset.end || '0');
      const decimals = parseInt(node.dataset.decimals || '0', 10);
      const prefix = node.dataset.prefix || '';
      const suffix = node.dataset.suffix || '';
      const duration = parseFloat(node.dataset.duration || '1.4');
      const obj = { v: 0 };
      const render = () => {
        node.textContent = prefix + obj.v.toFixed(decimals) + suffix;
      };
      render();

      if (hasGSAP && !prefersReduced) {
        gsap.to(obj, {
          v: end,
          duration,
          ease: 'power2.out',
          onUpdate: render,
          scrollTrigger: { trigger: node, start: 'top 85%', once: true },
        });
      } else {
        // Just set final value
        obj.v = end;
        render();
      }
    });

    // ---------- Hero parallax ----------
    if (hasGSAP && !prefersReduced) {
      document.querySelectorAll('[data-parallax]').forEach((el) => {
        const amount = parseFloat(el.dataset.parallax) || 0.1;
        gsap.to(el, {
          yPercent: -amount * 100,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('section'),
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        });
      });
    }

    // ---------- Hero: hand-drawn em underline draw-in ----------
    if (hasGSAP && !prefersReduced) {
      const emPath = document.querySelector('.hero__em-underline path');
      if (emPath) {
        try {
          const len = emPath.getTotalLength();
          emPath.style.strokeDasharray = len;
          emPath.style.strokeDashoffset = len;
          gsap.to(emPath, {
            strokeDashoffset: 0,
            duration: 1.4,
            ease: 'power2.inOut',
            delay: 0.9,
          });
        } catch (e) { /* ignore */ }
      }
    }

    // ---------- Scroll progress rail + active chapter ----------
    const rail = document.querySelector('.rail');
    const railItems = rail ? Array.from(rail.querySelectorAll('.rail__item')) : [];
    const railIndex = new Map(railItems.map((li) => [li.dataset.rail, li]));
    const darkSections = new Set(['hero', 'challenge', 'legacy']);
    const topbar = document.querySelector('.topbar');

    if (rail && hasGSAP) {
      // Progress bar fill (rail + topbar share the same progress value)
      gsap.to(rail, {
        ease: 'none',
        scrollTrigger: {
          start: 0,
          end: 'max',
          scrub: true,
          onUpdate: (self) => {
            const pct = (self.progress * 100).toFixed(2) + '%';
            rail.style.setProperty('--rail-progress', pct);
            if (topbar) topbar.style.setProperty('--topbar-progress', pct);
          },
        },
      });

      // Active dot via ScrollTrigger onToggle
      document.querySelectorAll('section[data-rail]').forEach((section) => {
        const key = section.dataset.rail;
        ScrollTrigger.create({
          trigger: section,
          start: 'top 40%',
          end: 'bottom 40%',
              onToggle: (self) => {
                if (self.isActive) {
                  railItems.forEach((i) => i.classList.remove('is-active'));
                  const item = railIndex.get(key);
                  if (item) item.classList.add('is-active');
                  document.body.classList.toggle('rail-inverted', darkSections.has(key));
                } else if (darkSections.has(key)) {
                  // Leaving a dark section — clear inverted state so the rail
                  // doesn't carry "light on dark" styling into the next cream section.
                  document.body.classList.remove('rail-inverted');
                }
              },
        });
      });
    }

    // ---------- Challenge: stacked quote reveals + background desaturate ----------
    if (hasGSAP && !prefersReduced) {
      const challenge = document.querySelector('.challenge');
      if (challenge) {
        const stacks = challenge.querySelectorAll('.challenge__stack > *');
        gsap.fromTo(
          stacks,
          { opacity: 0, y: 60 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            stagger: 0.12,
            scrollTrigger: { trigger: challenge, start: 'top 65%', once: true },
          }
        );
      }
    }

    // ---------- Challenge: failure-rate trend chart draw-in ----------
    if (hasGSAP && !prefersReduced) {
      const chart = document.querySelector('.challenge__chart');
      if (chart) {
        const line = chart.querySelector('.challenge__chart-line');
        const clipRect = chart.querySelector('.challenge__chart-clip');
        const startDot = chart.querySelector('.challenge__chart-dot--start');
        const endDot = chart.querySelector('.challenge__chart-dot--end');
        const labels = chart.querySelectorAll('text');

        if (line && clipRect) {
          try {
            const len = line.getTotalLength();
            line.style.strokeDasharray = len;
            line.style.strokeDashoffset = len;
            // Hide endpoints until the line lands; start dot rides in with the line head.
            gsap.set([endDot, labels], { opacity: 0 });
            gsap.set(startDot, { opacity: 0, scale: 0, transformOrigin: '20px 82px' });

            const tl = gsap.timeline({
              scrollTrigger: { trigger: chart, start: 'top 80%', once: true },
            });
            tl.to(startDot, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(2)' }, 0)
              .to(line, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut' }, 0)
              .to(clipRect, { attr: { width: 320 }, duration: 1.4, ease: 'power2.inOut' }, 0)
              .to(endDot, { opacity: 1, duration: 0.4, ease: 'back.out(2)' }, 1.25)
              .to(labels, { opacity: 1, duration: 0.5, ease: 'power2.out', stagger: 0.06 }, 0.6);
          } catch (e) { /* ignore */ }
        }
      }
    }

    // ---------- Approach: from/to triptych — row reveal + arrow stroke draw ----------
    if (hasGSAP && !prefersReduced) {
      const shifts = document.querySelector('.approach__shifts');
      if (shifts) {
        const rows = shifts.querySelectorAll('.approach__shift');
        const arrows = shifts.querySelectorAll('.approach__shift-arrow path');
        arrows.forEach((p) => {
          try {
            const len = p.getTotalLength();
            p.style.strokeDasharray = len;
            p.style.strokeDashoffset = len;
          } catch (e) { /* ignore */ }
        });
        const tl = gsap.timeline({
          scrollTrigger: { trigger: shifts, start: 'top 75%', once: true },
        });
        tl.from(rows, {
          opacity: 0,
          y: 18,
          duration: 0.7,
          stagger: 0.18,
          ease: 'power3.out',
        }, 0)
          .to(arrows, {
            strokeDashoffset: 0,
            duration: 0.7,
            stagger: 0.18,
            ease: 'power2.inOut',
          }, 0.1);
      }
    }

    // ---------- Compare: horizontal slide-in + divider draw ----------
    if (hasGSAP && !prefersReduced) {
      const compare = document.querySelector('.compare');
      if (compare) {
        const before = compare.querySelector('.compare__col--before');
        const after = compare.querySelector('.compare__col--after');
        const dividerPaths = compare.querySelectorAll('.compare__divider-svg path');
        const dividerThen = compare.querySelector('.compare__divider-then');
        const dividerNow = compare.querySelector('.compare__divider-now');

        // Prep stroke draw
        dividerPaths.forEach((p) => {
          try {
            const len = p.getTotalLength();
            p.style.strokeDasharray = len;
            p.style.strokeDashoffset = len;
          } catch (e) { /* ignore */ }
        });

        const tl = gsap.timeline({
          scrollTrigger: { trigger: compare, start: 'top 65%', once: true },
        });
        tl.from(before, { xPercent: -6, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0)
          .from(after,  { xPercent:  6, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.08)
          .to(dividerPaths, { strokeDashoffset: 0, duration: 0.9, ease: 'power2.inOut', stagger: 0.1 }, 0.3)
          .from([dividerThen, dividerNow].filter(Boolean), { opacity: 0, y: 6, duration: 0.5, ease: 'power2.out', stagger: 0.1 }, 0.7);

        gsap.from(compare.querySelectorAll('.compare__list li'), {
          opacity: 0, y: 16, stagger: 0.08, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: compare, start: 'top 55%', once: true },
        });
      }
    }

    // ---------- Shift: paper → spreadsheet → dashboard morph on scroll ----------
    if (hasGSAP && !prefersReduced) {
      const shift = document.querySelector('.shift__visual');
      if (shift) {
        const paper = shift.querySelector('[data-morph="paper"]');
        const sheet = shift.querySelector('[data-morph="grid"]');
        const chart = shift.querySelector('[data-morph="chart"]');
        const bars = shift.querySelectorAll('.shift__bar');
        const polyline = shift.querySelector('[data-morph="chart"] polyline');
        const kpiTile = chart && chart.querySelectorAll('g')[0];

        gsap.set(sheet, { opacity: 0, scale: 0.96, transformOrigin: 'center' });
        gsap.set(chart, { opacity: 0, scale: 0.96, transformOrigin: 'center' });
        gsap.set(bars, { scaleY: 0, transformOrigin: 'bottom' });
        gsap.set(polyline, { opacity: 0 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: shift,
            start: 'top 75%',
            end: 'bottom 40%',
            scrub: 0.7,
          },
        });
        // Paper → Sheet
        tl.to(paper, { opacity: 0, y: -14, duration: 0.6, ease: 'power1.in' }, 0)
          .to(sheet, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 0.2)
        // Sheet → Dashboard
          .to(sheet, { opacity: 0, scale: 1.04, duration: 0.5, ease: 'power1.in' }, 1.2)
          .to(chart, { opacity: 1, scale: 1, duration: 0.7, ease: 'power2.out' }, 1.4)
          .to(bars,  { scaleY: 1, duration: 0.8, ease: 'power2.out', stagger: 0.06 }, 1.7)
          .to(polyline, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 2.2);
      }
    }

    // ---------- Impact tiles: stagger rise ----------
    if (hasGSAP && !prefersReduced) {
      const tiles = document.querySelectorAll('.impact .tile');
      if (tiles.length) {
        gsap.from(tiles, {
          opacity: 0, y: 40, duration: 0.9, ease: 'power3.out', stagger: 0.1,
          scrollTrigger: { trigger: '.impact__grid', start: 'top 75%', once: true },
        });
      }
    }

    // ---------- Rollout: dotted line draw + stage nodes pop-in ----------
    if (hasGSAP && !prefersReduced) {
      const rolloutPath = document.querySelector('.rollout__path-line');
      if (rolloutPath) {
        try {
          const length = rolloutPath.getTotalLength();
          rolloutPath.style.strokeDasharray = length;
          rolloutPath.style.strokeDashoffset = length;
          gsap.to(rolloutPath, {
            strokeDashoffset: 0,
            ease: 'none',
            scrollTrigger: {
              trigger: '.rollout__path',
              start: 'top 70%',
              end: 'bottom 50%',
              scrub: 0.8,
            },
          });
        } catch (e) { /* ignore if path not ready */ }
      }

      gsap.from('.rollout__stage', {
        y: 40, opacity: 0, duration: 0.7, ease: 'power3.out', stagger: 0.15,
        scrollTrigger: { trigger: '.rollout__stages', start: 'top 70%', once: true },
      });
    }

    // ---------- Engagement: big number already handled by counter; bar widths ----------
    const bar = document.querySelector('.engagement__bar');
    if (bar) {
      const segs = bar.querySelectorAll('.engagement__bar-seg');
      const fill = () => {
        segs.forEach((s) => { s.style.width = (s.dataset.width || '0') + '%'; });
        bar.classList.add('is-engagement-filled');
      };
      if (hasGSAP) {
        ScrollTrigger.create({
          trigger: bar, start: 'top 80%', once: true, onEnter: fill,
        });
      } else {
        const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { fill(); io.disconnect(); } }), { threshold: 0.2 });
        io.observe(bar);
      }
    }

    // ---------- Embedding cards: lift + SVG arrow draw-in ----------
    if (hasGSAP && !prefersReduced) {
      const cards = document.querySelectorAll('.embed-card');
      if (cards.length) {
        gsap.from(cards, {
          y: 40, opacity: 0, rotationX: 8, transformOrigin: '50% 100%', duration: 0.9,
          ease: 'power3.out', stagger: 0.15,
          scrollTrigger: { trigger: '.embedding__cards', start: 'top 75%', once: true },
        });

        const arrowPaths = document.querySelectorAll('.embed-card__arrow path');
        arrowPaths.forEach((p) => {
          try {
            const len = p.getTotalLength();
            p.style.strokeDasharray = len;
            p.style.strokeDashoffset = len;
          } catch (e) { /* ignore */ }
        });
        gsap.to(arrowPaths, {
          strokeDashoffset: 0,
          duration: 0.7,
          ease: 'power2.inOut',
          stagger: 0.12,
          scrollTrigger: { trigger: '.embedding__cards', start: 'top 65%', once: true },
        });
      }
    }

    // ---------- Method sticky + list items reveal in sequence ----------
    if (hasGSAP && !prefersReduced) {
      gsap.from('.method__item', {
        y: 30, opacity: 0, duration: 0.8, ease: 'power3.out', stagger: 0.2,
        scrollTrigger: { trigger: '.method__list', start: 'top 75%', once: true },
      });
    }

    // ---------- Coda video: click-to-load YouTube facade ----------
    // Avoids loading the YouTube player on every page view; only fetched on intent.
    const codaFacade = document.querySelector('.coda__facade');
    if (codaFacade) {
      const activate = () => {
        const id = codaFacade.dataset.videoId;
        if (!id) return;
        const title = codaFacade.dataset.videoTitle || 'Video';
        const iframe = document.createElement('iframe');
        iframe.className = 'coda__iframe';
        iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`;
        iframe.title = title;
        iframe.loading = 'lazy';
        iframe.allowFullscreen = true;
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
        iframe.setAttribute('frameborder', '0');
        codaFacade.replaceWith(iframe);
        try { iframe.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      };
      codaFacade.addEventListener('click', activate);
      codaFacade.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
      });
    }

    // ---------- Topbar fallback (when GSAP/Lenis aren't present) ----------
    if (!hasGSAP && topbar) {
      const update = () => {
        const docH = document.documentElement.scrollHeight - window.innerHeight;
        const pct = docH > 0 ? Math.min(100, Math.max(0, (window.scrollY / docH) * 100)) : 0;
        topbar.style.setProperty('--topbar-progress', pct.toFixed(2) + '%');
      };
      update();
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update);
    }

    // ---------- Back-to-top button ----------
    const topBtn = document.querySelector('[data-totop]');
    if (topBtn) {
      topBtn.addEventListener('click', () => {
        if (lenis) lenis.scrollTo(0, { duration: 1.4 });
        else window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // ---------- Refresh on fonts-ready to re-measure pinned triggers ----------
    if (document.fonts && document.fonts.ready && hasGSAP) {
      document.fonts.ready.then(() => ScrollTrigger.refresh());
    }
  });
})();

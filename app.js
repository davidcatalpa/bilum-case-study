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

    // ---------- Scroll progress rail + active chapter ----------
    const rail = document.querySelector('.rail');
    const railItems = rail ? Array.from(rail.querySelectorAll('.rail__item')) : [];
    const railIndex = new Map(railItems.map((li) => [li.dataset.rail, li]));
    const darkSections = new Set(['hero', 'challenge', 'legacy']);

    if (rail && hasGSAP) {
      // Progress bar fill
      gsap.to(rail, {
        ease: 'none',
        scrollTrigger: {
          start: 0,
          end: 'max',
          scrub: true,
          onUpdate: (self) => {
            rail.style.setProperty('--rail-progress', (self.progress * 100).toFixed(2) + '%');
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

    // ---------- Compare: horizontal slide-in + divider draw ----------
    if (hasGSAP && !prefersReduced) {
      const compare = document.querySelector('.compare');
      if (compare) {
        const before = compare.querySelector('.compare__col--before');
        const after = compare.querySelector('.compare__col--after');
        const arrow = compare.querySelector('.compare__divider-arrow');
        const tl = gsap.timeline({
          scrollTrigger: { trigger: compare, start: 'top 65%', once: true },
        });
        tl.from(before, { xPercent: -6, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0)
          .from(after,  { xPercent:  6, opacity: 0, duration: 0.9, ease: 'power3.out' }, 0.08)
          .from(arrow,  { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(2)' }, 0.35);

        gsap.from(compare.querySelectorAll('.compare__list li'), {
          opacity: 0, y: 16, stagger: 0.08, duration: 0.6, ease: 'power2.out',
          scrollTrigger: { trigger: compare, start: 'top 55%', once: true },
        });
      }
    }

    // ---------- Shift: paper → chart morph on scroll ----------
    if (hasGSAP && !prefersReduced) {
      const shift = document.querySelector('.shift__visual');
      if (shift) {
        const paper = shift.querySelector('[data-morph="paper"]');
        const chart = shift.querySelector('[data-morph="chart"]');
        const bars = shift.querySelectorAll('[data-morph="chart"] rect');
        const polyline = shift.querySelector('[data-morph="chart"] polyline');

        gsap.set(chart, { opacity: 0, scale: 0.96, transformOrigin: 'center' });
        gsap.set(bars, { scaleY: 0, transformOrigin: 'bottom' });
        gsap.set(polyline, { opacity: 0 });

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: shift,
            start: 'top 70%',
            end: 'bottom 40%',
            scrub: 0.6,
          },
        });
        tl.to(paper, { opacity: 0, y: -10, duration: 1, ease: 'power1.in' })
          .to(chart, { opacity: 1, scale: 1, duration: 1, ease: 'power2.out' }, 0.3)
          .to(bars,  { scaleY: 1, duration: 1, ease: 'power2.out', stagger: 0.08 }, 0.5)
          .to(polyline, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 1.3);
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
      const fill = () => segs.forEach((s) => { s.style.width = (s.dataset.width || '0') + '%'; });
      if (hasGSAP) {
        ScrollTrigger.create({
          trigger: bar, start: 'top 80%', once: true, onEnter: fill,
        });
      } else {
        const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { fill(); io.disconnect(); } }), { threshold: 0.2 });
        io.observe(bar);
      }
    }

    // ---------- Embedding cards: lift + arrow sweep ----------
    if (hasGSAP && !prefersReduced) {
      const cards = document.querySelectorAll('.embed-card');
      if (cards.length) {
        gsap.from(cards, {
          y: 40, opacity: 0, rotationX: 8, transformOrigin: '50% 100%', duration: 0.9,
          ease: 'power3.out', stagger: 0.15,
          scrollTrigger: { trigger: '.embedding__cards', start: 'top 75%', once: true },
        });
        gsap.from('.embed-card__arrow', {
          opacity: 0, x: -10, duration: 0.6, ease: 'power2.out', stagger: 0.2,
          scrollTrigger: { trigger: '.embedding__cards', start: 'top 70%', once: true },
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

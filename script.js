/* ============================================================
   BEYOND THE MOON — One continuous camera timeline
   Scroll down OR up = same film, reverse / forward
   ============================================================ */

(() => {
  "use strict";

  if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
    console.error("GSAP / ScrollTrigger failed to load.");
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  const state = {
    mouse: { x: 0, y: 0 },
    cursor: { x: 0, y: 0, rx: 0, ry: 0 },
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    isTouch: window.matchMedia("(hover: none), (pointer: coarse)").matches,
  };

  let lenis = null;
  let rafId = null;

  /* ============================================================
     LENIS
     ============================================================ */
  function initLenis() {
    if (typeof Lenis === "undefined" || state.reducedMotion) return;
    lenis = new Lenis({
      duration: 0.45,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 2.4,
      touchMultiplier: 2.2,
      syncTouch: true,
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /** Full journey auto-scroll for ~30s video capture — effects stay scrub-linked */
  function playVideoScroll(seconds = 30) {
    const max = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    );
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      requestAnimationFrame(() => {
        lenis.scrollTo(max, {
          duration: seconds,
          easing: (t) => t,
        });
      });
    } else {
      window.scrollTo(0, 0);
      const start = performance.now();
      const from = 0;
      const step = (now) => {
        const p = Math.min(1, (now - start) / (seconds * 1000));
        window.scrollTo(0, from + (max - from) * p);
        ScrollTrigger.update();
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }
  }

  function initVideoCapture() {
    const params = new URLSearchParams(window.location.search);
    const auto = params.has("video") || params.has("record");

    const btn = document.getElementById("videoPlay");
    btn?.addEventListener("click", () => playVideoScroll(30));

    window.addEventListener("keydown", (e) => {
      if (e.key === "v" || e.key === "V") {
        if (e.target && /input|textarea/i.test(e.target.tagName)) return;
        e.preventDefault();
        playVideoScroll(30);
      }
    });

    if (auto) {
      setTimeout(() => playVideoScroll(30), 600);
    }
  }

  /* ============================================================
     CURSOR
     ============================================================ */
  function initCursor() {
    if (state.isTouch) return;
    const cursor = document.getElementById("cursor");
    const dot = cursor?.querySelector(".cursor__dot");
    const ring = cursor?.querySelector(".cursor__ring");
    if (!cursor || !dot || !ring) return;

    const lerp = (a, b, n) => a + (b - a) * n;
    state.cursor.x = state.cursor.rx = window.innerWidth / 2;
    state.cursor.y = state.cursor.ry = window.innerHeight / 2;

    window.addEventListener(
      "mousemove",
      (e) => {
        state.mouse.x = state.cursor.x = e.clientX;
        state.mouse.y = state.cursor.y = e.clientY;
      },
      { passive: true }
    );

    document.querySelectorAll("[data-cursor='hover'], a, button").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });

    const loop = () => {
      state.cursor.rx = lerp(state.cursor.rx, state.cursor.x, 0.15);
      state.cursor.ry = lerp(state.cursor.ry, state.cursor.y, 0.15);
      dot.style.transform = `translate3d(${state.cursor.x}px, ${state.cursor.y}px, 0)`;
      ring.style.transform = `translate3d(${state.cursor.rx}px, ${state.cursor.ry}px, 0)`;
      rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  /* ============================================================
     STARS / DUST / SHOOTING
     ============================================================ */
  function initStars() {
    const canvas = document.getElementById("starsCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    let w = 0;
    let h = 0;
    let stars = [];
    const parallax = { x: 0, y: 0, scrollY: 0 };
    window.__starParallax = parallax;

    const layers = [
      { count: 160, size: [0.4, 1], speed: 0.15, alpha: [0.25, 0.7] },
      { count: 80, size: [1, 1.8], speed: 0.35, alpha: [0.4, 0.9] },
      { count: 30, size: [1.8, 2.8], speed: 0.55, alpha: [0.5, 1] },
    ];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = [];
      layers.forEach((layer) => {
        for (let i = 0; i < layer.count; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: layer.size[0] + Math.random() * (layer.size[1] - layer.size[0]),
            a: layer.alpha[0] + Math.random() * (layer.alpha[1] - layer.alpha[0]),
            tw: Math.random() * Math.PI * 2,
            twSpeed: 0.01 + Math.random() * 0.03,
            speed: layer.speed,
          });
        }
      });
    }

    function draw(time) {
      ctx.clearRect(0, 0, w, h);
      const mx = (state.mouse.x / w - 0.5) * 20;
      const my = (state.mouse.y / h - 0.5) * 14;
      parallax.x += (mx - parallax.x) * 0.04;
      parallax.y += (my - parallax.y) * 0.04;

      for (const s of stars) {
        let x = s.x + parallax.x * s.speed * 2;
        let y = s.y + parallax.y * s.speed * 2 + parallax.scrollY * s.speed * 0.12;
        y = ((y % h) + h) % h;
        x = ((x % w) + w) % w;
        s.tw += s.twSpeed;
        const alpha = s.a * (0.55 + Math.sin(s.tw + time * 0.001) * 0.45);
        ctx.beginPath();
        ctx.arc(x, y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(248, 244, 227, ${alpha})`;
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }

    window.addEventListener("resize", resize, { passive: true });
    resize();
    requestAnimationFrame(draw);
  }

  function initDust() {
    const layer = document.getElementById("dustLayer");
    if (!layer) return;
    const particles = [];
    const count = state.isTouch ? 22 : 50;
    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "dust-particle";
      layer.appendChild(el);
      particles.push({
        el,
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random(),
        speed: 0.02 + Math.random() * 0.08,
      });
    }
    const update = () => {
      for (const p of particles) {
        p.z += p.speed * 0.008;
        if (p.z > 1) {
          p.z = 0;
          p.x = Math.random() * 100;
          p.y = Math.random() * 100;
        }
        p.el.style.transform = `translate3d(${p.x}vw, ${p.y}vh, 0) scale(${0.3 + p.z * 2.2})`;
        p.el.style.opacity = String(Math.min(1, p.z * 1.4) * 0.7);
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  function initShootingStars() {
    const container = document.getElementById("shootingStars");
    if (!container || state.reducedMotion) return;
    const spawn = () => {
      const star = document.createElement("div");
      star.className = "shooting-star";
      star.style.left = `${10 + Math.random() * 70}%`;
      star.style.top = `${Math.random() * 40}%`;
      container.appendChild(star);
      gsap.fromTo(
        star,
        { opacity: 0, x: 0, y: 0, scaleX: 0.3 },
        {
          opacity: 1,
          x: 220 + Math.random() * 160,
          y: 140 + Math.random() * 80,
          scaleX: 1,
          duration: 0.7,
          ease: "power2.out",
          onComplete: () =>
            gsap.to(star, { opacity: 0, duration: 0.2, onComplete: () => star.remove() }),
        }
      );
      setTimeout(spawn, 2800 + Math.random() * 4000);
    };
    setTimeout(spawn, 1800);
  }

  /* ============================================================
     TEXT SPLIT
     ============================================================ */
  function splitText(el) {
    if (!el || el.dataset.splitDone) return;
    const text = el.textContent.trim();
    el.textContent = "";
    el.setAttribute("aria-label", text);
    text.split(" ").forEach((word, wi, arr) => {
      const wordSpan = document.createElement("span");
      wordSpan.className = "split-word";
      [...word].forEach((char) => {
        const c = document.createElement("span");
        c.className = "split-char";
        c.textContent = char;
        wordSpan.appendChild(c);
      });
      el.appendChild(wordSpan);
      if (wi < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
    el.dataset.splitDone = "1";
  }

  /* ============================================================
     PLANET CARDS
     ============================================================ */
  function initPlanetCards() {
    const card = document.getElementById("planetCard");
    const cardName = document.getElementById("planetName");
    const cardDesc = document.getElementById("planetDesc");
    document.querySelectorAll("[data-planet]").forEach((planet) => {
      const show = () => {
        if (!card) return;
        if (cardName) cardName.textContent = planet.getAttribute("data-planet");
        if (cardDesc) cardDesc.textContent = planet.getAttribute("data-desc") || "";
        card.classList.add("is-visible");
      };
      const hide = () => card?.classList.remove("is-visible");
      planet.addEventListener("mouseenter", show);
      planet.addEventListener("mouseleave", hide);
      planet.addEventListener("click", () => card?.classList.toggle("is-visible") || show());
    });
  }

  /* ============================================================
     MASTER CINEMATIC TIMELINE — one film, fully reversible
     ============================================================ */
  function initCinema() {
    const cinema = document.getElementById("cinema");
    const viewport = document.getElementById("cinemaViewport");
    if (!cinema || !viewport) return;

    const layerHero = document.getElementById("layerHero");
    const layerSurface = document.getElementById("layerSurface");
    const layerLiftoff = document.getElementById("layerLiftoff");
    const layerGalaxy = document.getElementById("layerGalaxy");
    const layerSolar = document.getElementById("layerSolar");
    const layerAsteroids = document.getElementById("layerAsteroids");
    const layerNebula = document.getElementById("layerNebula");
    const layerBinary = document.getElementById("layerBinary");
    const layerSupernova = document.getElementById("layerSupernova");
    const layerBh = document.getElementById("layerBh");
    const layerQuasar = document.getElementById("layerQuasar");
    const layerComet = document.getElementById("layerComet");
    const layerExoplanet = document.getElementById("layerExoplanet");
    const layerAurora = document.getElementById("layerAurora");
    const layerSkies = document.getElementById("layerSkies");
    const layerConstellations = document.getElementById("layerConstellations");
    const layerPaleDot = document.getElementById("layerPaleDot");
    const layerEnding = document.getElementById("layerEnding");

    const moonPortal = document.getElementById("moonPortal");
    const moonRings = document.querySelector(".moon-portal__rings");
    const enterPortal = document.getElementById("enterPortal");
    const moon = document.getElementById("moon");
    const moonImg = document.getElementById("moonImg");
    const moonFlare = document.getElementById("moonFlare");
    const moonBloom = moon?.querySelector(".moon__bloom");
    const crater = moon?.querySelector(".moon__crater-overlay");
    const heroContent = document.getElementById("heroContent");
    const scrollHint = document.getElementById("scrollHint");
    const surfaceStory = document.getElementById("surfaceStory");
    const milkywayBand = document.querySelector(".milkyway__band");
    const milkywayCore = document.querySelector(".milkyway__core");
    const liftoffStory = document.getElementById("liftoffStory");
    const galaxyStory = document.getElementById("galaxyStory");
    const solarStory = document.getElementById("solarStory");
    const solarHint = document.getElementById("solarHint");
    const asteroidsStory = document.getElementById("asteroidsStory");
    const nebulaStory = document.getElementById("nebulaStory");
    const binaryStory = document.getElementById("binaryStory");
    const binaryOrbit = document.getElementById("binaryOrbit");
    const binaryStarA = document.getElementById("binaryStarA");
    const binaryStarB = document.getElementById("binaryStarB");
    const supernovaStory = document.getElementById("supernovaStory");
    const supernovaCore = document.getElementById("supernovaCore");
    const supernovaShock = document.getElementById("supernovaShock");
    const supernovaShock2 = document.getElementById("supernovaShock2");
    const supernovaRays = document.getElementById("supernovaRays");
    const bhStory = document.getElementById("bhStory");
    const quasarStory = document.getElementById("quasarStory");
    const quasarCore = document.getElementById("quasarCore");
    const quasarDisk = document.getElementById("quasarDisk");
    const quasarBeamUp = document.getElementById("quasarBeamUp");
    const quasarBeamDown = document.getElementById("quasarBeamDown");
    const cometStory = document.getElementById("cometStory");
    const cometBody = document.getElementById("cometBody");
    const exoplanetStory = document.getElementById("exoplanetStory");
    const exoPlanet = document.getElementById("exoPlanet");
    const exoStar = document.getElementById("exoStar");
    const exoRing = document.getElementById("exoRing");
    const auroraStory = document.getElementById("auroraStory");
    const aurora1 = document.getElementById("aurora1");
    const aurora2 = document.getElementById("aurora2");
    const aurora3 = document.getElementById("aurora3");
    const skiesStory = document.getElementById("skiesStory");
    const skiesCards = document.querySelectorAll(".skies__card");
    const constellationsStory = document.getElementById("constellationsStory");
    const constelGroups = document.querySelectorAll(".constel");
    const constelLabels = document.querySelectorAll(".constel-label");
    const paleDotStory = document.getElementById("paleDotStory");
    const paleDotEarth = document.getElementById("paleDotEarth");
    const floatLabels = document.querySelectorAll(".float-label");
    const earth = document.getElementById("earth");
    const astronaut = document.getElementById("astronaut");
    const satellite = document.getElementById("satellite");
    const nebula = document.querySelector(".liftoff__nebula");
    const milky = document.querySelector(".layer__full--soft");
    const mars = document.getElementById("flybyMars");
    const jupiter = document.getElementById("flybyJupiter");
    const saturn = document.getElementById("flybySaturn");
    const letters = document.querySelectorAll(".universe-title__letter");
    const solarSystem = document.getElementById("solarSystem");
    const bhDisk = document.getElementById("bhDisk");
    const bhWarp = document.getElementById("bhWarp");
    const bhParticlesEl = document.getElementById("bhParticles");
    const endingMoon = document.getElementById("endingMoon");
    const endingSub = document.querySelector(".ending__sub");
    const endingNote = document.querySelector(".ending__note");
    const endingList = document.querySelector(".ending__list");
    const endingBtn = document.getElementById("exploreAgain");
    const endingChapter = document.querySelector("#endingCopy .story__chapter");

    document.querySelectorAll("[data-split]").forEach(splitText);

    /* Asteroid rocks */
    const asteroidBelt = document.getElementById("asteroidBelt");
    const asteroidRocks = [];
    if (asteroidBelt) {
      const count = state.isTouch ? 18 : 36;
      for (let i = 0; i < count; i++) {
        const r = document.createElement("span");
        r.className = "asteroid-rock";
        const size = 6 + Math.random() * 22;
        r.style.width = `${size}px`;
        r.style.height = `${size * (0.7 + Math.random() * 0.5)}px`;
        r.style.left = `${Math.random() * 100}%`;
        r.style.top = `${10 + Math.random() * 80}%`;
        asteroidBelt.appendChild(r);
        asteroidRocks.push(r);
      }
    }

    /* Nebula infant stars */
    const nebulaCluster = document.getElementById("nebulaCluster");
    const nebulaStars = [];
    if (nebulaCluster) {
      const count = state.isTouch ? 14 : 28;
      for (let i = 0; i < count; i++) {
        const s = document.createElement("span");
        s.className = "nebula-star";
        s.style.left = `${12 + Math.random() * 76}%`;
        s.style.top = `${18 + Math.random() * 64}%`;
        nebulaCluster.appendChild(s);
        nebulaStars.push(s);
      }
    }

    /* Comet sparks */
    const cometSparksEl = document.getElementById("cometSparks");
    const cometSparks = [];
    if (cometSparksEl) {
      const count = state.isTouch ? 10 : 20;
      for (let i = 0; i < count; i++) {
        const s = document.createElement("span");
        s.className = "comet-spark";
        s.style.left = `${10 + Math.random() * 50}%`;
        s.style.top = `${30 + Math.random() * 40}%`;
        cometSparksEl.appendChild(s);
        cometSparks.push(s);
      }
    }

    /* Pale blue dot starfield */
    const paleDotField = document.getElementById("paleDotField");
    const paleStars = [];
    if (paleDotField) {
      const count = state.isTouch ? 40 : 80;
      for (let i = 0; i < count; i++) {
        const s = document.createElement("span");
        s.className = "paledot-star";
        s.style.left = `${Math.random() * 100}%`;
        s.style.top = `${Math.random() * 100}%`;
        s.style.opacity = String(0.25 + Math.random() * 0.6);
        paleDotField.appendChild(s);
        paleStars.push(s);
      }
    }

    /* Black-hole particles */
    const bhParts = [];
    if (bhParticlesEl) {
      const n = state.isTouch ? 18 : 36;
      for (let i = 0; i < n; i++) {
        const p = document.createElement("span");
        p.className = "bh-particle";
        p.style.left = "50%";
        p.style.top = "50%";
        bhParticlesEl.appendChild(p);
        const angle = Math.random() * Math.PI * 2;
        const dist = 120 + Math.random() * 220;
        gsap.set(p, {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          opacity: 0.85,
          scale: 1,
        });
        bhParts.push(p);
      }
    }

    const hiddenLayers = [
      layerLiftoff,
      layerGalaxy,
      layerSolar,
      layerAsteroids,
      layerNebula,
      layerBinary,
      layerSupernova,
      layerBh,
      layerQuasar,
      layerComet,
      layerExoplanet,
      layerAurora,
      layerSkies,
      layerConstellations,
      layerPaleDot,
      layerEnding,
    ];

    /* Layer stack: expanding circle sits ABOVE the moon */
    gsap.set(hiddenLayers, { opacity: 0, visibility: "hidden" });
    gsap.set(layerHero, { opacity: 1, visibility: "visible", zIndex: 5 });
    gsap.set(layerSurface, { opacity: 1, visibility: "visible", zIndex: 6 });
    if (enterPortal) {
      gsap.set(enterPortal, {
        scale: 0,
        xPercent: -50,
        yPercent: -50,
        transformOrigin: "center center",
      });
    }
    gsap.set(moonPortal, { scale: 1, opacity: 1, filter: "blur(0px)", rotate: 0 });
    gsap.set(moon, { scale: 1, opacity: 1, rotate: 0 });
    gsap.set(moonRings, { opacity: 1, scale: 1 });
    gsap.set(moonImg, { rotation: 0 });
    gsap.set(moonBloom, { opacity: 0.85, scale: 1 });
    gsap.set(crater, { opacity: 0 });
    gsap.set(moonFlare, { opacity: 0, x: 0, y: 0 });
    gsap.set([milkywayBand, milkywayCore], { opacity: 0.55, scale: 0.92 });
    gsap.set(
      [surfaceStory, liftoffStory, solarStory, solarHint, cometStory, exoplanetStory],
      { opacity: 0, y: 28 }
    );
    gsap.set(
      [
        galaxyStory,
        bhStory,
        skiesStory,
        nebulaStory,
        constellationsStory,
        asteroidsStory,
        binaryStory,
        supernovaStory,
        quasarStory,
        auroraStory,
        paleDotStory,
      ],
      { opacity: 0 }
    );
    gsap.set(skiesCards, { opacity: 0, y: 24 });
    gsap.set(asteroidRocks, { opacity: 0, scale: 0.4 });
    gsap.set(nebulaStars, { opacity: 0, scale: 0 });
    gsap.set(binaryOrbit, { rotation: 0 });
    gsap.set(binaryStarA, { x: 110, y: 0 });
    gsap.set(binaryStarB, { x: -90, y: 20 });
    gsap.set([supernovaCore, supernovaShock, supernovaShock2, supernovaRays], {
      scale: 0.2,
      opacity: 0,
    });
    gsap.set([quasarCore, quasarDisk], { scale: 0.4, opacity: 0 });
    gsap.set([quasarBeamUp, quasarBeamDown], { scaleY: 0, opacity: 0 });
    gsap.set(cometBody, { opacity: 0, x: -80, y: 40, scale: 0.7 });
    gsap.set(cometSparks, { opacity: 0 });
    gsap.set(exoPlanet, { opacity: 0, x: -40, scale: 0.8 });
    gsap.set(exoStar, { opacity: 0, scale: 0.6 });
    gsap.set(exoRing, { opacity: 0, scale: 0.8 });
    gsap.set([aurora1, aurora2, aurora3], { opacity: 0, y: 40 });
    gsap.set(constelGroups, { opacity: 0 });
    gsap.set(constelLabels, { opacity: 0, y: 10 });
    gsap.set(paleStars, { opacity: 0 });
    gsap.set(paleDotEarth, { scale: 0, opacity: 0 });
    gsap.set(floatLabels, { opacity: 0 });
    gsap.set([endingSub, endingNote, endingBtn, endingChapter, endingList], {
      opacity: 0,
      y: 20,
    });
    gsap.set(earth, { opacity: 0, scale: 0.55, x: 0, y: 0, yPercent: -50 });
    gsap.set(astronaut, { opacity: 0, x: 0, y: 40, rotation: 0 });
    gsap.set(satellite, { opacity: 0, x: -40, y: 0, rotation: 0 });
    gsap.set(nebula, { opacity: 0, scale: 1 });
    gsap.set(mars, { opacity: 0, x: "-30vw", scale: 0.6 });
    gsap.set(jupiter, { opacity: 0, x: "40vw", rotation: -20 });
    gsap.set(saturn, { opacity: 0, x: "-40vw", y: 40, rotation: 0 });
    gsap.set(letters, { opacity: 0, y: 40 });
    gsap.set(milky, { scale: 1.05, opacity: 0.25 });
    gsap.set(solarSystem, { opacity: 0, scale: 0.85, rotation: 0 });
    gsap.set(bhDisk, { scale: 0.45, opacity: 0, rotation: 0 });
    gsap.set(endingMoon, { opacity: 0, y: 90 });

    /* Hero chapter / facts entrance */
    gsap.from("#heroContent .caption__chapter, #heroContent .caption__facts", {
      opacity: 0,
      y: 18,
      stagger: 0.12,
      duration: 0.8,
      ease: "power2.out",
      delay: 0.35,
    });

    gsap.from(heroContent?.querySelectorAll(".split-char") || [], {
      y: 40,
      opacity: 0,
      stagger: 0.016,
      duration: 0.8,
      ease: "power3.out",
      delay: 0.1,
    });

    const track = document.getElementById("cinemaTrack");

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: cinema,
        start: "top top",
        end: "bottom bottom",
        pin: viewport,
        pinSpacing: false,
        scrub: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          if (window.__starParallax) {
            window.__starParallax.scrollY = self.progress * (tl.duration() * 28);
          }
        },
      },
    });

    const show = (layer, at, dur = 0.8) => {
      tl.set(layer, { visibility: "visible" }, at);
      tl.fromTo(layer, { opacity: 0 }, { opacity: 1, duration: dur }, at);
    };
    const hide = (layer, at, dur = 0.8) => {
      tl.to(layer, { opacity: 0, duration: dur }, at);
      tl.set(layer, { visibility: "hidden" }, at + dur);
    };

    /* ========== ACT 1: Zoom into moon + ring ========== */
    tl.to(heroContent, { opacity: 0, y: -36, duration: 0.55 }, 0)
      .to(scrollHint, { opacity: 0, duration: 0.3 }, 0)
      .to(moonPortal, { scale: 1.8, duration: 1.2 }, 0)
      .to(moonBloom, { scale: 1.3, opacity: 1, duration: 1.2 }, 0)
      .to(moonFlare, { opacity: 0.55, duration: 0.65 }, 0.25)
      .to(moonRings, { scale: 1.06, duration: 1.2 }, 0)
      .to(moonPortal, { scale: 3.6, duration: 1.35 }, 1.1)
      .to(moonImg, { rotation: 12, duration: 1.35 }, 1.1)
      .to(crater, { opacity: 0.8, duration: 1 }, 1.25)
      .to(moonFlare, { opacity: 0.9, x: 18, y: -10, duration: 1 }, 1.1)
      .to(moonRings, { scale: 1.12, duration: 1.35 }, 1.1)
      .to(moonPortal, { scale: 6.5, duration: 1.2 }, 2.3)
      .to(moonImg, { rotation: 22, duration: 1.2 }, 2.3)
      .to(moonRings, { opacity: 0.4, scale: 1.25, duration: 1 }, 2.4);

    /* ========== ACT 2: Landing — hold content longer ========== */
    tl.to(enterPortal, { scale: 0.14, duration: 0.55 }, 2.55)
      .to(enterPortal, { scale: 0.42, duration: 0.9 }, 3.05)
      .to(moonPortal, { opacity: 0.35, filter: "blur(4px)", duration: 0.85 }, 3.05)
      .to(enterPortal, { scale: 1, duration: 1.2 }, 3.85)
      .to(moonPortal, { opacity: 0, duration: 0.7 }, 4.0)
      .to(layerHero, { opacity: 0, duration: 0.55 }, 4.35)
      .set(layerHero, { visibility: "hidden" }, 4.9)
      .to([milkywayBand, milkywayCore], { opacity: 1, scale: 1, duration: 1.1 }, 4.4)
      .to(surfaceStory, { opacity: 1, y: 0, duration: 0.7 }, 4.7)
      .to(surfaceStory, { opacity: 1, duration: 1.1 }, 5.4)
      .to(surfaceStory, { opacity: 0, y: -18, duration: 0.5 }, 6.5);

    /* ========== ACT 3: Liftoff ========== */
    show(layerLiftoff, 6.6, 1.0);
    hide(layerSurface, 6.8, 0.85);
    tl.to(nebula, { opacity: 0.85, scale: 1.2, duration: 1.2 }, 6.7)
      .to(earth, { opacity: 1, scale: 1, duration: 1.1 }, 6.8)
      .to(astronaut, { opacity: 1, y: -20, rotation: -6, duration: 1.1 }, 7.0)
      .to(satellite, { opacity: 0.95, x: 70, y: 30, rotation: 8, duration: 1.2 }, 7.1)
      .to(liftoffStory, { opacity: 1, y: 0, duration: 0.65 }, 7.2)
      .to(floatLabels, { opacity: 1, stagger: 0.1, duration: 0.45 }, 7.3)
      .to(liftoffStory, { opacity: 1, duration: 1.0 }, 7.85)
      .to(earth, { x: -50, y: 30, scale: 1.12, duration: 1.35 }, 8.4)
      .to(astronaut, { y: -70, x: -30, rotation: 8, duration: 1.35 }, 8.4)
      .to(satellite, { x: 180, y: 90, opacity: 0.35, duration: 1.35 }, 8.4)
      .to(liftoffStory, { opacity: 0, duration: 0.45 }, 9.4)
      .to(floatLabels, { opacity: 0, duration: 0.35 }, 9.4);

    /* ========== ACT 4: Galaxy ========== */
    show(layerGalaxy, 9.5, 1.0);
    hide(layerLiftoff, 9.7, 0.85);
    tl.to(milky, { scale: 1.35, opacity: 0.5, duration: 2.2 }, 9.6)
      .to(mars, { opacity: 1, x: "110vw", scale: 1.15, duration: 1.6 }, 9.8)
      .to(jupiter, { opacity: 1, x: "-120vw", rotation: 12, duration: 1.7 }, 10.25)
      .to(saturn, { opacity: 1, x: "100vw", y: -16, rotation: 8, duration: 1.6 }, 10.7)
      .to(galaxyStory, { opacity: 1, duration: 0.55 }, 10.6)
      .to(letters, { opacity: 1, y: 0, stagger: 0.035, duration: 0.4 }, 10.85)
      .to(galaxyStory, { opacity: 1, duration: 1.0 }, 11.4)
      .to(galaxyStory, { opacity: 0, duration: 0.55 }, 12.4)
      .to(letters, { opacity: 0, y: -30, duration: 0.5 }, 12.4);

    /* ========== ACT 5: Solar system ========== */
    show(layerSolar, 12.5, 0.95);
    hide(layerGalaxy, 12.7, 0.8);
    tl.to(solarStory, { opacity: 1, y: 0, duration: 0.6 }, 12.65)
      .to(solarSystem, { opacity: 1, scale: 1, duration: 0.95 }, 12.8)
      .to(solarHint, { opacity: 1, y: 0, duration: 0.5 }, 13.0)
      .to(solarSystem, { rotation: 12, duration: 2.0 }, 13.2)
      .to(solarStory, { opacity: 1, duration: 0.9 }, 14.0)
      .to([solarStory, solarHint], { opacity: 0, duration: 0.45 }, 14.9);

    /* ========== ACT 6: Asteroid belt ========== */
    show(layerAsteroids, 15.0, 0.95);
    hide(layerSolar, 15.15, 0.8);
    tl.to(asteroidsStory, { opacity: 1, duration: 0.6 }, 15.2)
      .to(asteroidRocks, { opacity: 1, scale: 1, stagger: 0.02, duration: 0.5 }, 15.3)
      .to(asteroidRocks, { x: '+=40', y: '-=20', stagger: 0.01, duration: 1.8 }, 15.6)
      .to(asteroidsStory, { opacity: 1, duration: 0.9 }, 16.3)
      .to(asteroidsStory, { opacity: 0, duration: 0.45 }, 17.1);

    /* ========== ACT 7: Nebula ========== */
    show(layerNebula, 17.2, 0.95);
    hide(layerAsteroids, 17.35, 0.8);
    tl.to(nebulaStory, { opacity: 1, duration: 0.65 }, 17.4)
      .to(nebulaStars, { opacity: 1, scale: 1, stagger: 0.03, duration: 0.45 }, 17.55)
      .to(nebulaStory, { opacity: 1, duration: 1.0 }, 18.15)
      .to(nebulaStars, { scale: 1.35, opacity: 0.85, stagger: 0.02, duration: 0.9 }, 18.5)
      .to(nebulaStory, { opacity: 0, duration: 0.45 }, 19.3);

    /* ========== ACT 8: Binary stars ========== */
    show(layerBinary, 19.4, 0.95);
    hide(layerNebula, 19.55, 0.8);
    tl.to(binaryStory, { opacity: 1, duration: 0.6 }, 19.55)
      .to(binaryOrbit, { rotation: 160, duration: 2.0 }, 19.6)
      .to(binaryStory, { opacity: 1, duration: 0.9 }, 20.5)
      .to(binaryStory, { opacity: 0, duration: 0.45 }, 21.4);

    /* ========== ACT 9: Supernova ========== */
    show(layerSupernova, 21.5, 0.95);
    hide(layerBinary, 21.65, 0.8);
    tl.to(supernovaCore, { opacity: 1, scale: 1, duration: 0.45 }, 21.6)
      .to(supernovaStory, { opacity: 1, duration: 0.55 }, 21.75)
      .to(supernovaShock, { opacity: 1, scale: 8, duration: 1.4 }, 22.0)
      .to(supernovaShock2, { opacity: 0.8, scale: 12, duration: 1.5 }, 22.15)
      .to(supernovaRays, { opacity: 0.7, scale: 1.4, duration: 1.3 }, 22.1)
      .to(supernovaCore, { scale: 2.2, opacity: 0.4, duration: 1.0 }, 22.6)
      .to(supernovaStory, { opacity: 0, duration: 0.45 }, 23.5);

    /* ========== ACT 10: Black hole ========== */
    show(layerBh, 23.6, 0.95);
    hide(layerSupernova, 23.75, 0.8);
    tl.to(bhDisk, { scale: 1, opacity: 1, duration: 0.9 }, 23.7)
      .to(bhStory, { opacity: 1, duration: 0.6 }, 23.95)
      .to(bhStory, { opacity: 1, duration: 0.9 }, 24.55)
      .to(bhDisk, { scale: 1.7, rotation: 50, duration: 1.3 }, 25.0)
      .to(bhWarp, { scale: 1.35, duration: 1.3 }, 25.0)
      .to(bhParts, { x: 0, y: 0, scale: 0, opacity: 0, stagger: 0.015, duration: 1.1 }, 25.2)
      .to(bhStory, { opacity: 0, filter: 'blur(8px)', duration: 0.5 }, 25.8)
      .to(bhDisk, { scale: 7, opacity: 0, duration: 1.1 }, 26.0)
      .to(layerBh, { backgroundColor: '#000000', duration: 0.7 }, 26.3);

    /* ========== ACT 11: Quasar ========== */
    show(layerQuasar, 26.5, 0.95);
    hide(layerBh, 26.65, 0.8);
    tl.to(quasarCore, { opacity: 1, scale: 1, duration: 0.55 }, 26.6)
      .to(quasarDisk, { opacity: 1, scale: 1, duration: 0.7 }, 26.7)
      .to([quasarBeamUp, quasarBeamDown], { opacity: 1, scaleY: 1, duration: 0.8 }, 26.85)
      .to(quasarStory, { opacity: 1, duration: 0.6 }, 26.95)
      .to(quasarDisk, { rotation: 25, duration: 1.6 }, 27.2)
      .to(quasarStory, { opacity: 1, duration: 0.85 }, 27.7)
      .to(quasarStory, { opacity: 0, duration: 0.45 }, 28.5);

    /* ========== ACT 12: Comet ========== */
    show(layerComet, 28.6, 1.0);
    hide(layerQuasar, 28.75, 0.85);
    tl.to(cometBody, { opacity: 1, x: 0, y: 0, scale: 1, duration: 0.9 }, 28.75)
      .to(cometStory, { opacity: 1, y: 0, duration: 0.65 }, 28.9)
      .to(cometSparks, { opacity: 0.9, stagger: 0.04, duration: 0.4 }, 29.05)
      .to(cometBody, { x: '42vw', y: -60, rotation: -8, duration: 1.8 }, 29.3)
      .to(cometSparks, { x: 120, opacity: 0.35, stagger: 0.02, duration: 1.5 }, 29.4)
      .to(cometStory, { opacity: 1, duration: 0.8 }, 30.1)
      .to([cometStory, cometBody], { opacity: 0, duration: 0.45 }, 30.9)
      .to(cometSparks, { opacity: 0, duration: 0.35 }, 30.9);

    /* ========== ACT 13: Exoplanet ========== */
    show(layerExoplanet, 31.0, 0.95);
    hide(layerComet, 31.15, 0.8);
    tl.to(exoStar, { opacity: 1, scale: 1, duration: 0.7 }, 31.1)
      .to(exoPlanet, { opacity: 1, x: 0, scale: 1, duration: 0.85 }, 31.25)
      .to(exoRing, { opacity: 0.85, scale: 1, duration: 0.7 }, 31.4)
      .to(exoplanetStory, { opacity: 1, y: 0, duration: 0.6 }, 31.45)
      .to(exoPlanet, { y: -18, duration: 1.4 }, 31.8)
      .to(exoplanetStory, { opacity: 1, duration: 0.85 }, 32.4)
      .to([exoplanetStory, exoPlanet, exoStar, exoRing], { opacity: 0, duration: 0.45 }, 33.1);

    /* ========== ACT 14: Aurora ========== */
    show(layerAurora, 33.2, 1.0);
    hide(layerExoplanet, 33.35, 0.85);
    tl.to([aurora1, aurora2, aurora3], { opacity: 0.85, y: 0, stagger: 0.12, duration: 0.8 }, 33.35)
      .to(auroraStory, { opacity: 1, duration: 0.6 }, 33.55)
      .to(aurora1, { x: 30, duration: 1.5 }, 33.8)
      .to(aurora2, { x: -25, duration: 1.5 }, 33.8)
      .to(aurora3, { x: 15, duration: 1.5 }, 33.8)
      .to(auroraStory, { opacity: 1, duration: 0.9 }, 34.5)
      .to([auroraStory, aurora1, aurora2, aurora3], { opacity: 0, duration: 0.45 }, 35.3);

    /* ========== ACT 15: Skies ========== */
    show(layerSkies, 35.4, 1.05);
    hide(layerAurora, 35.55, 0.85);
    tl.to(skiesStory, { opacity: 1, duration: 0.65 }, 35.6)
      .to(skiesCards, { opacity: 1, y: 0, stagger: 0.12, duration: 0.55 }, 35.85)
      .to(skiesStory, { opacity: 1, duration: 1.2 }, 36.4)
      .to([skiesStory, skiesCards], { opacity: 0, duration: 0.5 }, 37.5);

    /* ========== ACT 16: Constellations ========== */
    show(layerConstellations, 37.6, 1.0);
    hide(layerSkies, 37.75, 0.85);
    tl.to(constellationsStory, { opacity: 1, duration: 0.6 }, 37.8)
      .to(constelGroups, { opacity: 1, stagger: 0.2, duration: 0.7 }, 38.0)
      .to(constelLabels, { opacity: 1, y: 0, stagger: 0.15, duration: 0.5 }, 38.25)
      .to(constellationsStory, { opacity: 1, duration: 1.0 }, 38.7)
      .to([constellationsStory, constelLabels], { opacity: 0, duration: 0.45 }, 39.7)
      .to(constelGroups, { opacity: 0.25, duration: 0.45 }, 39.7);

    /* ========== ACT 17: Pale blue dot ========== */
    show(layerPaleDot, 39.8, 1.0);
    hide(layerConstellations, 39.95, 0.85);
    tl.to(paleStars, { opacity: 1, stagger: 0.008, duration: 0.4 }, 40.0)
      .to(paleDotEarth, { opacity: 1, scale: 1, duration: 0.7 }, 40.2)
      .to(paleDotStory, { opacity: 1, duration: 0.65 }, 40.35)
      .to(paleDotEarth, { scale: 1.4, duration: 1.3 }, 40.7)
      .to(paleDotStory, { opacity: 1, duration: 1.0 }, 41.2)
      .to([paleDotStory, paleDotEarth], { opacity: 0, duration: 0.5 }, 42.1);

    /* ========== ACT 18: Ending — journey ends here ========== */
    show(layerEnding, 42.2, 0.9);
    hide(layerPaleDot, 42.3, 0.75);
    tl.to(endingMoon, { opacity: 1, y: 0, duration: 0.85 }, 42.25)
      .to(endingChapter, { opacity: 1, y: 0, duration: 0.35 }, 42.45)
      .to(endingSub, { opacity: 1, y: 0, duration: 0.4 }, 42.6)
      .to(endingList, { opacity: 1, y: 0, duration: 0.4 }, 42.85)
      .to(endingNote, { opacity: 1, y: 0, duration: 0.35 }, 43.05)
      .to(endingBtn, { opacity: 1, y: 0, duration: 0.35 }, 43.2);

    /* Short scroll distance — full journey fits a fast pass / 30s video */
    const SCROLL_VH_PER_UNIT = 28;
    if (track) {
      const units = Math.max(900, Math.ceil(tl.duration() * SCROLL_VH_PER_UNIT));
      track.style.height = `${units}vh`;
    }
    ScrollTrigger.refresh();

    /* Explore again */
    endingBtn?.addEventListener("click", () => {
      if (lenis) lenis.scrollTo(0, { duration: 1.2 });
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });

    /* Astronaut mouse tilt — image only */
    const astronautImg = astronaut?.querySelector(".astronaut__img");
    if (!state.isTouch && astronautImg) {
      window.addEventListener(
        "mousemove",
        (e) => {
          gsap.to(astronautImg, {
            rotateY: (e.clientX / window.innerWidth - 0.5) * 10,
            rotateX: -(e.clientY / window.innerHeight - 0.5) * 8,
            duration: 1,
            ease: "power2.out",
            overwrite: "auto",
          });
        },
        { passive: true }
      );
    }

    /* Nebula mouse drift */
    const n1 = document.querySelector(".space-bg__nebula--1");
    const n2 = document.querySelector(".space-bg__nebula--2");
    if (!state.isTouch && n1) {
      window.addEventListener(
        "mousemove",
        (e) => {
          const x = (e.clientX / window.innerWidth - 0.5) * 36;
          const y = (e.clientY / window.innerHeight - 0.5) * 28;
          gsap.to(n1, { x: x * 1.2, y: y * 1.2, duration: 2, ease: "power2.out" });
          gsap.to(n2, { x: -x, y: -y, duration: 2.4, ease: "power2.out" });
        },
        { passive: true }
      );
    }
  }

  /* ============================================================
     PRELOAD + BOOT
     ============================================================ */
  function preload() {
    return Promise.all(
      [
        "Assests/moon.jpeg",
        "Assests/moon2.jpeg",
        "Assests/Arronaut.png",
        "Assests/blue shade.jpeg",
      ].map(
        (src) =>
          new Promise((res) => {
            const img = new Image();
            img.onload = img.onerror = () => res();
            img.src = src;
          })
      )
    );
  }

  async function boot() {
    initStars();
    initDust();
    initShootingStars();
    initCursor();
    await preload();
    initLenis();
    initPlanetCards();
    initCinema();
    initVideoCapture();
    ScrollTrigger.refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.addEventListener("pagehide", () => {
    if (rafId) cancelAnimationFrame(rafId);
    lenis?.destroy();
    ScrollTrigger.getAll().forEach((t) => t.kill());
  });
})();

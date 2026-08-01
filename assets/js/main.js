(() => {
  "use strict";

  const header = document.querySelector("[data-glass-header]");
  const desktopHeader = document.querySelector("[data-desktop-header]");
  const desktopNav = document.querySelector("[data-segmented-nav]");
  const desktopIndicator = document.querySelector("[data-segmented-indicator]");
  const desktopNavLinks = [...document.querySelectorAll(".desktop-nav [data-section-link]")];

  const mobileHeader = document.querySelector("[data-mobile-header]");
  const mobileMenuButton = document.querySelector("[data-mobile-menu-button]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");
  const mobileMenuNav = document.querySelector("[data-mobile-menu-nav]");
  const mobileMenuIndicator = document.querySelector("[data-mobile-menu-indicator]");
  const mobileMenuLinks = [...document.querySelectorAll(".mobile-menu [data-section-link]")];

  const sectionLinks = [...document.querySelectorAll("[data-section-link]")];
  const scrollLinks = [...document.querySelectorAll("[data-scroll-link]")];
  const sections = [...document.querySelectorAll("[data-site-section]")];
  const abstractToggles = [...document.querySelectorAll("[data-abstract-toggle]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let activeSection = "home";
  let pendingSection = null;
  let headerMode = "auto";
  let scrollFrame = null;
  let layoutFrame = null;
  let scrollSettleTimer = null;
  let pendingSafetyTimer = null;
  let desktopComfortWidth = 590;

  function getHeaderOffset() {
    if (!header) return 0;
    const styles = window.getComputedStyle(header);
    const stickyTop = Number.parseFloat(styles.top) || 0;
    return header.getBoundingClientRect().height + stickyTop + 18;
  }

  function updateHeaderOffsetVariable() {
    document.documentElement.style.setProperty("--header-offset", `${getHeaderOffset()}px`);
  }

  function getFullNavLabel(link) {
    return (
      link.querySelector(".nav-label-full")?.textContent ||
      link.textContent ||
      ""
    ).trim();
  }

  function measureDesktopComfortWidth() {
    const sample = desktopNavLinks[0];
    if (!sample) return 590;

    const style = window.getComputedStyle(sample);
    const canvas = measureDesktopComfortWidth.canvas ||
      (measureDesktopComfortWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");

    if (!context) return 590;

    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const letterSpacing = Number.parseFloat(style.letterSpacing) || 0;

    const longestLabel = desktopNavLinks.reduce((longest, link) => {
      const text = getFullNavLabel(link);
      const width = context.measureText(text).width + Math.max(0, text.length - 1) * letterSpacing;
      return Math.max(longest, width);
    }, 0);

    /*
       Each desktop segment receives the longest label plus deliberate breathing
       room. Five equal segments, track padding, and row padding determine when
       the full desktop control is genuinely comfortable rather than merely able
       to squeeze in.
    */
    const segmentWidth = Math.ceil(longestLabel + 36);
    const trackWidth = segmentWidth * 5 + 14;
    const rowAllowance = 38;

    return Math.max(560, trackWidth + rowAllowance);
  }

  function availableDesktopHeaderWidth() {
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    return Math.min(Math.max(0, viewportWidth - 32), 928);
  }

  function resolveHeaderMode() {
    if (!header || !desktopHeader || !mobileHeader) return;

    desktopComfortWidth = measureDesktopComfortWidth();
    const available = availableDesktopHeaderWidth();
    const hysteresis = 24;

    let nextMode;
    if (headerMode === "mobile") {
      nextMode = available >= desktopComfortWidth + hysteresis ? "desktop" : "mobile";
    } else {
      nextMode = available < desktopComfortWidth ? "mobile" : "desktop";
    }

    if (nextMode === headerMode) return;

    headerMode = nextMode;
    header.dataset.headerMode = nextMode;

    if (nextMode === "desktop") {
      closeMobileMenu(false);
    }
  }

  function moveDesktopIndicator(sectionId, animate = true) {
    if (!desktopNav || !desktopIndicator || headerMode === "mobile") return;

    const target = desktopNavLinks.find((link) => link.dataset.sectionLink === sectionId);
    if (!target || target.offsetParent === null) return;

    if (!animate || reducedMotion.matches) {
      desktopIndicator.style.transition = "none";
    }

    desktopIndicator.style.width = `${target.offsetWidth}px`;
    desktopIndicator.style.transform = `translate3d(${target.offsetLeft}px, 0, 0)`;
    desktopIndicator.classList.add("is-ready");

    if (!animate || reducedMotion.matches) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          desktopIndicator.style.transition = "";
        });
      });
    }
  }

  function moveMobileMenuIndicator(sectionId, animate = true) {
    if (!mobileMenuNav || !mobileMenuIndicator) return;

    const target = mobileMenuLinks.find((link) => link.dataset.sectionLink === sectionId);
    if (!target) {
      mobileMenuIndicator.classList.remove("is-ready");
      return;
    }

    if (!animate || reducedMotion.matches) {
      mobileMenuIndicator.style.transition = "none";
    }

    mobileMenuIndicator.style.width = `${target.offsetWidth}px`;
    mobileMenuIndicator.style.height = `${target.offsetHeight}px`;
    mobileMenuIndicator.style.transform = `translate3d(${target.offsetLeft}px, ${target.offsetTop}px, 0)`;
    mobileMenuIndicator.classList.add("is-ready");

    if (!animate || reducedMotion.matches) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          mobileMenuIndicator.style.transition = "";
        });
      });
    }
  }

  function setActiveSection(sectionId, animate = true) {
    if (!sectionId) return;

    const changed = activeSection !== sectionId;
    activeSection = sectionId;

    sectionLinks.forEach((link) => {
      const selected = link.dataset.sectionLink === sectionId;
      link.classList.toggle("is-active", selected);
      if (selected) {
        link.setAttribute("aria-current", "location");
      } else {
        link.removeAttribute("aria-current");
      }
    });

    if (changed || !desktopIndicator?.classList.contains("is-ready")) {
      moveDesktopIndicator(sectionId, animate);
    }

    moveMobileMenuIndicator(sectionId, animate);
  }

  function positionMobileMenu() {
    if (!header || !mobileMenu) return;

    const rect = header.getBoundingClientRect();
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    const right = Math.max(8, viewportWidth - rect.right);
    const top = rect.bottom + 10;

    mobileMenu.style.setProperty("--mobile-menu-top", `${Math.round(top)}px`);
    mobileMenu.style.setProperty("--mobile-menu-right", `${Math.round(right)}px`);
  }

  function openMobileMenu() {
    if (!mobileMenu || !mobileMenuButton || headerMode !== "mobile") return;

    positionMobileMenu();
    mobileMenu.classList.add("is-open");
    mobileMenu.setAttribute("aria-hidden", "false");
    mobileMenuButton.setAttribute("aria-expanded", "true");
    document.body.classList.add("mobile-menu-open");
    moveMobileMenuIndicator(activeSection, false);
  }

  function closeMobileMenu(restoreFocus = false) {
    if (!mobileMenu || !mobileMenuButton) return;

    const wasOpen = mobileMenu.classList.contains("is-open");
    mobileMenu.classList.remove("is-open");
    mobileMenu.setAttribute("aria-hidden", "true");
    mobileMenuButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("mobile-menu-open");

    if (restoreFocus && wasOpen) mobileMenuButton.focus();
  }

  function toggleMobileMenu() {
    if (!mobileMenu) return;
    if (mobileMenu.classList.contains("is-open")) {
      closeMobileMenu(false);
    } else {
      openMobileMenu();
    }
  }

  function clearPendingScroll() {
    pendingSection = null;
    if (scrollSettleTimer) window.clearTimeout(scrollSettleTimer);
    if (pendingSafetyTimer) window.clearTimeout(pendingSafetyTimer);
    scrollSettleTimer = null;
    pendingSafetyTimer = null;
  }

  function finishPendingScroll() {
    const intendedSection = pendingSection;
    clearPendingScroll();
    if (intendedSection) setActiveSection(intendedSection, false);
  }

  function schedulePendingScrollFinish() {
    if (!pendingSection) return;
    if (scrollSettleTimer) window.clearTimeout(scrollSettleTimer);
    scrollSettleTimer = window.setTimeout(finishPendingScroll, 125);
  }

  function scrollToSection(sectionId, updateHash = true) {
    const target = document.getElementById(sectionId);
    if (!target) return;

    clearPendingScroll();
    pendingSection = sectionId;
    setActiveSection(sectionId, true);

    const top = target.getBoundingClientRect().top + window.scrollY - getHeaderOffset();
    const smooth = !reducedMotion.matches;

    window.scrollTo({
      top: Math.max(0, top),
      behavior: smooth ? "smooth" : "auto"
    });

    if (updateHash) history.replaceState(null, "", `#${sectionId}`);

    if (!smooth) {
      finishPendingScroll();
      return;
    }

    pendingSafetyTimer = window.setTimeout(finishPendingScroll, 1800);
  }

  scrollLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const sectionId = link.dataset.sectionLink;
      if (!sectionId) return;
      event.preventDefault();
      closeMobileMenu(false);
      scrollToSection(sectionId);
    });
  });

  mobileMenuButton?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    toggleMobileMenu();
  });

  document.addEventListener("pointerdown", (event) => {
    if (!mobileMenu?.classList.contains("is-open")) return;
    if (mobileMenu.contains(event.target) || mobileMenuButton?.contains(event.target)) return;
    closeMobileMenu(false);
  }, { passive: true });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileMenu?.classList.contains("is-open")) {
      closeMobileMenu(true);
      return;
    }

    if (["PageDown", "PageUp", "Home", "End", "ArrowDown", "ArrowUp", " "].includes(event.key)) {
      clearPendingScroll();
    }
  });

  ["wheel", "touchstart"].forEach((eventName) => {
    window.addEventListener(eventName, clearPendingScroll, { passive: true });
  });

  function updateActiveFromScroll() {
    scrollFrame = null;
    if (pendingSection) return;

    const marker = window.scrollY + getHeaderOffset() + Math.min(window.innerHeight * 0.18, 120);
    let nextSection = sections[0]?.id || "home";

    sections.forEach((section) => {
      if (section.offsetTop <= marker) nextSection = section.id;
    });

    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) {
      nextSection = sections.at(-1)?.id || nextSection;
    }

    setActiveSection(nextSection, true);
  }

  window.addEventListener("scroll", () => {
    if (pendingSection) schedulePendingScrollFinish();
    if (mobileMenu?.classList.contains("is-open")) positionMobileMenu();
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(updateActiveFromScroll);
  }, { passive: true });

  if ("onscrollend" in window) {
    window.addEventListener("scrollend", () => {
      if (pendingSection) finishPendingScroll();
    }, { passive: true });
  }

  function setUpAbstractToggles() {
    abstractToggles.forEach((button) => {
      const panelId = button.getAttribute("aria-controls");
      const panel = panelId ? document.getElementById(panelId) : null;
      const card = button.closest("[data-work-card]");
      const title = card?.querySelector(".work-title strong")?.textContent?.trim() || "this project";

      if (!panel || !card) return;

      function setExpanded(expanded) {
        card.classList.toggle("is-expanded", expanded);
        button.setAttribute("aria-expanded", String(expanded));
        button.setAttribute("aria-label", `${expanded ? "Hide" : "Show"} abstract for ${title}`);
        panel.setAttribute("aria-hidden", String(!expanded));
      }

      setExpanded(button.getAttribute("aria-expanded") === "true");
      button.addEventListener("click", () => {
        setExpanded(button.getAttribute("aria-expanded") !== "true");
      });
    });
  }

  function setUpReveal() {
    const revealItems = [...document.querySelectorAll("[data-reveal]")];
    if (!revealItems.length) return;

    if (reducedMotion.matches || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      root: null,
      rootMargin: "0px 0px -4% 0px",
      threshold: 0.06
    });

    revealItems.forEach((item) => revealObserver.observe(item));
  }

  function updateGlassGlow(event) {
    if (!header || event.pointerType === "touch") return;
    const rect = header.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    header.style.setProperty("--glow-x", `${x}%`);
    header.style.setProperty("--glow-y", `${y}%`);
  }

  header?.addEventListener("pointermove", updateGlassGlow, { passive: true });
  header?.addEventListener("pointerleave", () => {
    header.style.setProperty("--glow-x", "50%");
    header.style.setProperty("--glow-y", "0%");
  });

  function refreshLayout() {
    if (layoutFrame) cancelAnimationFrame(layoutFrame);
    layoutFrame = requestAnimationFrame(() => {
      resolveHeaderMode();
      updateHeaderOffsetVariable();
      positionMobileMenu();
      moveDesktopIndicator(activeSection, false);
      moveMobileMenuIndicator(activeSection, false);
      updateActiveFromScroll();
    });
  }

  window.addEventListener("resize", refreshLayout, { passive: true });
  window.addEventListener("orientationchange", refreshLayout, { passive: true });
  window.visualViewport?.addEventListener("resize", refreshLayout, { passive: true });

  if ("ResizeObserver" in window) {
    const layoutObserver = new ResizeObserver(refreshLayout);
    if (header) layoutObserver.observe(header);
    if (desktopNav) layoutObserver.observe(desktopNav);
    if (mobileMenuNav) layoutObserver.observe(mobileMenuNav);
  }

  document.fonts?.ready.then(refreshLayout);

  setUpAbstractToggles();
  setUpReveal();
  resolveHeaderMode();
  updateHeaderOffsetVariable();
  positionMobileMenu();
  updateActiveFromScroll();

  const initialSection = location.hash.replace(/^#/, "");
  if (initialSection && document.getElementById(initialSection)) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToSection(initialSection, false));
    });
  } else {
    setActiveSection("home", false);
  }
})();

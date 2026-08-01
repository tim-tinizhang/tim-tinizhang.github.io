(() => {
  "use strict";

  const header = document.querySelector("[data-glass-header]");
  const sectionLinks = [...document.querySelectorAll("[data-section-link]")];
  const scrollLinks = [...document.querySelectorAll("[data-scroll-link]")];
  const sections = [...document.querySelectorAll("[data-site-section]")];
  const segmentedNav = document.querySelector("[data-segmented-nav]");
  const indicator = document.querySelector("[data-segmented-indicator]");
  const navSectionLinks = [...document.querySelectorAll(".desktop-nav [data-section-link]")];
  const abstractToggles = [...document.querySelectorAll("[data-abstract-toggle]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let activeSection = "home";
  let pendingSection = null;
  let scrollFrame = null;
  let layoutFrame = null;
  let scrollSettleTimer = null;
  let pendingSafetyTimer = null;

  function getHeaderOffset() {
    if (!header) return 0;
    const styles = window.getComputedStyle(header);
    const stickyTop = Number.parseFloat(styles.top) || 0;
    return header.getBoundingClientRect().height + stickyTop + 18;
  }

  function updateHeaderOffsetVariable() {
    document.documentElement.style.setProperty("--header-offset", `${getHeaderOffset()}px`);
  }

  function moveIndicator(sectionId, animate = true) {
    if (!segmentedNav || !indicator) return;

    const target = navSectionLinks.find((link) => link.dataset.sectionLink === sectionId);
    if (!target || target.offsetParent === null) return;

    const navRect = segmentedNav.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const x = targetRect.left - navRect.left;

    if (!animate || reducedMotion.matches) {
      indicator.style.transition = "none";
    }

    indicator.style.width = `${targetRect.width}px`;
    indicator.style.transform = `translate3d(${x}px, 0, 0)`;
    indicator.classList.add("is-ready");

    if (!animate || reducedMotion.matches) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          indicator.style.transition = "";
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

    if (changed || !indicator?.classList.contains("is-ready")) {
      moveIndicator(sectionId, animate);
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
      scrollToSection(sectionId);
    });
  });

  document.addEventListener("keydown", (event) => {
    if (["PageDown", "PageUp", "Home", "End", "ArrowDown", "ArrowUp", " "].includes(event.key)) {
      clearPendingScroll();
    }
  });

  ["wheel", "touchstart", "pointerdown"].forEach((eventName) => {
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
      updateHeaderOffsetVariable();
      moveIndicator(activeSection, false);
      updateActiveFromScroll();
    });
  }

  window.addEventListener("resize", refreshLayout, { passive: true });
  window.addEventListener("orientationchange", refreshLayout, { passive: true });
  window.visualViewport?.addEventListener("resize", refreshLayout, { passive: true });

  if ("ResizeObserver" in window) {
    const layoutObserver = new ResizeObserver(refreshLayout);
    if (header) layoutObserver.observe(header);
    if (segmentedNav) layoutObserver.observe(segmentedNav);
  }

  document.fonts?.ready.then(refreshLayout);

  setUpAbstractToggles();
  setUpReveal();
  updateHeaderOffsetVariable();
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

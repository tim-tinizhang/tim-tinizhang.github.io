(() => {
  "use strict";

  const contactTrigger = document.querySelector("[data-contact-trigger]");
  const contactMenu = document.querySelector("[data-contact-menu]");
  const mobileTrigger = document.querySelector("[data-mobile-menu-trigger]");
  const mobileMenu = document.querySelector("[data-mobile-menu]");

  function setExpanded(trigger, panel, expanded) {
    if (!trigger || !panel) return;
    trigger.setAttribute("aria-expanded", String(expanded));
    panel.hidden = !expanded;
  }

  const closeContact = () => setExpanded(contactTrigger, contactMenu, false);
  const closeMobile = () => setExpanded(mobileTrigger, mobileMenu, false);

  contactTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = contactTrigger.getAttribute("aria-expanded") === "true";
    closeMobile();
    setExpanded(contactTrigger, contactMenu, !isOpen);
  });

  contactMenu?.addEventListener("click", (event) => event.stopPropagation());

  mobileTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = mobileTrigger.getAttribute("aria-expanded") === "true";
    closeContact();
    setExpanded(mobileTrigger, mobileMenu, !isOpen);
  });

  mobileMenu?.addEventListener("click", (event) => event.stopPropagation());

  document.addEventListener("click", () => {
    closeContact();
    closeMobile();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    const contactWasOpen = contactTrigger?.getAttribute("aria-expanded") === "true";
    const mobileWasOpen = mobileTrigger?.getAttribute("aria-expanded") === "true";

    closeContact();
    closeMobile();

    if (contactWasOpen) contactTrigger?.focus();
    if (mobileWasOpen) mobileTrigger?.focus();
  });

  const desktopQuery = window.matchMedia("(min-width: 761px)");
  const syncMenus = () => desktopQuery.matches ? closeMobile() : closeContact();

  if (desktopQuery.addEventListener) {
    desktopQuery.addEventListener("change", syncMenus);
  } else {
    desktopQuery.addListener(syncMenus);
  }
})();

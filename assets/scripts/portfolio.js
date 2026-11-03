/* Small, dependency-free interactions for the standalone portfolio. */
(() => {
  "use strict";

  const ready = () => {
    document.documentElement.classList.add("portfolio-js");
    if (window.matchMedia("(hover: hover)").matches) {
      document.querySelectorAll(".has-rollover, .grid__item-container").forEach((element) => element.classList.add("hoverable"));
    }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]';

    function makeButton(element, label) {
      if (!element) return null;
      let button = element;
      if (element.tagName !== "BUTTON") {
        button = document.createElement("button");
        for (const attribute of element.attributes) button.setAttribute(attribute.name, attribute.value);
        while (element.firstChild) button.append(element.firstChild);
        element.replaceWith(button);
      }
      button.type = "button";
      button.setAttribute("aria-label", label);
      return button;
    }

    // The original layout uses an alternate navigation panel on small screens.
    const navigation = document.querySelector(".js-responsive-nav");
    const menuButton = makeButton(document.querySelector(".js-hamburger"), "Open navigation");
    const closeMenuButton = makeButton(document.querySelector(".js-close-responsive-nav"), "Close navigation");
    const site = document.querySelector(".js-site-wrap, .site-wrap");
    if (navigation && menuButton) {
      let menuOpen = false;
      navigation.id ||= "portfolio-mobile-navigation";
      navigation.hidden = true;
      navigation.setAttribute("role", "dialog");
      navigation.setAttribute("aria-modal", "true");
      navigation.setAttribute("aria-label", "Navigation");
      menuButton.setAttribute("aria-controls", navigation.id);
      menuButton.setAttribute("aria-expanded", "false");

      const setMenu = (open, restoreFocus = true) => {
        menuOpen = open;
        navigation.hidden = !open;
        menuButton.setAttribute("aria-expanded", String(open));
        document.body.classList.toggle("portfolio-menu-open", open);
        if (site) site.inert = open;
        if (open) {
          (closeMenuButton || navigation.querySelector(focusableSelector))?.focus();
        } else if (restoreFocus) {
          menuButton.focus();
        }
      };
      menuButton.addEventListener("click", () => setMenu(!menuOpen));
      closeMenuButton?.addEventListener("click", () => setMenu(false));
      navigation.addEventListener("click", (event) => {
        if (event.target.closest("a[href]")) setMenu(false, false);
      });
      navigation.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setMenu(false);
        }
        if (event.key !== "Tab") return;
        const items = Array.from(navigation.querySelectorAll(focusableSelector)).filter((item) => item.getClientRects().length);
        const first = items[0];
        const last = items[items.length - 1];
        if (!first) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
      const desktop = window.matchMedia("(min-width: 769px)");
      desktop.addEventListener("change", (event) => {
        if (event.matches && menuOpen) setMenu(false, false);
      });
    }

    document.querySelectorAll('nav a.active').forEach((link) => link.setAttribute("aria-current", "page"));

    // Source images are already local and use native lazy loading. The fallback
    // also makes a retained source module visible without Adobe's lazy loader.
    document.querySelectorAll("img[data-src]").forEach((image) => {
      if (!image.getAttribute("src") || image.getAttribute("src").startsWith("data:")) image.src = image.dataset.src;
    });
    document.querySelectorAll("img").forEach((image) => {
      const loaded = () => image.classList.add("image-loaded");
      if (image.complete && image.naturalWidth) loaded();
      else image.addEventListener("load", loaded, { once: true });
    });
    document.querySelectorAll(".project-module-image img").forEach((image) => {
      image.style.removeProperty("padding-bottom");
      if (image.getAttribute("height") === "0") image.removeAttribute("height");
    });
    document.querySelectorAll(".grid--main").forEach((grid) => {
      if (grid.querySelector(".grid__item-spacer")) return;
      const spacer = document.createElement("div");
      spacer.className = "grid__item-spacer";
      spacer.setAttribute("aria-hidden", "true");
      grid.append(spacer);
    });

    const triggers = Array.from(document.querySelectorAll(".js-lightbox, .js-grid-item-container, [data-lightbox]")).filter((element) => {
      if (element.closest(".project-cover")) return false;
      const image = element.matches("img") ? element : element.querySelector("img");
      if (!image) return false;
      const link = image.closest("a[href]");
      return !link || link === element;
    });
    const gallery = triggers.map((trigger, index) => {
      const image = trigger.matches("img") ? trigger : trigger.querySelector("img");
      const caption = trigger.querySelector("figcaption, .caption")?.textContent.trim() || image.alt || "";
      const source = trigger.dataset.fullSize || image.dataset.fullSize || trigger.dataset.src || image.currentSrc || image.src;
      const title = document.querySelector(".page-header h1, h1")?.textContent.trim() || "Portfolio";
      trigger.setAttribute("tabindex", "0");
      trigger.setAttribute("role", "button");
      trigger.setAttribute("aria-haspopup", "dialog");
      trigger.setAttribute("aria-label", caption ? `Enlarge: ${caption}` : `Enlarge ${title} image ${index + 1}`);
      trigger.classList.add("portfolio-image-trigger");
      return { trigger, image, source, caption };
    });

    if (gallery.length) {
      const dialog = document.createElement("dialog");
      dialog.className = "portfolio-lightbox";
      dialog.setAttribute("aria-label", "Image viewer");
      dialog.innerHTML = '<button type="button" class="portfolio-lightbox__close" aria-label="Close image viewer">×</button><button type="button" class="portfolio-lightbox__previous" aria-label="Previous image">‹</button><figure class="portfolio-lightbox__figure"><img class="portfolio-lightbox__image" alt=""><figcaption class="portfolio-lightbox__caption"></figcaption><p class="portfolio-lightbox__counter" aria-live="polite"></p></figure><button type="button" class="portfolio-lightbox__next" aria-label="Next image">›</button>';
      document.body.append(dialog);
      const fullImage = dialog.querySelector(".portfolio-lightbox__image");
      const caption = dialog.querySelector(".portfolio-lightbox__caption");
      const counter = dialog.querySelector(".portfolio-lightbox__counter");
      const close = dialog.querySelector(".portfolio-lightbox__close");
      const previous = dialog.querySelector(".portfolio-lightbox__previous");
      const next = dialog.querySelector(".portfolio-lightbox__next");
      let current = 0;
      let returnFocus;

      const show = (index) => {
        current = (index + gallery.length) % gallery.length;
        const item = gallery[current];
        fullImage.src = item.source;
        fullImage.alt = item.image.alt || item.caption || `Portfolio image ${current + 1}`;
        caption.textContent = item.caption;
        caption.hidden = !item.caption;
        counter.textContent = `${current + 1} / ${gallery.length}`;
        previous.hidden = gallery.length < 2;
        next.hidden = gallery.length < 2;
      };
      const open = (index) => {
        returnFocus = document.activeElement;
        show(index);
        dialog.showModal();
        document.body.classList.add("portfolio-lightbox-open");
        close.focus();
      };
      gallery.forEach(({ trigger }, index) => {
        trigger.addEventListener("click", (event) => {
          event.preventDefault();
          open(index);
        });
        trigger.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            open(index);
          }
        });
      });
      close.addEventListener("click", () => dialog.close());
      previous.addEventListener("click", () => show(current - 1));
      next.addEventListener("click", () => show(current + 1));
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
      dialog.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); show(current - 1); }
        if (event.key === "ArrowRight") { event.preventDefault(); show(current + 1); }
        if (event.key === "Home") { event.preventDefault(); show(0); }
        if (event.key === "End") { event.preventDefault(); show(gallery.length - 1); }
      });
      dialog.addEventListener("close", () => {
        document.body.classList.remove("portfolio-lightbox-open");
        returnFocus?.focus();
      });
    }

    document.querySelectorAll('.back-to-top a[href="#"], a.js-back-to-top[href="#"]').forEach((link) => {
      link.setAttribute("aria-label", "Back to top");
      link.addEventListener("click", (event) => {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: reducedMotion.matches ? "instant" : "smooth" });
      });
    });
    const fixedTop = document.querySelector(".js-back-to-top");
    if (fixedTop) {
      const updateTop = () => {
        const visible = window.scrollY > 300;
        fixedTop.classList.toggle("portfolio-back-to-top-visible", visible);
        fixedTop.setAttribute("tabindex", visible ? "0" : "-1");
        fixedTop.setAttribute("aria-hidden", String(!visible));
      };
      window.addEventListener("scroll", updateTop, { passive: true });
      updateTop();
    }

    document.querySelectorAll("form.contact-form").forEach((form) => {
      const emailAddress = form.dataset.contactEmail || document.body.dataset.contactEmail || document.querySelector('meta[name="contact-email"]')?.content || "";
      const name = form.querySelector('[name="field1"], [name="name"]');
      const email = form.querySelector('[name="email"]');
      const message = form.querySelector('textarea[name="field2"], textarea[name="message"]');
      [name, email, message].forEach((field) => {
        if (!field) return;
        field.id ||= field.name;
      });
      if (name) name.autocomplete = "name";
      if (email) { email.type = "email"; email.autocomplete = "email"; }
      const submit = makeButton(form.querySelector(".js-submit, .submit-button, button[type=submit]"), "Open email app");
      const notice = document.createElement("p");
      notice.className = "portfolio-contact-note";
      notice.id = "portfolio-contact-note";
      form.querySelectorAll(".form-input input, .form-input textarea").forEach((field) => field.setAttribute("aria-describedby", notice.id));
      if (submit) {
        submit.type = "submit";
        const label = submit.querySelector(".submit-text") || document.createElement("span");
        label.classList.add("submit-text");
        label.textContent = "Open email app";
        submit.replaceChildren(label);
      }
      document.querySelectorAll(".contact-form-sent").forEach((element) => element.remove());
      if (!emailAddress.includes("@")) {
        if (submit) submit.disabled = true;
        notice.textContent = "Please use the contact details on my résumé to get in touch.";
        form.append(notice);
        form.addEventListener("submit", (event) => event.preventDefault());
        return;
      }
      const directLink = document.createElement("a");
      directLink.href = `mailto:${emailAddress}`;
      directLink.textContent = emailAddress;
      notice.append("This opens your email app so you can send the message. You can also email ", directLink, ".");
      form.append(notice);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        const senderName = name?.value.trim() || "Portfolio visitor";
        const senderEmail = email?.value.trim() || "";
        const body = `${message?.value.trim() || ""}\n\nFrom: ${senderName}\nEmail: ${senderEmail}`;
        const subject = `Portfolio inquiry from ${senderName}`;
        window.location.href = `mailto:${emailAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      });
    });
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();
})();

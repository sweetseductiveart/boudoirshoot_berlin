// ===== LANGUAGE SWITCHER =====
// Language switching is handled by i18n.js
// ===== TAB SYSTEM: Main Navigation =====
const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
const panels = Array.from(document.querySelectorAll('[role="tabpanel"]'));

const hashToPanel = {
  konzept: "tab-konzept",
  ablauf: "tab-ablauf",
  location: "tab-location",
  divers: "tab-divers",
  codex: "tab-codex",
  kosten: "tab-kosten",
  anmeldung: "tab-anmeldung"
};

const panelToHash = Object.fromEntries(
  Object.entries(hashToPanel).map(([h, p]) => [p, h])
);

function activate(panelId, { updateHash = true, scrollTop = false } = {}) {
  // tabs
  tabs.forEach(t => {
    const selected = (t.getAttribute("aria-controls") === panelId);
    t.setAttribute("aria-selected", selected ? "true" : "false");
  });

  // panels
  panels.forEach(p => {
    p.dataset.active = (p.id === panelId) ? "true" : "false";
  });

  // Load gallery images when location tab becomes active
  if (panelId === "tab-location") {
    const locationPanel = document.getElementById("tab-location");
    if (locationPanel) {
      const galleryImages = locationPanel.querySelectorAll(".studio-gallery__image[data-src]");
      galleryImages.forEach(img => {
        if (img.dataset.src && !img.src) {
          img.src = img.dataset.src;
          img.removeAttribute("data-src");
        }
      });
    }
  }

  // hash sync (for sharing / deep links)
  if (updateHash) {
    const h = panelToHash[panelId];
    if (h) history.replaceState(null, "", "#" + h);
  }

  if (scrollTop) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

function routeFromHash() {
  const h = (location.hash || "").replace("#", "");
  const panel = hashToPanel[h] || "tab-konzept";
  // updateHash:false avoids redundant replaceState when reacting to hashchange
  activate(panel, { updateHash: false });
}

// 1) Tab clicks
tabs.forEach(t => {
  t.addEventListener("click", () => {
    activate(t.getAttribute("aria-controls"), { updateHash: true, scrollTop: true });
  });
});

// 2) Links/buttons that should switch panels (Hero buttons, footer links etc.)
document.querySelectorAll("[data-jump]").forEach(a => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    activate(a.dataset.jump, { updateHash: true, scrollTop: true });
  });
});

// 3) React to hash changes (covers: direct URL share, manual hash change, normal anchor navigation)
window.addEventListener("hashchange", routeFromHash);

// Initial route
routeFromHash();

// ===== CONTACT FLYOUT: Profile Cards =====
const flyout = document.getElementById('contact-flyout');
const flyoutOverlay = flyout?.querySelector('.contact__flyout__overlay');
const flyoutClose = flyout?.querySelector('.contact__flyout__close');
const flyoutPortrait = document.getElementById('flyout-portrait');
const flyoutName = document.getElementById('flyout-name');
const flyoutInfo = document.getElementById('flyout-info');
const contactRows = document.querySelectorAll('.contact__row');

function openFlyout(row) {
  const portrait = row.querySelector('.contact__portrait');
  const info = row.querySelector('.contact__info');
  
  if (!portrait || !info || !flyout) return;

  // Use original large image for flyout, not the thumbnail
  const contactType = row.getAttribute('data-contact');
  let imgSrc = '';
  if (contactType === 'dominik') {
    imgSrc = 'assets/portrait.jpg';
  } else if (contactType === 'nale') {
    imgSrc = 'assets/nale.jpg';
  }
  
  const imgAlt = portrait.getAttribute('alt') || '';
  if (imgSrc && flyoutPortrait) {
    flyoutPortrait.setAttribute('src', imgSrc);
    flyoutPortrait.setAttribute('alt', imgAlt);
  }

  // Clone and set name
  const nameHtml = info.querySelector('.contact__name')?.innerHTML || '';
  if (flyoutName) {
    flyoutName.innerHTML = nameHtml;
  }

  // Clone and set info (all paragraphs except name)
  const infoParas = Array.from(info.querySelectorAll('p')).filter(p => !p.classList.contains('contact__name'));
  if (flyoutInfo) {
    flyoutInfo.innerHTML = infoParas.map(p => p.outerHTML).join('');
  }

  // Show flyout
  flyout.style.display = 'flex';
  // Trigger reflow for animation
  requestAnimationFrame(() => {
    flyout.classList.add('active');
  });

  // Prevent body scroll
  document.body.style.overflow = 'hidden';
}

function closeFlyout() {
  if (!flyout) return;
  
  flyout.classList.remove('active');
  
  // Wait for animation before hiding
  setTimeout(() => {
    flyout.style.display = 'none';
    document.body.style.overflow = '';
  }, 300);
}

// Open flyout on contact row click
contactRows.forEach(row => {
  row.addEventListener('click', (e) => {
    // Don't open if clicking on a link
    if (e.target.closest('a')) return;
    openFlyout(row);
  });

  // Add keyboard support
  row.setAttribute('tabindex', '0');
  row.setAttribute('role', 'button');
  row.setAttribute('aria-label', 'Open contact details');
  row.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openFlyout(row);
    }
  });
});

// Close flyout on overlay click
if (flyoutOverlay) {
  flyoutOverlay.addEventListener('click', closeFlyout);
}

// Close flyout on close button click
if (flyoutClose) {
  flyoutClose.addEventListener('click', (e) => {
    e.stopPropagation();
    closeFlyout();
  });
}

// Close flyout on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && flyout && flyout.classList.contains('active')) {
    closeFlyout();
  }
});

// ===== STUDIO GALERIEN: Mit Tabs, Zoom-Modal und Navigation =====
(function initGalleries() {
  const studioTabs = document.querySelectorAll('.studio-tab');
  const studioGalleries = document.querySelectorAll('.studio-gallery');
  const zoomModal = document.getElementById('gallery-zoom-modal');
  const zoomImage = document.getElementById('zoom-image');

  if (!studioTabs.length || !studioGalleries.length) return;

  let currentStudio = 'studio1';
  let modalIndex = 0;

  function switchStudio(studio) {
    currentStudio = studio;
    
    // Update tabs
    studioTabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.studio === studio);
      tab.setAttribute('aria-selected', tab.dataset.studio === studio);
    });

    // Update galleries
    studioGalleries.forEach(gallery => {
      gallery.classList.toggle('active', gallery.dataset.studio === studio);
    });
  }

  function openModal(studio, index) {
    currentStudio = studio;
    modalIndex = index;
    const gallery = document.getElementById(studio + '-gallery');
    const thumbs = gallery.querySelectorAll('.gallery-thumb');
    const imgSrc = thumbs[index].querySelector('img')?.src;
    if (imgSrc) {
      zoomImage.src = imgSrc;
      zoomModal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeModal() {
    zoomModal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function nextImage() {
    const gallery = document.getElementById(currentStudio + '-gallery');
    const thumbs = gallery.querySelectorAll('.gallery-thumb');
    modalIndex = (modalIndex + 1) % thumbs.length;
    const imgSrc = thumbs[modalIndex].querySelector('img')?.src;
    if (imgSrc) zoomImage.src = imgSrc;
  }

  function prevImage() {
    const gallery = document.getElementById(currentStudio + '-gallery');
    const thumbs = gallery.querySelectorAll('.gallery-thumb');
    modalIndex = (modalIndex - 1 + thumbs.length) % thumbs.length;
    const imgSrc = thumbs[modalIndex].querySelector('img')?.src;
    if (imgSrc) zoomImage.src = imgSrc;
  }

  // Studio Tab Clicks
  studioTabs.forEach(tab => {
    tab.addEventListener('click', () => switchStudio(tab.dataset.studio));
  });

  // Gallery Main Image Click → Open Modal
  studioGalleries.forEach(gallery => {
    const studio = gallery.dataset.studio;
    const mainImg = gallery.querySelector('.gallery-image');
    const thumbs = gallery.querySelectorAll('.gallery-thumb');

    // Click main image to zoom
    if (mainImg) {
      mainImg.addEventListener('click', () => openModal(studio, 0));
      mainImg.style.cursor = 'zoom-in';
    }

    // Click thumbnail to zoom
    thumbs.forEach((thumb, idx) => {
      thumb.addEventListener('click', () => openModal(studio, idx));
    });

    // Navigation buttons
    const prevBtn = gallery.querySelector('.gallery-nav--prev');
    const nextBtn = gallery.querySelector('.gallery-nav--next');
    if (prevBtn) prevBtn.addEventListener('click', () => {
      const currentIdx = parseInt(gallery.querySelector('.gallery-thumb.active')?.dataset.index || 0);
      const newIdx = (currentIdx - 1 + thumbs.length) % thumbs.length;
      updateGalleryDisplay(studio, newIdx);
    });
    if (nextBtn) nextBtn.addEventListener('click', () => {
      const currentIdx = parseInt(gallery.querySelector('.gallery-thumb.active')?.dataset.index || 0);
      const newIdx = (currentIdx + 1) % thumbs.length;
      updateGalleryDisplay(studio, newIdx);
    });
  });

  function updateGalleryDisplay(studio, index) {
    const gallery = document.getElementById(studio + '-gallery');
    const thumbs = gallery.querySelectorAll('.gallery-thumb');
    const mainImg = gallery.querySelector('.gallery-image');
    const counter = gallery.querySelector('.counter-current');

    // Update main image
    const selectedThumb = thumbs[index];
    if (selectedThumb && mainImg) {
      const thumbImg = selectedThumb.querySelector('img');
      if (thumbImg) mainImg.src = thumbImg.src;
    }

    // Update counter
    if (counter) counter.textContent = (index + 1);

    // Update active state
    thumbs.forEach((thumb, idx) => {
      thumb.classList.toggle('active', idx === index);
    });
  }

  // Modal Close Button
  document.querySelector('.gallery-zoom-modal__close')?.addEventListener('click', closeModal);
  
  // Modal Click Outside
  zoomModal?.addEventListener('click', (e) => {
    if (e.target === zoomModal) closeModal();
  });

  // Add Modal Navigation Buttons
  const modalContent = zoomModal?.querySelector('.gallery-zoom-modal__content');
  if (modalContent) {
    const prevBtn = document.createElement('button');
    prevBtn.className = 'modal-nav modal-nav--prev';
    prevBtn.innerHTML = '❮';
    prevBtn.addEventListener('click', prevImage);
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'modal-nav modal-nav--next';
    nextBtn.innerHTML = '❯';
    nextBtn.addEventListener('click', nextImage);
    
    modalContent.appendChild(prevBtn);
    modalContent.appendChild(nextBtn);
  }

  // Keyboard Navigation
  document.addEventListener('keydown', (e) => {
    if (!zoomModal?.classList.contains('active')) return;
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') prevImage();
    if (e.key === 'ArrowRight') nextImage();
  });

  // Initialize: Show first studio
  switchStudio('studio1');
})();

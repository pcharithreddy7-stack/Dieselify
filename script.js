const menuToggle = document.querySelector('[data-menu-toggle]');
const nav = document.querySelector('[data-nav]');

menuToggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('is-open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.querySelector('.sr-only').textContent = open ? 'Close navigation' : 'Open navigation';
});

nav?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

// Keep the navigation in sync with the section currently being read.
const navigationLinks = [...(nav?.querySelectorAll('a[href^="#"]') ?? [])];
const navigationSections = navigationLinks
  .map((link) => {
    const id = link.getAttribute('href')?.slice(1);
    return id ? document.getElementById(id) : null;
  })
  .filter(Boolean);

const setCurrentNavigationLink = (sectionId) => {
  navigationLinks.forEach((link) => {
    const isCurrent = link.getAttribute('href') === `#${sectionId}`;
    link.classList.toggle('is-current', isCurrent);
    if (isCurrent) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
};

const updateCurrentNavigationLink = () => {
  if (!navigationSections.length) return;
  const headerHeight = document.querySelector('[data-header]')?.offsetHeight ?? 80;
  const activationLine = headerHeight + (window.innerHeight * 0.35);
  let currentSection = navigationSections[0];

  navigationSections.forEach((section) => {
    if (section.getBoundingClientRect().top <= activationLine) currentSection = section;
  });

  setCurrentNavigationLink(currentSection.id);
};

let navigationTicking = false;
window.addEventListener('scroll', () => {
  if (navigationTicking) return;
  navigationTicking = true;
  window.requestAnimationFrame(() => {
    updateCurrentNavigationLink();
    navigationTicking = false;
  });
}, { passive: true });
window.addEventListener('resize', updateCurrentNavigationLink);
navigationLinks.forEach((link) => link.addEventListener('click', () => {
  const sectionId = link.getAttribute('href')?.slice(1);
  if (sectionId) setCurrentNavigationLink(sectionId);
}));
updateCurrentNavigationLink();

const servicesCarousel = document.querySelector('[data-services-carousel]');

if (servicesCarousel) {
  const viewport = servicesCarousel.querySelector('[data-services-viewport]');
  const track = servicesCarousel.querySelector('[data-services-track]');
  const cards = [...track.querySelectorAll('.service-card')];
  const dots = servicesCarousel.querySelector('[data-services-dots]');
  const previous = servicesCarousel.querySelector('[data-services-previous]');
  const next = servicesCarousel.querySelector('[data-services-next]');
  let page = 0;
  let restingScrollLeft = 0;
  let carouselReady = false;
  const updateTrackEdge = () => {
    viewport.classList.toggle('is-scrolling', viewport.scrollLeft > restingScrollLeft + 1);
  };

  const visibleCards = () => window.matchMedia('(max-width: 599px)').matches ? 1 : window.matchMedia('(max-width: 999px)').matches ? 4 : 2;
  const gap = () => window.matchMedia('(max-width: 599px)').matches ? 20 : window.matchMedia('(max-width: 999px)').matches ? 24 : window.matchMedia('(max-width: 1399px)').matches ? 21.33 : 24;
  const pageCount = () => Math.ceil(cards.length / visibleCards());
  const pageStep = () => {
    if (window.matchMedia('(max-width: 599px)').matches) return cards[0].getBoundingClientRect().width + gap();
    if (window.matchMedia('(max-width: 999px)').matches) return (cards[0].getBoundingClientRect().width + gap()) * 2;
    return (cards[0].getBoundingClientRect().width + gap()) * 2;
  };
  const moveTo = (nextPage, behavior = 'smooth') => {
    page = Math.max(0, Math.min(nextPage, pageCount() - 1));
    viewport.scrollTo({ left: page * pageStep(), behavior });
    updateControls();
  };
  const updateControls = () => {
    const count = pageCount();
    if (dots.childElementCount !== count) {
      dots.replaceChildren(...Array.from({ length: count }, (_, index) => {
        const dot = document.createElement('button');
        dot.className = 'services__dot';
        dot.type = 'button';
        dot.setAttribute('aria-label', `Show service page ${index + 1}`);
        dot.addEventListener('click', () => moveTo(index));
        return dot;
      }));
    }
    [...dots.children].forEach((dot, index) => dot.classList.toggle('is-active', index === page));
    previous.disabled = page === 0;
    next.disabled = page === count - 1;
  };

  previous.addEventListener('click', () => moveTo(page - 1));
  next.addEventListener('click', () => moveTo(page + 1));
  viewport.addEventListener('scroll', () => {
    if (carouselReady) updateTrackEdge();
    const current = Math.round(viewport.scrollLeft / pageStep());
    if (current !== page) { page = current; updateControls(); }
  }, { passive: true });
  window.setTimeout(() => {
    restingScrollLeft = viewport.scrollLeft;
    carouselReady = true;
    updateTrackEdge();
  }, 100);
  window.addEventListener('resize', () => moveTo(Math.min(page, pageCount() - 1), 'auto'));
  updateControls();
}

const quoteForm = document.querySelector('[data-quote-form]');
const quoteStatus = document.querySelector('[data-quote-status]');
const quoteSubmitButton = document.querySelector('[data-quote-submit]');

// This URL is public by design. Do not put an email-provider key, Supabase
// service-role key, or the recipient address in this file.
const QUOTE_FUNCTION_URL = 'https://zatrjfemuevgpwtgkbgt.supabase.co/functions/v1/submit-quote';

const showQuoteStatus = (message, isError = false) => {
  quoteStatus.textContent = message;
  quoteStatus.classList.toggle('is-error', isError);
};

quoteForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!quoteForm.reportValidity()) return;

  const formData = new FormData(quoteForm);
  const fields = ['name', 'phone', 'email', 'address', 'quantity', 'company', 'maps', 'note'];
  const payload = Object.fromEntries(fields.map((field) => [field, String(formData.get(field) || '').trim()]));
  const originalButtonText = quoteSubmitButton?.innerHTML;

  quoteSubmitButton.disabled = true;
  quoteSubmitButton.setAttribute('aria-busy', 'true');
  quoteSubmitButton.textContent = 'Sending…';
  showQuoteStatus('');

  try {
    const response = await fetch(QUOTE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: crypto.randomUUID(),
        website: String(formData.get('website') || ''),
        ...payload,
      }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.message || 'Unable to submit your request.');
    }

    showQuoteStatus('Thank you — your quote request has been sent to our team.');
    quoteForm.reset();
  } catch (error) {
    showQuoteStatus(error instanceof Error ? error.message : 'Unable to submit your request. Please try again.', true);
  } finally {
    quoteSubmitButton.disabled = false;
    quoteSubmitButton.removeAttribute('aria-busy');
    quoteSubmitButton.innerHTML = originalButtonText;
  }
});

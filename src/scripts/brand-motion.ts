import { gsap } from 'gsap';

const media = gsap.matchMedia();
media.add('(prefers-reduced-motion: no-preference)', () => {
  const context = gsap.context(() => {
    gsap.from('.topbar', { y: -12, opacity: .5, duration: .7, ease: 'power2.out' });
    gsap.from('.home-intro > *, .hero > *, .scr-head > *', { y: 18, opacity: .5, stagger: .07, duration: .8, ease: 'power3.out', clearProps: 'transform,opacity' });
  });
  const cards = [...document.querySelectorAll<HTMLElement>('.experiment-card, .chapter-card, .tile, .library-card, .res-card, .home-resource-grid > a')];
  const observer = new IntersectionObserver(entries => {
    const entering = entries.filter(entry => entry.isIntersecting).map(entry => entry.target);
    if (entering.length) context.add(() => gsap.from(entering, { y: 22, opacity: .6, stagger: .045, duration: .7, ease: 'power3.out', clearProps: 'transform,opacity' }));
    entering.forEach(card => observer.unobserve(card));
  }, { threshold: .08 });
  cards.forEach(card => observer.observe(card));
  const homeVisual = document.querySelector('.home-visual');
  if (homeVisual) observer.observe(homeVisual);
  const events = new AbortController();
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    cards.forEach(card => {
      const moveX = gsap.quickTo(card, 'rotationY', { duration: .5, ease: 'power3.out' });
      const moveY = gsap.quickTo(card, 'rotationX', { duration: .5, ease: 'power3.out' });
      card.addEventListener('pointermove', event => {
        const bounds = card.getBoundingClientRect();
        moveX(((event.clientX - bounds.left) / bounds.width - .5) * 4);
        moveY(-((event.clientY - bounds.top) / bounds.height - .5) * 4);
      }, { signal: events.signal });
      card.addEventListener('pointerleave', () => { moveX(0); moveY(0); }, { signal: events.signal });
    });
  }
  return () => {
    events.abort();
    observer.disconnect();
    cards.forEach(card => gsap.killTweensOf(card));
    context.revert();
  };
});
window.addEventListener('pagehide', event => { if (!event.persisted) media.revert(); });

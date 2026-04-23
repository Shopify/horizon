document.querySelectorAll('.timeline-row').forEach((timelineRow) => {
  const yearItems = timelineRow.querySelectorAll('li[data-year]');
  const slides = timelineRow.querySelectorAll('slideshow-slide');

  if (!yearItems.length || !slides.length) return;

  function showYear(year) {
    yearItems.forEach((item) => {
      item.classList.toggle('active', item.dataset.year === year);
    });

    let countForYear = 0;
    slides.forEach((slide) => {
      const slideYear = slide.querySelector('.timeline-item')?.dataset.timeline;
      if (slideYear === year) {
        slide.removeAttribute('hidden');
        countForYear++;
      } else {
        slide.setAttribute('hidden', '');
      }
    });

    if (countForYear === 1) {
      timelineRow.classList.add('one-item');
    } else {
      timelineRow.classList.remove('one-item');
    }
  }

  const activeYear =
    timelineRow.querySelector('li[data-year].active')?.dataset.year || yearItems[0]?.dataset.year;
  if (activeYear) showYear(activeYear);

  yearItems.forEach((item) => {
    item.addEventListener('click', () => showYear(item.dataset.year));
  });
});

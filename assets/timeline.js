const yearItems = document.querySelectorAll('li[data-year]');
const slides = document.querySelectorAll('slideshow-slide');
const timelineRow = document.querySelector('.timeline-row');

if (yearItems.length && slides.length) {
  function showYear(year) {
    yearItems.forEach(item => {
      item.classList.toggle('active', item.dataset.year === year);
    });

    // Count how many slides have this year
    let countForYear = 0;
    slides.forEach(slide => {
      const slideYear = slide.querySelector('.timeline-item')?.dataset.timeline;
      if (slideYear === year) {
        slide.removeAttribute('hidden');
        countForYear++;
      } else {
        slide.setAttribute('hidden', '');
      }
    });

    // Add/remove .one-item class based on count
    if (timelineRow) {
      if (countForYear === 1) {
        timelineRow.classList.add('one-item');
      } else {
        timelineRow.classList.remove('one-item');
      }
    }
  }

  // Set initial year
  const activeYear = document.querySelector('li[data-year].active')?.dataset.year || 
                     yearItems[0]?.dataset.year;
  if (activeYear) showYear(activeYear);

  // Add click handlers
  yearItems.forEach(item => {
    item.addEventListener('click', () => showYear(item.dataset.year));
  });
}
const header = document.querySelector('header')
const sectionOne = document.querySelector('.banner-image')

const sectionOneOptions = {
  rootMargin: "-100px 0px 0px 0px"
};

const observer = new IntersectionObserver(function(entries, sectionOneObserver) {
  entries.forEach(entry => {
    if(!entry.isIntersecting) {
      header.classList.add("nav-scrolled")

    }
    else {
      header.classList.remove('nav-scrolled')
    }
  })
},
sectionOneOptions);

observer.observe(sectionOne);

const navSlide = () => {
  const burger = document.querySelector('.burger');
  const nav = document.querySelector('.nav-links');
  const navLinks = document.querySelectorAll('.nav-links li');
  const html = document.querySelector('.html');
  const body = document.querySelector('.body');

  // Toggle Nav
  burger.addEventListener('click', () => {

    nav.classList.toggle('nav-active');
    html.classList.toggle('scroll-lock')
    body.classList.toggle('scroll-lock')
    nav.classList.toggle('navFade')


    // Animate links
    navLinks.forEach((link, index) => {
      if(link.style.animation) {
        link.style.animation = ''
      }
      else {
        link.style.animation = `navLinkFade 0.7 ease forwards ${index / 3 + 1}s`;
      }

  });
  //Burger animation
  burger.classList.toggle('toggle');

  });
}
navSlide();

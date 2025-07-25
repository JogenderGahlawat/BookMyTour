
document.addEventListener('DOMContentLoaded', function() {
    
    
    const hamburger = document.querySelector('.hamburger-menu');
    const navLinks = document.querySelector('.nav-links-wrapper');


    if (hamburger && navLinks) {
       
        hamburger.addEventListener('click', () => {
         
            navLinks.classList.toggle('active');
        });
    }

    document.addEventListener('click', function(event) {
        const openNavDetails = document.querySelector('.nav-details-item[open]');
        if (openNavDetails && !openNavDetails.contains(event.target)) {
            openNavDetails.removeAttribute('open');
        }

        const openFooterDetails = document.querySelector('.footer-details-item[open]');
        if (openFooterDetails && !openFooterDetails.contains(event.target)) {
            openFooterDetails.removeAttribute('open');
        }
    });

    document.querySelectorAll('.details-content').forEach(details => {
        details.addEventListener('click', function(event) {
            event.stopPropagation();
        });
    });

}); 
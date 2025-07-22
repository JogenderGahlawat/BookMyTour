document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger'); 
    const navLinksWrapper = document.querySelector('.nav-links-wrapper'); 
    if (hamburger && navLinksWrapper) {
        hamburger.addEventListener('click', function() {
            navLinksWrapper.classList.toggle('active'); 
        });
    } else {
        console.error("Hamburger or Nav Links Wrapper not found in DOM.");
    }
    const navDetailsElements = document.querySelectorAll('.nav-details-item');
    navDetailsElements.forEach(details => {
        details.addEventListener('toggle', function() {
            if (this.open) {
                navDetailsElements.forEach(otherDetails => {
                    if (otherDetails !== this && otherDetails.open) {
                        otherDetails.open = false;
                    }
                });
            }
        });
    });
    const footerDetailsElements = document.querySelectorAll('.footer-details-item');
    footerDetailsElements.forEach(details => {
        details.addEventListener('toggle', function() {
            if (this.open) {
                footerDetailsElements.forEach(otherDetails => {
                    if (otherDetails !== this && otherDetails.open) {
                        otherDetails.open = false;
                    }
                });
            }
        });
    });

});
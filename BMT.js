document.addEventListener('DOMContentLoaded', function() {

    // === Part 1: Hamburger Menu Functionality ===
    const hamburger = document.querySelector('.hamburger'); // Hamburger button ko dhoondo
    const navLinksWrapper = document.querySelector('.nav-links-wrapper'); // Menu container ko dhoondo

    // Agar dono elements milte hain toh hi code chalayenge
    if (hamburger && navLinksWrapper) {
        hamburger.addEventListener('click', function() {
            navLinksWrapper.classList.toggle('active'); // 'active' class add/remove karo
        });
    } else {
        console.error("Hamburger or Nav Links Wrapper not found in DOM."); // Agar elements nahi milte toh console mein error dikhega
    }


    // === Part 2: Navigation Details Items (Home, About Us, Contact) ---
    // (Aapka pehle wala code, details tags ke liye)
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

    // === Part 3: Footer Accordion Functionality ===
    // (Aapka footer details tags ke liye code)
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
/**
 * Wanderlust Client-Side Scripts
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Bootstrap 5 Form Validation
    const forms = document.querySelectorAll(".needs-validation");
    Array.from(forms).forEach((form) => {
        form.addEventListener(
            "submit",
            (event) => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add("was-validated");
            },
            false
        );
    });

    // 2. Tax Toggle Switch on Listings Page
    const taxSwitch = document.getElementById("taxSwitch");
    if (taxSwitch) {
        taxSwitch.addEventListener("change", () => {
            const basePrices = document.querySelectorAll(".price-base");
            const taxedPrices = document.querySelectorAll(".price-taxed");
            const taxBadges = document.querySelectorAll(".tax-badge");

            if (taxSwitch.checked) {
                basePrices.forEach((el) => el.classList.add("d-none"));
                taxedPrices.forEach((el) => el.classList.remove("d-none"));
                taxBadges.forEach((el) => el.classList.remove("d-none"));
            } else {
                basePrices.forEach((el) => el.classList.remove("d-none"));
                taxedPrices.forEach((el) => el.classList.add("d-none"));
                taxBadges.forEach((el) => el.classList.add("d-none"));
            }
        });
    }

    // 3. Interactive Star Rating Selector
    const starPicker = document.getElementById("starPicker");
    const ratingInput = document.getElementById("ratingInput");
    const ratingDisplay = document.getElementById("ratingDisplay");

    if (starPicker && ratingInput && ratingDisplay) {
        const starBtns = starPicker.querySelectorAll(".star-btn");

        const updateStars = (val) => {
            starBtns.forEach((star) => {
                const starVal = parseInt(star.getAttribute("data-val"));
                if (starVal <= val) {
                    star.classList.add("active");
                } else {
                    star.classList.remove("active");
                }
            });
            ratingDisplay.textContent = `${val} Star${val > 1 ? 's' : ''}`;
        };

        starBtns.forEach((star) => {
            star.addEventListener("mouseenter", () => {
                const hoverVal = parseInt(star.getAttribute("data-val"));
                updateStars(hoverVal);
            });

            star.addEventListener("click", () => {
                const clickVal = parseInt(star.getAttribute("data-val"));
                ratingInput.value = clickVal;
                updateStars(clickVal);
            });
        });

        starPicker.addEventListener("mouseleave", () => {
            const currentVal = parseInt(ratingInput.value) || 5;
            updateStars(currentVal);
        });
    }

    // 4. Live Image URL Preview (Create & Edit Forms)
    const imageUrlInput = document.getElementById("imageUrl");
    const imagePreviewContainer = document.getElementById("imagePreviewContainer");
    const imagePreview = document.getElementById("imagePreview");

    if (imageUrlInput && imagePreviewContainer && imagePreview) {
        const handleImagePreview = () => {
            const url = imageUrlInput.value.trim();
            if (url) {
                imagePreview.src = url;
                imagePreviewContainer.style.display = "block";
            } else if (!imagePreview.getAttribute("data-default-preview")) {
                // If input is empty and not on edit page with existing image
                imagePreviewContainer.style.display = "none";
            }
        };

        // Listen for input, paste, and change
        imageUrlInput.addEventListener("input", handleImagePreview);
        imageUrlInput.addEventListener("change", handleImagePreview);
        imageUrlInput.addEventListener("blur", handleImagePreview);

        // Check if initial value exists
        if (imageUrlInput.value.trim()) {
            imagePreviewContainer.style.display = "block";
        }
    }
});
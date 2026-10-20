/**
 * BLOCKBUSTER THEATRE - MODERN CORE JAVASCRIPT
 * Pure Vanilla JavaScript (No jQuery / Bootstrap dependencies)
 */

document.addEventListener('DOMContentLoaded', () => {
    initNavbar();
    initBackToTop();
    initHeroCarousel();
    initTrailerModal();
    initDateSelect();
    initAccordion();
    initContactForm();
    initComingSoonCountdowns();
    initGenreFilterAndSearch();
    initBookingWizard();
    initMoviePageShowtimes();
    initFooterCopyright();
});

/* ==========================================================================
   1. Header & Mobile Navigation
   ========================================================================== */
function initNavbar() {
    const header = document.querySelector('header');
    const hamburger = document.querySelector('.hamburger');
    const primaryNav = document.querySelector('.primary-nav');
    const overlay = document.querySelector('.ham-overlay');
    const lines = document.querySelectorAll('.hamburger .line');

    // Sticky header blur transition
    window.addEventListener('scroll', () => {
        if (window.scrollY > 30) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }
    });

    if (!hamburger) return;

    function toggleMenu() {
        const isOpen = primaryNav.classList.toggle('open');
        lines.forEach(l => l.classList.toggle('transition'));
        overlay?.classList.toggle('show');
        document.body.classList.toggle('noScroll', isOpen);
    }

    function closeMenu() {
        primaryNav?.classList.remove('open');
        lines.forEach(l => l.classList.remove('transition'));
        overlay?.classList.remove('show');
        document.body.classList.remove('noScroll');
    }

    hamburger.addEventListener('click', toggleMenu);
    overlay?.addEventListener('click', closeMenu);

    // Close menu on nav item click on mobile
    primaryNav?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
}

// Global fallback for inline legacy onclick="off()"
window.off = function () {
    const primaryNav = document.querySelector('.primary-nav');
    const overlay = document.querySelector('.ham-overlay');
    const lines = document.querySelectorAll('.hamburger .line');
    primaryNav?.classList.remove('open');
    lines.forEach(l => l.classList.remove('transition'));
    overlay?.classList.remove('show');
    document.body.classList.remove('noScroll');
};

/* ==========================================================================
   2. Back to Top Button
   ========================================================================== */
function initBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top') || document.querySelector('.back-to-top');
    if (!backToTopBtn) return;

    window.addEventListener('scroll', () => {
        if (window.scrollY > 350) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    backToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

// Global fallback for legacy onClick="topFunction()"
window.topFunction = function () {
    window.scrollTo({top: 0, behavior: 'smooth'});
};

/* ==========================================================================
   3. Modern Hero Carousel / Slider
   ========================================================================== */
function initHeroCarousel() {
    const carousel = document.getElementById('picturecarousel') || document.querySelector('.carousel.slide');
    if (!carousel) return;

    const items = carousel.querySelectorAll('.carousel-inner .item');
    const indicators = carousel.querySelectorAll('.carousel-indicators li');
    const prevBtn = carousel.querySelector('.carousel-control.left');
    const nextBtn = carousel.querySelector('.carousel-control.right');

    if (!items.length) return;

    let currentIndex = 0;
    let autoplayTimer = null;

    function showSlide(index) {
        if (index < 0) index = items.length - 1;
        if (index >= items.length) index = 0;

        items.forEach((item, idx) => {
            item.classList.toggle('active', idx === index);
        });

        indicators.forEach((indicator, idx) => {
            indicator.classList.toggle('active', idx === index);
        });

        currentIndex = index;
    }

    function nextSlide() {
        showSlide(currentIndex + 1);
    }

    function prevSlide() {
        showSlide(currentIndex - 1);
    }

    function startAutoplay() {
        stopAutoplay();
        autoplayTimer = setInterval(nextSlide, 6000);
    }

    function stopAutoplay() {
        if (autoplayTimer) {
            clearInterval(autoplayTimer);
            autoplayTimer = null;
        }
    }

    prevBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        prevSlide();
        startAutoplay();
    });

    nextBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        nextSlide();
        startAutoplay();
    });

    indicators.forEach((indicator, idx) => {
        indicator.addEventListener('click', () => {
            showSlide(idx);
            startAutoplay();
        });
    });

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);

    startAutoplay();
}


/* ==========================================================================
   4. Universal Trailer Lightbox Modal
   ========================================================================== */
function initTrailerModal() {
    let modal = document.getElementById('trailer-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'trailer-modal';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
      <div class="modal-dialog">
        <button class="modal-close-btn" aria-label="Close trailer">&times;</button>
        <iframe id="trailer-iframe" src="" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    `;
        document.body.appendChild(modal);

        const closeBtn = modal.querySelector('.modal-close-btn');
        const iframe = modal.querySelector('#trailer-iframe');

        function closeModal() {
            modal.classList.remove('open');
            iframe.src = '';
            document.body.classList.remove('noScroll');
        }

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
        });
    }

    // Attach click listener for any trailer trigger
    document.querySelectorAll('[data-trailer]').forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const url = trigger.getAttribute('data-trailer');
            openTrailer(url);
        });
    });
}

function openTrailer(videoUrl) {
    const modal = document.getElementById('trailer-modal');
    const iframe = document.getElementById('trailer-iframe');
    if (!modal || !iframe) return;

    // Ensure autoplay query is present
    const embedUrl = videoUrl.includes('autoplay=1') ? videoUrl : (videoUrl.includes('?') ? `${videoUrl}&autoplay=1` : `${videoUrl}?autoplay=1`);
    iframe.src = embedUrl;
    modal.classList.add('open');
    document.body.classList.add('noScroll');
}

/* ==========================================================================
   5. Date Selection Populate
   ========================================================================== */
function initDateSelect() {
    const select = document.getElementById('dateSelect');
    if (!select) return;

    const today = new Date();
    const formatter = new Intl.DateTimeFormat('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);

        const formattedDate = formatter.format(d).replace(/,/g, '');

        const option = document.createElement('option');
        option.value = formattedDate;
        option.textContent = formattedDate;
        select.appendChild(option);
    }
}

/* ==========================================================================
   6. Accordion (about.html FAQs)
   ========================================================================== */
function initAccordion() {
    const accordions = document.querySelectorAll('.accordion');
    accordions.forEach(acc => {
        // Add chevron SVG icon if not present
        if (!acc.querySelector('.chevron')) {
            const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            chevron.setAttribute('class', 'chevron');
            chevron.setAttribute('viewBox', '0 0 24 24');
            chevron.setAttribute('fill', 'none');
            chevron.setAttribute('stroke', 'currentColor');
            chevron.setAttribute('stroke-width', '2.5');
            chevron.setAttribute('stroke-linecap', 'round');
            chevron.setAttribute('stroke-linejoin', 'round');
            chevron.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';
            acc.appendChild(chevron);
        }

        acc.addEventListener('click', function () {
            this.classList.toggle('active');
            const panel = this.nextElementSibling;
            if (panel && panel.classList.contains('panel')) {
                panel.classList.toggle('open');
                if (panel.classList.contains('open')) {
                    panel.style.maxHeight = panel.scrollHeight + 40 + 'px';
                } else {
                    panel.style.maxHeight = '0px';
                }
            }
        });
    });
}

/* ==========================================================================
   7. Contact Form Toast Feedback
   ========================================================================== */
function initContactForm() {
    const contactForm = document.getElementById('contact-form') || document.querySelector('.contact-card form');
    if (!contactForm) return;

    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        showToast('Message sent! Our box office team will be in touch shortly.');
        contactForm.reset();
    });
}

function showToast(message) {
    let toast = document.getElementById('cinema-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'cinema-toast';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.innerHTML = `<span></span> <span>${message}</span>`;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}

/* ==========================================================================
   8. Coming Soon Dynamic Countdowns
   ========================================================================== */
function initComingSoonCountdowns() {
    const countdownElements = document.querySelectorAll('[data-countdown], .poster-column .overlay p[id]');
    if (!countdownElements.length) return;

    // Set realistic future premiere dates
    const futureDates = {
        'Captain_Marvel': new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 7 * 60 * 60 * 1000),
        'Avengers': new Date(Date.now() + 28 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000),
        'Godzilla': new Date(Date.now() + 45 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        'Dark_Phoenix': new Date(Date.now() + 60 * 24 * 60 * 60 * 1000 + 18 * 60 * 60 * 1000),
        'Toy_Story_4': new Date(Date.now() + 75 * 24 * 60 * 60 * 1000 + 5 * 60 * 60 * 1000),
        'Lion_King': new Date(Date.now() + 90 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
        'default': new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)
    };

    function updateTimers() {
        countdownElements.forEach(el => {
            const id = el.id || el.getAttribute('data-countdown');
            const targetDate = futureDates[id] || futureDates['default'];
            const distance = targetDate.getTime() - Date.now();

            if (distance < 0) {
                el.textContent = 'NOW SHOWING!';
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            el.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        });
    }

    updateTimers();
    setInterval(updateTimers, 1000);
}

/* ==========================================================================
   9. Now Showing Genre Filter & Search Bar
   ========================================================================== */
function initGenreFilterAndSearch() {
    const searchInput = document.getElementById('movie-search-input');
    const genreTabs = document.querySelectorAll('.genre-tab');
    const movieCards = document.querySelectorAll('.poster-section .poster-column');

    if (!movieCards.length) return;

    let activeGenre = 'all';
    let searchTerm = '';

    function filterCards() {
        movieCards.forEach(card => {
            const title = (card.querySelector('.overlay-text')?.textContent || '').toLowerCase();
            const genre = (card.getAttribute('data-genre') || '').toLowerCase();

            const matchesSearch = title.includes(searchTerm);
            const matchesGenre = (activeGenre === 'all') || (genre === activeGenre);

            if (matchesSearch && matchesGenre) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }

    searchInput?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase().trim();
        filterCards();
    });

    genreTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            genreTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            activeGenre = tab.getAttribute('data-genre') || 'all';
            filterCards();
        });
    });
}

/* ==========================================================================
   10. Interactive Ticket Booking Flow (bookNow.html)
   ========================================================================== */
async function populateMovieSelect() {
    const movieSelect = document.getElementById('Movie');
    if (!movieSelect) return;

    try {
        const response = await fetch(window.APP_CONFIG.moviesApiUrl);
        if (!response.ok) throw new Error('Unable to load movie list');

        const data = await response.json();
        if (!Array.isArray(data.movies)) throw new Error('Invalid movie list response');

        const sortedMovies = [...data.movies]
            .filter(movie => movie.visible !== false && movie.isComingSoon !== true)
            .sort((a, b) => a.title.localeCompare(b.title, undefined, {sensitivity: 'base'}));

        const placeholder = movieSelect.querySelector('option[value="Please Select"]');
        if (placeholder) placeholder.disabled = true;

        sortedMovies.forEach(movie => {
            const option = document.createElement('option');
            option.value = movie.title;
            option.textContent = movie.title;
            movieSelect.appendChild(option);
        });

        const urlParams = new URLSearchParams(window.location.search);
        const movieParam = urlParams.get('movie');
        if (movieParam) {
            const matchingOption = Array.from(movieSelect.options).find(option =>
                option.value.toLowerCase() === movieParam.toLowerCase() ||
                option.text.toLowerCase() === movieParam.toLowerCase()
            );

            if (matchingOption) {
                movieSelect.value = matchingOption.value;
            }
        }

        return sortedMovies;
    } catch (error) {
        console.error(error);
        movieSelect.innerHTML = '<option value="Please Select" disabled selected>Unable to load movie list</option>';
        return [];
    }
}

async function initBookingWizard() {
    const form = document.getElementById('myForm');
    if (!form) return;

    const movies = await populateMovieSelect();

    const fieldsets = form.querySelectorAll('fieldset');
    const progressItems = document.querySelectorAll('#progressbar li');
    let currentStep = 0;

    // Pricing constants (£)
    const PRICES = {
        adult: 9.50,
        child: 6.00,
        student: 7.50,
        oap: 7.00
    };

    // Booking State
    const bookingState = {
        movie: '',
        date: '',
        time: '',
        tickets: {
            adult: 1,
            child: 0,
            student: 0,
            oap: 0
        },
        totalTickets: 1,
        totalPrice: 9.50,
        selectedSeats: [],
        customer: {
            fname: '',
            sname: '',
            email: '',
            phone: ''
        },
        bookingRef: 'BBT-' + Math.floor(100000 + Math.random() * 900000)
    };

    // Synchronize initial & selected date value into booking state
    const dateSelect = document.getElementById('dateSelect');
    const timeInput = document.getElementById('Time');
    const showtimeContainer = document.querySelector('.showtime-chips');

    function getSelectedWeekday() {
        if (!dateSelect?.value) return '';

        const weekdayMap = {
            Mon: 'Monday',
            Tue: 'Tuesday',
            Wed: 'Wednesday',
            Thu: 'Thursday',
            Fri: 'Friday',
            Sat: 'Saturday',
            Sun: 'Sunday'
        };

        return weekdayMap[dateSelect.value.slice(0, 3)] || '';
    }

    function renderShowtimes(selectedTime = '') {
        if (!showtimeContainer) return;

        const selectedMovie = movies.find(movie => movie.title === movieSelect?.value);
        const weekday = getSelectedWeekday();
        const showtimes = selectedMovie?.showtimes?.[weekday] || [];
        bookingState.time = showtimes.includes(selectedTime) ? selectedTime : '';

        if (timeInput) timeInput.value = bookingState.time;
        showtimeContainer.innerHTML = showtimes.length
            ? showtimes.map(time => `<button type="button" class="time-chip${time === bookingState.time ? ' active' : ''}" data-time="${time}">${time}</button>`).join('')
            : '<span class="showtime-placeholder">No showtimes available for this film and day.</span>';

        showtimeContainer.querySelectorAll('.time-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                showtimeContainer.querySelectorAll('.time-chip').forEach(item => item.classList.remove('active'));
                chip.classList.add('active');
                bookingState.time = chip.dataset.time;
                if (timeInput) timeInput.value = bookingState.time;
            });
        });
    }

    if (dateSelect) {
        if (dateSelect.value) bookingState.date = dateSelect.value;
        dateSelect.addEventListener('change', () => {
            bookingState.date = dateSelect.value;
            renderShowtimes();
        });
    }

    // URL Parameter auto-prefill (e.g. bookNow.html?movie=Infinity_War&day=Fri 20 Sep 2026&time=19:00)
    const urlParams = new URLSearchParams(window.location.search);
    const movieParam = urlParams.get('movie');
    const timeParam = urlParams.get('time');
    const dayParam = urlParams.get('day');

    const movieSelect = document.getElementById('Movie');
    if (movieSelect && movieParam) {
        const matchingOption = Array.from(movieSelect.options).find(option =>
            option.value.toLowerCase() === movieParam.toLowerCase() ||
            option.text.toLowerCase() === movieParam.toLowerCase()
        );

        if (matchingOption) {
            movieSelect.value = matchingOption.value;
            bookingState.movie = matchingOption.value;
        }
    }

    if (dateSelect && dayParam) {
        const matchingDate = Array.from(dateSelect.options).find(option =>
            option.value.toLowerCase() === dayParam.toLowerCase()
        );

        if (matchingDate) {
            dateSelect.value = matchingDate.value;
            bookingState.date = matchingDate.value;
        }
    }

    renderShowtimes(timeParam || '');

    // Update initial active fieldset
    function updateStep(newStep) {
        if (newStep < 0 || newStep >= fieldsets.length) return;

        fieldsets[currentStep]?.classList.remove('active');
        fieldsets[currentStep]?.style.setProperty('display', 'none');

        fieldsets[newStep]?.style.setProperty('display', 'block');
        setTimeout(() => {
            fieldsets[newStep]?.classList.add('active');
        }, 10);

        // Update Stepper indicators
        progressItems.forEach((item, idx) => {
            item.classList.toggle('active', idx <= newStep);
            item.classList.toggle('completed', idx < newStep);
        });

        currentStep = newStep;

        const progressSection = document.getElementById('progressbar');
        const headerOffset = 100;

        const sectionTop = progressSection.getBoundingClientRect().top + window.scrollY;

        window.scrollTo({
            top: sectionTop - headerOffset,
            behavior: 'smooth'
        });

        // When reaching Step 5 (Confirmation), show the wallet pass action
        if (currentStep === 4) {
            renderWalletPassAction();
        }
    }

    // Movie Dropdown Change Listener
    movieSelect?.addEventListener('change', () => {
        bookingState.movie = movieSelect.value;
        renderShowtimes();
    });

    // Ticket Counter Buttons (+ / -)
    function recalculateTotals() {
        let totalCount = 0;
        let totalPrice = 0;

        Object.keys(bookingState.tickets).forEach(type => {
            const count = bookingState.tickets[type];
            totalCount += count;
            totalPrice += count * PRICES[type];
        });

        // Ensure at least 1 ticket
        if (totalCount === 0) {
            bookingState.tickets.adult = 1;
            totalCount = 1;
            totalPrice = PRICES.adult;
            const adultValEl = document.getElementById('val-adult');
            if (adultValEl) adultValEl.textContent = '1';
        }

        bookingState.totalTickets = totalCount;
        bookingState.totalPrice = totalPrice;

        // Update live subtotal displays
        const subtotalDisplay = document.getElementById('booking-subtotal-price');
        const ticketCountDisplay = document.getElementById('booking-ticket-count');
        if (subtotalDisplay) subtotalDisplay.textContent = `£${totalPrice.toFixed(2)}`;
        if (ticketCountDisplay) ticketCountDisplay.textContent = `${totalCount} Seat${totalCount > 1 ? 's' : ''}`;

        // Update Seat Map Prompt
        const seatPrompt = document.getElementById('seat-selection-prompt');
        if (seatPrompt) {
            seatPrompt.textContent = `Please choose exactly ${totalCount} seat${totalCount > 1 ? 's' : ''} on the map below.`;
        }
    }

    document.querySelectorAll('.counter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.getAttribute('data-type');
            const action = btn.getAttribute('data-action');
            const valEl = document.getElementById(`val-${type}`);
            if (!type || !valEl) return;

            if (action === 'plus') {
                if (bookingState.tickets[type] < 10) {
                    bookingState.tickets[type]++;
                }
            } else if (action === 'minus') {
                if (bookingState.tickets[type] > 0) {
                    bookingState.tickets[type]--;
                }
            }

            valEl.textContent = bookingState.tickets[type];
            recalculateTotals();
        });
    });

    // Step 2: Interactive Seat Map
    const seats = document.querySelectorAll('.seat:not(.seat-spacer)');
    const seatBadge = document.getElementById('selected-seats-text');

    seats.forEach((seat, index) => {
        // Generate row letter & seat number if not set
        const row = String.fromCharCode(65 + Math.floor(index / 10));
        const seatNum = (index % 10) + 1;
        const seatLabel = `${row}${seatNum}`;
        seat.setAttribute('data-seat-id', seatLabel);
        seat.title = `Seat ${seatLabel}`;

        seat.addEventListener('click', () => {
            if (seat.classList.contains('booked-seat')) {
                showToast('This seat is already reserved. Please choose another.');
                return;
            }

            const isSelected = seat.classList.contains('selected-seat');

            if (!isSelected) {
                // Enforce ticket count limit
                if (bookingState.selectedSeats.length >= bookingState.totalTickets) {
                    // Deselect the first selected seat to make room
                    const firstSelected = bookingState.selectedSeats.shift();
                    const firstEl = document.querySelector(`.seat[data-seat-id="${firstSelected}"]`);
                    firstEl?.classList.remove('selected-seat');
                }
                seat.classList.add('selected-seat');
                bookingState.selectedSeats.push(seatLabel);
            } else {
                seat.classList.remove('selected-seat');
                bookingState.selectedSeats = bookingState.selectedSeats.filter(s => s !== seatLabel);
            }

            // Update selected seats text
            if (seatBadge) {
                seatBadge.textContent = bookingState.selectedSeats.length
                    ? bookingState.selectedSeats.join(', ')
                    : 'None selected yet';
            }
        });
    });

    // Step 3 & 4: Customer Details & Credit Card Live Preview
    const cardNumInput = document.getElementById('card-number-input');
    const cardHolderInput = document.getElementById('card-holder-input');
    const cardExpiryInput = document.getElementById('card-expiry-input');

    const cardNumDisplay = document.getElementById('mockup-card-number');
    const cardHolderDisplay = document.getElementById('mockup-card-holder');
    const cardExpiryDisplay = document.getElementById('mockup-card-expiry');

    cardNumInput?.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 16);
        val = val.replace(/(\d{4})/g, '$1 ').trim();
        e.target.value = val;
        if (cardNumDisplay) {
            cardNumDisplay.textContent = val.padEnd(19, '•');
        }
    });

    cardHolderInput?.addEventListener('input', (e) => {
        if (cardHolderDisplay) {
            cardHolderDisplay.textContent = e.target.value.toUpperCase() || 'YOUR NAME';
        }
    });

    cardExpiryInput?.addEventListener('input', (e) => {
        let val = e.target.value.replace(/\D/g, '').substring(0, 4);
        if (val.length >= 2) {
            val = val.substring(0, 2) + '/' + val.substring(2);
        }
        e.target.value = val;
        if (cardExpiryDisplay) {
            cardExpiryDisplay.textContent = val || 'MM/YY';
        }
    });

    // Next and Previous Button Handlers
    form.querySelectorAll('.form-button.next').forEach(btn => {
        btn.addEventListener('click', () => {
            if (currentStep === 0) {
                if (!bookingState.movie && movieSelect) {
                    bookingState.movie = movieSelect.value;
                }
            }

            if (currentStep === 2) {
                const fname = document.getElementById('Fname')?.value.trim();
                const sname = document.getElementById('Sname')?.value.trim();
                const email = document.getElementById('email')?.value.trim();
                const phone = document.getElementById('phone')?.value.trim();

                bookingState.customer = {fname, sname, email, phone};
            }

            updateStep(currentStep + 1);
        });
    });

    form.querySelectorAll('.form-button.previous').forEach(btn => {
        btn.addEventListener('click', () => {
            updateStep(currentStep - 1);
        });
    });

    // Step 5: Render wallet pass action
    function renderWalletPassAction() {
        const ticketContainer = document.getElementById('digital-ticket-container');
        if (!ticketContainer) return;

        ticketContainer.innerHTML = `
      <div class="ticket-pass">
        <div class="ticket-pass-header">
          <div class="ticket-pass-brand">BLOCKBUSTER THEATRE</div>
          <div class="ticket-pass-status">CONFIRMED BOOKING</div>
        </div>
        <div class="ticket-pass-body">
          <div class="ticket-movie-title">${bookingState.movie}</div>
          
          <div class="ticket-details-grid">
            <div class="ticket-detail-item">
              <span>Date & Showtime</span>
              <strong>${bookingState.date} at ${bookingState.time}</strong>
            </div>
            <div class="ticket-detail-item">
              <span>Screen / Hall</span>
              <strong>Screen 1 (Dolby Atmos)</strong>
            </div>
            <div class="ticket-detail-item">
              <span>Seat Numbers</span>
              <strong>${bookingState.selectedSeats.join(', ') || 'General Admission'}</strong>
            </div>
            <div class="ticket-detail-item">
              <span>Total Paid</span>
              <strong style="color: var(--accent-gold);">£${bookingState.totalPrice.toFixed(2)}</strong>
            </div>
            <div class="ticket-detail-item">
              <span>Guest Name</span>
              <strong>${bookingState.customer.fname} ${bookingState.customer.sname}</strong>
            </div>
            <div class="ticket-detail-item">
              <span>Ticket Breakdown</span>
              <strong>${bookingState.totalTickets} Ticket${bookingState.totalTickets > 1 ? 's' : ''}</strong>
            </div>
          </div>

          <div class="ticket-perforation">
            <div class="ticket-perforation-line"></div>
          </div>

          <div class="ticket-barcode-area">
            <div class="ticket-booking-ref">REF: ${bookingState.bookingRef}</div>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 14px; justify-content: center; margin-top: 20px; flex-wrap: wrap; align-items: center;">
        <!-- Apple Wallet Button -->
        <button type="button" class="wallet-badge-btn wallet-pass-button" aria-label="Add to Apple Wallet" data-wallet="apple">
          <img src="assets/images/icons/add-to-apple-wallet.svg" alt="Add to Apple Wallet">
        </button>

        <!-- Google Wallet Button -->
        <button type="button" class="wallet-badge-btn wallet-pass-button" aria-label="Add to Google Wallet" data-wallet="google">
          <img src="assets/images/icons/add-to-google-wallet.svg" alt="Add to Google Wallet">
        </button>
        
        <button type="button" class="form-button previous home" onclick="window.location.href='index.html'">Back to Home</button>
      </div>
    `;

        ticketContainer.querySelectorAll('.wallet-pass-button').forEach(button => {
            button.addEventListener('click', (e) => {
                // e.currentTarget guarantees you always catch the button's data-wallet attribute
                const walletType = e.currentTarget.dataset.wallet;
                generateWalletPass(walletType);
            });
        });
    }

    async function generateWalletPass(walletType) {
        const walletWorkerUrl = 'https://blockbuster-wallet-proxy.niallmclaughlin1998.workers.dev/';
        if (walletWorkerUrl.includes('<your-subdomain>')) {
            showToast('Add your Cloudflare Worker URL before using the wallet pass.');
            return;
        }

        const walletButton = document.querySelector(`[data-wallet="${walletType}"]`);
        const originalButtonContent = walletButton?.innerHTML;
        document.querySelectorAll('.wallet-pass-button').forEach(button => {
            button.disabled = true;
        });
        if (walletButton) walletButton.textContent = 'Preparing Wallet Pass...';

        const ticketPayload = {
            barcodeValue: bookingState.bookingRef,
            barcodeFormat: 'QR',
            logoText: 'Blockbuster Theatre',
            colorPreset: 'dark',
            expirationDays: 2,
            color: '#9d243b',
            logoURL: new URL('assets/Images/logo-hi-res.png', document.baseURI).href,
            iconURL: new URL('assets/Images/logo-hi-res.png', document.baseURI).href,
            primaryFields: [{label: 'Movie', value: bookingState.movie}],
            secondaryFields: [
                {label: 'Date', value: bookingState.date},
                {label: 'Time', value: bookingState.time}
            ],
            headerFields: [
                {label: 'Seat(s)', value: bookingState.selectedSeats.join(', ')},
                {label: 'Screen', value: '1'}
            ],
            backFields: [
                {label: 'Total Paid', value: `£${bookingState.totalPrice.toFixed(2)}`},
                {label: 'Guest Name', value: `${bookingState.customer.fname} ${bookingState.customer.sname}`},
                {label: 'Booking Ref', value: bookingState.bookingRef}
            ],
            locations: [{
                latitude: 55.044358,
                longitude: -7.276147,
                relevantText: 'Blockbuster Theatre'
            }]
        };

        try {
            const response = await fetch(walletWorkerUrl, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(ticketPayload)
            });

            const passData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(passData.error || `Wallet pass request failed: ${response.status}`);
            }

            if (walletType === 'apple' && passData.applePass) {
                const passBytes = Uint8Array.from(atob(passData.applePass), character => character.charCodeAt(0));
                const passBlob = new Blob([passBytes], {type: 'application/vnd.apple.pkpass'});
                const passUrl = URL.createObjectURL(passBlob);
                const downloadLink = document.createElement('a');
                downloadLink.href = passUrl;
                downloadLink.download = `${bookingState.bookingRef}.pkpass`;
                downloadLink.click();
                setTimeout(() => URL.revokeObjectURL(passUrl), 1000);
            } else if (walletType === 'google' && passData.googleSaveUrl) {
                window.location.href = passData.googleSaveUrl;
            } else if (passData.shareUrl) {
                window.location.href = passData.shareUrl;
            } else {
                throw new Error(`${walletType} wallet data was not returned. Response: ${JSON.stringify(passData)}`);
            }
        } catch (error) {
            console.error(error);
            showToast('The wallet pass could not be created. Please try again.');
            document.querySelectorAll('.wallet-pass-button').forEach(button => {
                button.disabled = false;
            });
            if (walletButton && originalButtonContent) walletButton.innerHTML = originalButtonContent;
        }
    }

    // Initialize first step calculation
    recalculateTotals();
}

/* ==========================================================================
   11. Movie Detail Page Showtime Direct Booking
  ========================================================================== */
function initMoviePageShowtimes() {
    document.querySelectorAll('.show-time').forEach(item => {
        item.addEventListener('click', () => {
            const movieTitle = document.querySelector('.carousel-caption.movie h1')?.textContent.trim() || '';
            const time = item.textContent.trim();
            const targetUrl = `../../bookNow.html?movie=${encodeURIComponent(movieTitle)}&time=${encodeURIComponent(time)}`;
            window.location.href = targetUrl;
        });
    });
}

/* ==========================================================================
   12. Dynamic Footer Copyright
  ========================================================================== */
function initFooterCopyright() {
    const currentYear = new Date().getFullYear();
    const copyrightElements = document.querySelectorAll('footer small, .copyright small, small');

    copyrightElements.forEach(el => {
        if (el.innerHTML.includes('&copy;') || el.innerHTML.includes('©')) {
            el.innerHTML = `&copy; ${currentYear} Blockbuster Theatre`;
        }
    });
}
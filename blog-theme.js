(() => {
    const state = {
        revealObserver: null
    };

    function initMobileMenu() {
        const mobileMenuBtn = document.getElementById("mobile-menu-btn");
        const mobileMenu = document.getElementById("mobile-menu");
        const mobileMenuClose = document.getElementById("mobile-menu-close");
        const mobileNavLinks = document.querySelectorAll(".mobile-nav-link");

        if (!mobileMenuBtn || !mobileMenu) return;

        function toggleMobileMenu() {
            const isOpen = mobileMenu.classList.contains("active");
            if (isOpen) {
                mobileMenu.classList.remove("active");
                mobileMenuBtn.classList.remove("active");
                document.body.classList.remove("menu-open");
                document.body.style.overflow = "";
            } else {
                mobileMenu.classList.add("active");
                mobileMenuBtn.classList.add("active");
                document.body.classList.add("menu-open");
                document.body.style.overflow = "hidden";
            }
        }

        mobileMenuBtn.addEventListener("click", toggleMobileMenu);

        if (mobileMenuClose) {
            mobileMenuClose.addEventListener("click", () => {
                mobileMenu.classList.remove("active");
                mobileMenuBtn.classList.remove("active");
                document.body.classList.remove("menu-open");
                document.body.style.overflow = "";
            });
        }

        mobileNavLinks.forEach((link) => {
            link.addEventListener("click", () => {
                mobileMenu.classList.remove("active");
                mobileMenuBtn.classList.remove("active");
                document.body.classList.remove("menu-open");
                document.body.style.overflow = "";
            });
        });
    }

    function initHeaderScroll() {
        const headerNav = document.getElementById("main-nav");
        if (!headerNav) return;

        window.addEventListener("scroll", () => {
            if (window.scrollY > 20) {
                headerNav.classList.remove("bg-transparent", "border-transparent");
                headerNav.classList.add("bg-bgSky/60", "backdrop-blur-xl", "border-borderSubtle");
            } else {
                headerNav.classList.add("bg-transparent", "border-transparent");
                headerNav.classList.remove("bg-bgSky/60", "backdrop-blur-xl", "border-borderSubtle");
            }
        });
    }

    function initRevealObserver() {
        state.revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) entry.target.classList.add("active");
            });
        }, { threshold: 0.1 });
    }

    function observeRevealElements(root = document) {
        if (!state.revealObserver) return;
        root.querySelectorAll(".reveal, .reveal-from-left, .reveal-from-right").forEach((el) => {
            state.revealObserver.observe(el);
        });
    }

    function initScrollTop() {
        const scrollTopBtn = document.getElementById("scrollTopBtn");
        if (!scrollTopBtn) return;

        window.addEventListener("scroll", () => {
            if (window.scrollY > 300) {
                scrollTopBtn.classList.remove("opacity-0", "pointer-events-none");
                scrollTopBtn.classList.add("opacity-100");
            } else {
                scrollTopBtn.classList.add("opacity-0", "pointer-events-none");
                scrollTopBtn.classList.remove("opacity-100");
            }
        });
    }

    function initParticles() {
        const isTouchDevice = window.matchMedia("(pointer: coarse)").matches || window.innerWidth <= 768;
        const canvas = document.getElementById("bg-canvas");
        if (!canvas || isTouchDevice) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width;
        let height;
        let particles = [];
        const mouse = { x: null, y: null, radius: 150 };

        window.addEventListener("mousemove", (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });

        window.addEventListener("mouseout", () => {
            mouse.x = null;
            mouse.y = null;
        });

        function resize() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            particles = [];
            const count = Math.min(Math.floor(width * height / 15000), 100);
            for (let i = 0; i < count; i += 1) {
                particles.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: (Math.random() - 0.5) * 0.5,
                    baseRadius: Math.random() * 1.5 + 0.5,
                    radius: Math.random() * 1.5 + 0.5
                });
            }
        }

        function animate() {
            ctx.clearRect(0, 0, width, height);
            for (let i = 0; i < particles.length; i += 1) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                if (p.x < 0 || p.x > width) p.vx = -p.vx;
                if (p.y < 0 || p.y > height) p.vy = -p.vy;

                if (mouse.x != null) {
                    const dx = mouse.x - p.x;
                    const dy = mouse.y - p.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < mouse.radius) {
                        p.x -= (dx / d) * ((mouse.radius - d) / mouse.radius) * 2;
                        p.y -= (dy / d) * ((mouse.radius - d) / mouse.radius) * 2;
                        p.radius = p.baseRadius * 2;
                    } else {
                        p.radius = p.baseRadius;
                    }
                } else {
                    p.radius = p.baseRadius;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.fillStyle = "rgba(115, 240, 209, 0.6)";
                ctx.fill();

                for (let j = i; j < particles.length; j += 1) {
                    const q = particles[j];
                    const dx = p.x - q.x;
                    const dy = p.y - q.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 120) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(115, 240, 209, ${0.15 - (dist / 120) * 0.15})`;
                        ctx.lineWidth = 0.5;
                        ctx.moveTo(p.x, p.y);
                        ctx.lineTo(q.x, q.y);
                        ctx.stroke();
                    }
                }
            }
            requestAnimationFrame(animate);
        }

        window.addEventListener("resize", resize);
        resize();
        animate();
    }

    function initCursorGlow() {
        const cursorGlow = document.getElementById("cursor-glow");
        if (!cursorGlow || window.innerWidth <= 768 || window.matchMedia("(pointer: coarse)").matches) return;

        let glowX = 0;
        let glowY = 0;
        let currentX = 0;
        let currentY = 0;
        let visible = false;

        document.addEventListener("mousemove", (e) => {
            glowX = e.clientX;
            glowY = e.clientY;
            if (!visible) {
                visible = true;
                cursorGlow.classList.add("glow-visible");
            }
        });

        document.addEventListener("mouseleave", () => {
            visible = false;
            cursorGlow.classList.remove("glow-visible");
        });

        function updateGlow() {
            currentX += (glowX - currentX) * 0.12;
            currentY += (glowY - currentY) * 0.12;
            cursorGlow.style.left = `${currentX}px`;
            cursorGlow.style.top = `${currentY}px`;
            requestAnimationFrame(updateGlow);
        }
        updateGlow();

        const interactiveEls = document.querySelectorAll(".glass-card, a, .icon-hover, button");
        interactiveEls.forEach((el) => {
            el.addEventListener("mouseenter", () => cursorGlow.classList.add("glow-intense"));
            el.addEventListener("mouseleave", () => cursorGlow.classList.remove("glow-intense"));
        });
    }

    function initTiltCards() {
        const cards = document.querySelectorAll("[data-tilt]");
        if (!cards.length) return;

        cards.forEach((card) => {
            if (!card.querySelector(".tilt-glare")) {
                const glare = document.createElement("span");
                glare.className = "tilt-glare";
                card.appendChild(glare);
            }

            card.addEventListener("mousemove", (event) => {
                const rect = card.getBoundingClientRect();
                const px = (event.clientX - rect.left) / rect.width;
                const py = (event.clientY - rect.top) / rect.height;
                const rotY = (px - 0.5) * 10;
                const rotX = (0.5 - py) * 9;
                card.style.transform = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px)`;
                card.style.setProperty("--mx", `${px * 100}%`);
                card.style.setProperty("--my", `${py * 100}%`);
            });

            card.addEventListener("mouseleave", () => {
                card.style.transform = "";
            });
        });
    }

    function initMagnetic() {
        const items = document.querySelectorAll("[data-magnetic]");
        items.forEach((item) => {
            item.addEventListener("mousemove", (event) => {
                const rect = item.getBoundingClientRect();
                const x = event.clientX - rect.left - rect.width / 2;
                const y = event.clientY - rect.top - rect.height / 2;
                item.style.transform = `translate(${x * 0.09}px, ${y * 0.09}px)`;
            });
            item.addEventListener("mouseleave", () => {
                item.style.transform = "";
            });
        });
    }

    function initReadingProgress() {
        const bar = document.getElementById("reading-progress-bar");
        if (!bar) return;

        const onScroll = () => {
            const doc = document.documentElement;
            const max = doc.scrollHeight - window.innerHeight;
            const progress = max <= 0 ? 0 : (window.scrollY / max) * 100;
            bar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }

    function init() {
        initMobileMenu();
        initHeaderScroll();
        initRevealObserver();
        observeRevealElements();
        initScrollTop();
        initParticles();
        initCursorGlow();
        initTiltCards();
        initMagnetic();
        initReadingProgress();
        window.WorkeronWOW = {
            refresh: () => {
                observeRevealElements();
                initTiltCards();
                initMagnetic();
            }
        };
    }

    document.addEventListener("DOMContentLoaded", init);
})();

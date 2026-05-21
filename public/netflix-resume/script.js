// Role data - Netflix-style movie titles based on professional experience
// Ordered from most recent to oldest
const rolesData = {
    role1: {
        title: "Ring of Trust",
        description: "Senior Product Manager at Amazon (Ring). Shaping the strategy for the world's most recognized smart doorbell brand, delivering innovations that help millions of families feel safer and more connected.",
        position: "Senior Product Manager",
        company: "Amazon (Ring)",
        duration: "2022-Present",
        videoUrl: "videos/ring-trailer.mp4",
        posterImage: "images/ring-poster.png"
    },
    role2: {
        title: "The Shield: Blocking Spam at Teltech",
        description: "As Senior Product Manager at Teltech, I led product development for a telecom mobile app developer focused on protecting users from spam calls. I built products that gave millions of people control over their phone experience, combining technical innovation with user-centric design to solve a real-world problem affecting daily life.",
        position: "Senior Product Manager",
        company: "Teltech",
        duration: "2019-2022",
        videoUrl: "videos/teltech-trailer.mp4",
        posterImage: "images/teltech-poster.png"
    },
    role3: {
        title: "Solar Protocol",
        description: "Application Sales Engineer & Product Manager at Locus Energy. In the dawn of the solar IoT revolution, he bridged raw technology with real-world market needs—building monitoring platforms that turned rooftop panels into money-making, planet-saving machines.",
        position: "Application Sales Engineer & Product Manager",
        company: "Locus Energy",
        duration: "2015-2019",
        videoUrl: "videos/locus-trailer.mp4",
        posterImage: "images/locus-poster.png"
    },
    role4: {
        title: "Sweet Operations: Packaging Excellence at Mars",
        description: "At Mars Chocolate, I managed packaging procurement and operations for a global consumer packaged goods company. Balancing cost efficiency with quality standards, I optimized supply chains, managed vendor relationships, and ensured smooth operations that kept beloved chocolate brands flowing to consumers worldwide.",
        position: "Packaging Buyer & Operations Manager",
        company: "Mars Chocolate",
        duration: "2013-2015",
        videoUrl: "videos/mars-trailer.mp4",
        posterImage: "images/mars-poster.png"
    },
    role5: {
        title: "Empire of Inventory",
        description: "Apple Inventory Control Manager. Behind the polished glass façade, he commands the high-stakes ballet of millions of iPhones, iPads, and Macs flying off shelves. Real-time forecasting, lightning-fast reallocations, and zero stock-outs—because when the new iPhone drops, the world can't wait.",
        position: "Apple Inventory Control Manager",
        company: "Apple Inc.",
        duration: "2011-2013",
        videoUrl: "videos/apple-inventory-trailer.mp4",
        posterImage: "images/apple-poster.png"
    },
    role6: {
        title: "Genius Bar: First Responder",
        description: "Apple Genius. Front-line hero of the Genius Bar. Armed only with a diagnostic toolkit and unshakable calm, he resurrects dead Macs, un-bricks iPhones, and turns frustrated customers into lifelong Apple evangelists—one logic-board swap at a time.",
        position: "Apple Genius",
        company: "Apple Inc.",
        duration: "2008-2011",
        videoUrl: "videos/apple-genius-trailer.mp4",
        posterImage: "images/genius-bar.png"
    },
    role7: {
        title: "The Workroom",
        description: "Computer Workroom Manager at Franklin & Marshall College. In the pressure-cooker of late-night papers and looming finals, he ran the campus tech lifeline: diagnosing crashed laptops, recovering \"lost\" theses, and turning panicked students into confident digital natives—one calm explanation and lightning-fast fix at a time.",
        position: "Computer Workroom Manager",
        company: "Franklin & Marshall College",
        duration: "2005-2008",
        videoUrl: "videos/fm-workroom-trailer.mp4",
        posterImage: "images/workroom-poster.png"
    },
    role8: {
        title: "The Big Short: Summer of Subprime",
        description: "A wide-eyed college kid steps onto the trading floor just as the mortgage-backed securities bubble reaches its peak. Surrounded by trillion-dollar spreadsheets and champagne-fueled bravado, he's handed the keys to models that will soon ignite the global financial crisis—learning in real time that when the music stops, not everyone gets a chair.",
        position: "Accounting Assistant",
        company: "Financial Services",
        duration: "2007",
        videoUrl: "videos/big-short-trailer.mp4",
        posterImage: "images/big-short-poster.png"
    }
};

// Modal functionality
function openModal(roleId) {
    const modal = document.getElementById('roleModal');
    const role = rolesData[roleId];
    
    if (!role) return;
    
    // Update modal content
    document.getElementById('modalTitle').textContent = role.title;
    document.getElementById('modalDescription').textContent = role.description;
    document.getElementById('modalPosition').textContent = role.position;
    document.getElementById('modalCompany').textContent = role.company || '';
    document.getElementById('modalDuration').textContent = role.duration;
    
    // Update video placeholder
    const videoContainer = document.getElementById('modalVideo');
    if (role.videoUrl) {
        // Check if it's a local video file (starts with "videos/") or external URL
        if (role.videoUrl.startsWith('videos/') || role.videoUrl.endsWith('.mp4') || role.videoUrl.endsWith('.webm') || role.videoUrl.endsWith('.mov')) {
            // Local video file - use HTML5 video player
            videoContainer.innerHTML = `
                <video 
                    controls 
                    autoplay
                    style="width: 100%; height: 100%; object-fit: contain;"
                >
                    <source src="${role.videoUrl}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
            `;
        } else {
            // External URL (YouTube, Vimeo, Sora, etc.) - use iframe
            videoContainer.innerHTML = `
                <iframe 
                    width="100%" 
                    height="100%" 
                    src="${role.videoUrl}" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen
                    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"
                ></iframe>
            `;
        }
    } else {
        // Show placeholder
        videoContainer.innerHTML = `
            <p>Video Trailer Placeholder</p>
            <p class="video-hint">Your video will appear here</p>
        `;
    }
    
    // Show modal
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('roleModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('roleModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const welcomeModal = document.getElementById('welcomeModal');
        if (welcomeModal.classList.contains('active')) {
            closeWelcomeModal();
        } else {
            closeModal();
        }
    }
});

// Navbar scroll effect
window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Function to update role data (for future customization)
function updateRoleData(roleId, data) {
    if (rolesData[roleId]) {
        rolesData[roleId] = { ...rolesData[roleId], ...data };
    }
}

// Export function for external use
window.updateRoleData = updateRoleData;
window.rolesData = rolesData;

// Function to render poster images
function renderPosterImages() {
    Object.keys(rolesData).forEach(roleId => {
        const role = rolesData[roleId];
        const posterElement = document.getElementById(`poster-${roleId}`);
        
        if (posterElement && role.posterImage) {
            // Replace placeholder with image
            posterElement.innerHTML = `<img src="${role.posterImage}" alt="${role.title}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;">`;
        }
    });
}

// Welcome Modal Functions
function closeWelcomeModal() {
    const welcomeModal = document.getElementById('welcomeModal');
    welcomeModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function showWelcomeModal() {
    const welcomeModal = document.getElementById('welcomeModal');
    welcomeModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Render poster images when page loads
document.addEventListener('DOMContentLoaded', function() {
    renderPosterImages();
    // Show welcome modal on first visit
    showWelcomeModal();
});


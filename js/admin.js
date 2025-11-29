// Admin Console Interactions
document.addEventListener('DOMContentLoaded', function() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabIndex = Array.from(tabBtns).indexOf(this);
            
            // Remove active from all
            tabBtns.forEach(b => b.classList.remove('tab-btn--active'));
            tabPanels.forEach(p => p.classList.remove('tab-panel--active'));
            
            // Add active to clicked
            this.classList.add('tab-btn--active');
            tabPanels[tabIndex].classList.add('tab-panel--active');
        });
    });
});

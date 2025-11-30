// Seller Site Interactions
document.addEventListener('DOMContentLoaded', function () {
  const conditionBtns = document.querySelectorAll('.condition-btn');

  conditionBtns.forEach((btn) => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      // Remove selected from siblings
      this.parentElement.querySelectorAll('.condition-btn').forEach((b) => {
        b.classList.remove('condition-btn--selected');
      });
      // Add selected to clicked button
      this.classList.add('condition-btn--selected');
    });
  });
});

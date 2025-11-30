/**
 * Login Page Handler
 * Handles login form submission and authentication
 */

document.addEventListener('DOMContentLoaded', async function() {
  // If already authenticated, redirect to dashboard
  const isAuthenticated = await auth.verifySession();
  if (isAuthenticated) {
    window.location.href = '/admin/index.html';
    return;
  }

  // Setup login form
  const loginForm = document.getElementById('loginForm');
  const submitBtn = document.getElementById('submitBtn');
  const errorMessage = document.getElementById('errorMessage');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Clear previous errors
    errorMessage.classList.remove('show');
    errorMessage.textContent = '';

    // Disable button during submission
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      await auth.login(email, password);
      // If successful, redirect to dashboard
      window.location.href = '/admin/index.html';
    } catch (error) {
      errorMessage.textContent = error.message || 'Login failed. Please try again.';
      errorMessage.classList.add('show');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });
});

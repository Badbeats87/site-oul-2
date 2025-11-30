/**
 * Login Page Handler
 * Handles login form submission, validation, and authentication
 */

document.addEventListener('DOMContentLoaded', async function () {
  // Check if already authenticated
  const isAuthenticated = await auth.verifySession();
  if (isAuthenticated) {
    window.location.href = '/admin/index.html';
    return;
  }

  // Get DOM elements
  const loginForm = document.getElementById('loginForm');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const errorMessage = document.getElementById('errorMessage');
  const errorTitle = document.getElementById('errorTitle');
  const errorText = document.getElementById('errorText');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailGroup = document.getElementById('emailGroup');
  const passwordGroup = document.getElementById('passwordGroup');
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');

  /**
   * Clear all errors
   */
  function clearErrors() {
    errorMessage.style.display = 'none';
    errorMessage.classList.remove('show');
    emailGroup.classList.remove('has-error');
    passwordGroup.classList.remove('has-error');
    emailError.textContent = '';
    passwordError.textContent = '';
    emailInput.removeAttribute('aria-invalid');
    passwordInput.removeAttribute('aria-invalid');
  }

  /**
   * Show error message
   */
  function showError(title, message, fieldErrors = {}) {
    errorTitle.textContent = title;
    errorText.textContent = message;
    errorMessage.style.display = 'flex';
    errorMessage.classList.add('show');

    // Set field-level errors
    if (fieldErrors.email) {
      emailGroup.classList.add('has-error');
      emailError.textContent = fieldErrors.email;
      emailInput.setAttribute('aria-invalid', 'true');
    }

    if (fieldErrors.password) {
      passwordGroup.classList.add('has-error');
      passwordError.textContent = fieldErrors.password;
      passwordInput.setAttribute('aria-invalid', 'true');
    }

    // Focus on first error field
    if (fieldErrors.email) {
      emailInput.focus();
    } else if (fieldErrors.password) {
      passwordInput.focus();
    }
  }

  /**
   * Validate form inputs
   */
  function validateForm() {
    clearErrors();
    const fieldErrors = {};

    // Validate email
    const email = emailInput.value.trim();
    if (!email) {
      fieldErrors.email = 'Email is required';
    } else if (!email.includes('@')) {
      fieldErrors.email = 'Please enter a valid email address';
    }

    // Validate password
    const password = passwordInput.value;
    if (!password) {
      fieldErrors.password = 'Password is required';
    } else if (password.length < 6) {
      fieldErrors.password = 'Password must be at least 6 characters';
    }

    return fieldErrors;
  }

  /**
   * Handle form submission
   */
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate form
    const fieldErrors = validateForm();
    if (Object.keys(fieldErrors).length > 0) {
      showError(
        'Validation Error',
        'Please check the errors below.',
        fieldErrors
      );
      return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    // Disable button and show loading state
    submitBtn.disabled = true;
    submitBtn.setAttribute('aria-busy', 'true');
    btnText.textContent = 'Logging in...';

    try {
      await auth.login(email, password);
      // Successful login - redirect to dashboard
      window.location.href = '/admin/index.html';
    } catch (error) {
      // Handle different error types
      let title = 'Login Failed';
      let message =
        error.message || 'An unexpected error occurred. Please try again.';
      let fieldErrors = {};

      if (error.message.includes('401') || error.message.includes('Invalid')) {
        title = 'Invalid Credentials';
        message = 'Email or password is incorrect. Please try again.';
      } else if (
        error.message.includes('network') ||
        error.message.includes('fetch')
      ) {
        title = 'Connection Error';
        message =
          'Unable to connect to the server. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        title = 'Request Timeout';
        message = 'The request took too long. Please try again.';
      }

      showError(title, message, fieldErrors);

      // Re-enable button
      submitBtn.disabled = false;
      submitBtn.setAttribute('aria-busy', 'false');
      btnText.textContent = 'Login';
    }
  });

  /**
   * Clear errors when user starts typing
   */
  emailInput.addEventListener('input', () => {
    emailGroup.classList.remove('has-error');
    emailError.textContent = '';
  });

  passwordInput.addEventListener('input', () => {
    passwordGroup.classList.remove('has-error');
    passwordError.textContent = '';
  });

  /**
   * Real-time validation as user types
   */
  emailInput.addEventListener('blur', () => {
    const email = emailInput.value.trim();
    if (email && !email.includes('@')) {
      emailGroup.classList.add('has-error');
      emailError.textContent = 'Please enter a valid email address';
      emailInput.setAttribute('aria-invalid', 'true');
    } else if (emailGroup.classList.contains('has-error')) {
      emailGroup.classList.remove('has-error');
      emailError.textContent = '';
      emailInput.removeAttribute('aria-invalid');
    }
  });

  passwordInput.addEventListener('blur', () => {
    const password = passwordInput.value;
    if (password && password.length < 6) {
      passwordGroup.classList.add('has-error');
      passwordError.textContent = 'Password must be at least 6 characters';
      passwordInput.setAttribute('aria-invalid', 'true');
    } else if (passwordGroup.classList.contains('has-error')) {
      passwordGroup.classList.remove('has-error');
      passwordError.textContent = '';
      passwordInput.removeAttribute('aria-invalid');
    }
  });

  /**
   * Auto-focus on page load
   */
  emailInput.focus();
});

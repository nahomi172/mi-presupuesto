const ALLOWED_EMAILS = ['nahomi172@gmail.com'];
const CLIENT_ID = '969276712231-3q1o9t3es29c8bu8uqc9j9ole7408drc.apps.googleusercontent.com';

function loginConGoogle() {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: 'https://nahomi172.github.io/mi-presupuesto/',
    response_type: 'token id_token',
    scope: 'openid email profile',
    nonce: Math.random().toString(36).slice(2),
    prompt: 'select_account'
  });
  window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
}

function parseHash() {
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('id_token');
}

function decodeJWT(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch(e) { return null; }
}

function checkAuth() {
  // Check if returning from Google OAuth
  const idToken = parseHash();
  if (idToken) {
    const payload = decodeJWT(idToken);
    if (payload && ALLOWED_EMAILS.includes(payload.email)) {
      localStorage.setItem('user_email', payload.email);
      localStorage.setItem('id_token', idToken);
      window.location.hash = '';
      showApp();
      return;
    } else {
      document.getElementById('login-error').style.display = 'block';
      return;
    }
  }

  // Check saved session
  const saved = localStorage.getItem('user_email');
  if (saved && ALLOWED_EMAILS.includes(saved)) {
    showApp();
    return;
  }

  // Show login
  document.getElementById('login-screen').style.display = 'flex';
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  if (typeof initApp === 'function') initApp();
}

function logout() {
  localStorage.removeItem('user_email');
  localStorage.removeItem('id_token');
  location.reload();
}

window.addEventListener('load', checkAuth);

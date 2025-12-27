// ===== UTILITAIRES DE SÉCURITÉ FRONTEND =====

// Validation des entrées utilisateur
export const validateInput = (
  input: string,
  type: 'email' | 'username' | 'password' | 'text'
): boolean => {
  switch (type) {
    case 'email': {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(input) && input.length <= 254;
    }

    case 'username': {
      const usernameRegex = /^[a-zA-Z0-9_-]{3,30}$/;
      return usernameRegex.test(input);
    }

    case 'password': {
      // Au moins 8 caractères, une minuscule, une majuscule, un chiffre
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      return passwordRegex.test(input) && input.length <= 128;
    }

    case 'text': {
      // Pas de caractères dangereux
      const dangerousChars = /[<>"'&]/;
      return !dangerousChars.test(input) && input.length <= 1000;
    }

    default:
      return false;
  }
};

// Sanitisation des entrées
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Supprimer les balises HTML
    .replace(/javascript:/gi, '') // Supprimer les protocoles dangereux
    .replace(/on\w+\s*=/gi, '') // Supprimer les événements
    .trim();
};

// Protection contre les injections DOM
export const safeInnerHTML = (element: HTMLElement, content: string): void => {
  // Utiliser textContent au lieu de innerHTML
  element.textContent = content;
};

// Validation des tokens JWT
export const validateToken = (token: string): boolean => {
  if (!token || typeof token !== 'string') return false;

  try {
    // Vérifier la structure du token (header.payload.signature)
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Vérifier que le payload est un JSON valide
    const payload = JSON.parse(atob(parts[1]));

    // Vérifier l'expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
};

// Protection contre les attaques XSS
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

// Validation des URLs
export const validateUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

// Protection contre les attaques par force brute côté client
export class BruteForceProtection {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private maxAttempts = 5;
  private lockoutDuration = 15 * 60 * 1000; // 15 minutes

  canAttempt(key: string): boolean {
    const attempt = this.attempts.get(key);
    if (!attempt) return true;

    if (Date.now() - attempt.lastAttempt > this.lockoutDuration) {
      this.attempts.delete(key);
      return true;
    }

    return attempt.count < this.maxAttempts;
  }

  recordAttempt(key: string): void {
    const attempt = this.attempts.get(key);
    if (attempt) {
      attempt.count++;
      attempt.lastAttempt = Date.now();
    } else {
      this.attempts.set(key, { count: 1, lastAttempt: Date.now() });
    }
  }

  resetAttempts(key: string): void {
    this.attempts.delete(key);
  }
}

// Instance globale
export const bruteForceProtection = new BruteForceProtection();

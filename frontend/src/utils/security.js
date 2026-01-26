// src/utils/security.js
/**
 * Frontend Security Utilities
 * Implements OWASP best practices for frontend security
 */

/**
 * XSS Prevention - Sanitize user input
 * OWASP A03:2021 - Injection
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * HTML Escape - Prevent XSS when rendering user content
 */
export function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  return text.replace(/[&<>"'/]/g, (char) => map[char]);
}

/**
 * Validate transaction ID format
 */
export function validateTxId(txId) {
  const pattern = /^[A-Za-z0-9\-_]{1,64}$/;
  return pattern.test(txId);
}

/**
 * Validate amount
 */
export function validateAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num)) return false;
  if (num < 0) return false;
  if (num > 10000000) return false; // 10 million max
  return true;
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return pattern.test(email);
}

/**
 * Validate country code
 */
export function validateCountryCode(code) {
  if (!code) return true; // Optional field
  const pattern = /^[A-Z]{2,3}$/;
  return pattern.test(code.toUpperCase());
}

/**
 * Secure session storage
 * Don't store sensitive data in localStorage
 */
export const SecureStorage = {
  // Only store non-sensitive session data
  setItem(key, value) {
    try {
      const data = JSON.stringify(value);
      sessionStorage.setItem(key, data);
    } catch (e) {
      console.error('Failed to store data', e);
    }
  },

  getItem(key) {
    try {
      const data = sessionStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Failed to retrieve data', e);
      return null;
    }
  },

  removeItem(key) {
    sessionStorage.removeItem(key);
  },

  clear() {
    sessionStorage.clear();
  }
};

/**
 * CSRF Token Management
 */
export const CSRFProtection = {
  getToken() {
    return sessionStorage.getItem('csrf_token');
  },

  setToken(token) {
    sessionStorage.setItem('csrf_token', token);
  },

  removeToken() {
    sessionStorage.removeItem('csrf_token');
  },

  // Add CSRF token to request headers
  addToHeaders(headers = {}) {
    const token = this.getToken();
    if (token) {
      headers['X-CSRF-Token'] = token;
    }
    return headers;
  }
};

/**
 * Rate Limiting - Client side
 * Prevent excessive API calls
 */
export class RateLimiter {
  constructor(maxRequests = 100, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow; // milliseconds
    this.requests = [];
  }

  canMakeRequest() {
    const now = Date.now();
    
    // Remove old requests outside time window
    this.requests = this.requests.filter(
      time => now - time < this.timeWindow
    );

    // Check if under limit
    if (this.requests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    this.requests.push(now);
    return true;
  }

  getRemainingRequests() {
    const now = Date.now();
    this.requests = this.requests.filter(
      time => now - time < this.timeWindow
    );
    return Math.max(0, this.maxRequests - this.requests.length);
  }
}

/**
 * Input Validation Rules
 */
export const ValidationRules = {
  transaction: {
    tx_id: {
      required: true,
      pattern: /^[A-Za-z0-9\-_]{1,64}$/,
      message: 'Transaction ID must be 1-64 alphanumeric characters'
    },
    user: {
      required: true,
      minLength: 1,
      maxLength: 255,
      message: 'User field is required (max 255 characters)'
    },
    amount: {
      required: true,
      min: 0.01,
      max: 10000000,
      message: 'Amount must be between 0.01 and 10,000,000'
    },
    country: {
      required: false,
      pattern: /^[A-Z]{2,3}$/,
      message: 'Country code must be 2-3 uppercase letters'
    },
    hour: {
      required: false,
      min: 0,
      max: 23,
      message: 'Hour must be between 0 and 23'
    }
  }
};

/**
 * Validate form data against rules
 */
export function validateFormData(data, rules) {
  const errors = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    // Required check
    if (rule.required && (!value || value === '')) {
      errors[field] = `${field} is required`;
      continue;
    }

    // Skip validation if field is empty and not required
    if (!value && !rule.required) continue;

    // Pattern check
    if (rule.pattern && !rule.pattern.test(value)) {
      errors[field] = rule.message || `Invalid ${field} format`;
      continue;
    }

    // Min/Max length
    if (rule.minLength && value.length < rule.minLength) {
      errors[field] = `${field} must be at least ${rule.minLength} characters`;
      continue;
    }

    if (rule.maxLength && value.length > rule.maxLength) {
      errors[field] = `${field} must be at most ${rule.maxLength} characters`;
      continue;
    }

    // Min/Max value (for numbers)
    if (rule.min !== undefined && parseFloat(value) < rule.min) {
      errors[field] = `${field} must be at least ${rule.min}`;
      continue;
    }

    if (rule.max !== undefined && parseFloat(value) > rule.max) {
      errors[field] = `${field} must be at most ${rule.max}`;
      continue;
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Prevent clickjacking - Check if running in iframe
 */
export function preventClickjacking() {
  if (window.self !== window.top) {
    // Page is in an iframe - potential clickjacking attempt
    console.warn('Clickjacking attempt detected');
    window.top.location = window.self.location;
  }
}

/**
 * Secure API call wrapper
 */
export async function secureApiCall(url, options = {}) {
  // Add CSRF token
  const headers = CSRFProtection.addToHeaders(options.headers || {});
  
  // Add security headers
  headers['X-Requested-With'] = 'XMLHttpRequest';
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin', // Only send cookies to same origin
    });

    // Check for security headers in response
    const requestId = response.headers.get('X-Request-ID');
    if (requestId) {
      console.debug('Request ID:', requestId);
    }

    return response;
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

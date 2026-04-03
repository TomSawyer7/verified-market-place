import { supabase } from '@/integrations/supabase/client';

// Password strength checker
export const checkPasswordStrength = (password: string): { score: number; label: string; color: string; feedback: string[] } => {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) score += 1; else feedback.push('At least 8 characters');
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1; else feedback.push('Add lowercase letters');
  if (/[A-Z]/.test(password)) score += 1; else feedback.push('Add uppercase letters');
  if (/[0-9]/.test(password)) score += 1; else feedback.push('Add numbers');
  if (/[^a-zA-Z0-9]/.test(password)) score += 1; else feedback.push('Add special characters');
  if (password.length >= 16) score += 1;
  if (!/(.)\1{2,}/.test(password)) score += 1; else feedback.push('Avoid repeated characters');

  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
  const colors = ['bg-red-500', 'bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-400', 'bg-green-600'];

  const idx = Math.min(Math.floor(score / 1.5), 5);
  return { score, label: labels[idx], color: colors[idx], feedback };
};

// Rate limiting for login attempts (client-side)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export const checkRateLimit = (email: string): { allowed: boolean; waitSeconds: number } => {
  const key = email.toLowerCase();
  const now = Date.now();
  const record = loginAttempts.get(key);

  if (!record) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
    return { allowed: true, waitSeconds: 0 };
  }

  // Reset after 15 minutes
  if (now - record.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.set(key, { count: 1, lastAttempt: now });
    return { allowed: true, waitSeconds: 0 };
  }

  if (record.count >= 5) {
    const waitMs = 15 * 60 * 1000 - (now - record.lastAttempt);
    return { allowed: false, waitSeconds: Math.ceil(waitMs / 1000) };
  }

  record.count += 1;
  record.lastAttempt = now;
  return { allowed: true, waitSeconds: 0 };
};

export const resetRateLimit = (email: string) => {
  loginAttempts.delete(email.toLowerCase());
};

// Log security event
export const logSecurityEvent = async (
  userId: string | null,
  eventType: string,
  severity: 'info' | 'warning' | 'critical',
  description: string,
  metadata?: Record<string, any>
) => {
  try {
    await supabase.from('security_events').insert({
      user_id: userId,
      event_type: eventType,
      severity,
      description,
      user_agent: navigator.userAgent,
      metadata: metadata || {},
    });
  } catch {
    // Silently fail - don't break UX for logging
  }
};

// Log session activity
export const logSessionActivity = async (userId: string, action: string) => {
  try {
    await supabase.from('session_logs').insert({
      user_id: userId,
      action,
      user_agent: navigator.userAgent,
    });
  } catch {
    // Silent
  }
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};

// XSS protection for display
export const escapeHtml = (text: string): string => {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

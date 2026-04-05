import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    hcaptcha: any;
    onHCaptchaLoad: () => void;
  }
}

interface HCaptchaProps {
  siteKey?: string;
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
}

const HCAPTCHA_SITE_KEY = '10000000-ffff-ffff-ffff-000000000000'; // Test key — replace with production key

export const HCaptcha = ({ siteKey = HCAPTCHA_SITE_KEY, onVerify, onExpire, onError }: HCaptchaProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const readyRef = useRef(false);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.hcaptcha || readyRef.current) return;
    readyRef.current = true;

    widgetIdRef.current = window.hcaptcha.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onVerify(token),
      'expired-callback': () => onExpire?.(),
      'error-callback': () => onError?.(),
      theme: 'light',
      size: 'normal',
    });
  }, [siteKey, onVerify, onExpire, onError]);

  useEffect(() => {
    // Load hCaptcha script if not already loaded
    if (!document.querySelector('script[src*="hcaptcha"]')) {
      const script = document.createElement('script');
      script.src = 'https://js.hcaptcha.com/1/api.js?render=explicit&onload=onHCaptchaLoad';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    window.onHCaptchaLoad = renderWidget;

    // If already loaded
    if (window.hcaptcha) {
      renderWidget();
    }

    return () => {
      if (widgetIdRef.current !== null && window.hcaptcha) {
        try { window.hcaptcha.remove(widgetIdRef.current); } catch {}
      }
      readyRef.current = false;
    };
  }, [renderWidget]);

  return (
    <div className="flex justify-center">
      <div ref={containerRef} />
    </div>
  );
};

export const resetHCaptcha = () => {
  if (window.hcaptcha) {
    try { window.hcaptcha.reset(); } catch {}
  }
};

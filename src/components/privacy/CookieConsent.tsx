import React, { useState, useEffect } from 'react';
import ConsentManager, { ConsentPreferences } from './ConsentManager';
import './CookieConsent.css';

interface CookieConsentProps {
  onConsentChange?: (consent: ConsentPreferences) => void;
  companyName?: string;
  privacyPolicyUrl?: string;
  cookiePolicyUrl?: string;
}

const CookieConsent: React.FC<CookieConsentProps> = ({
  onConsentChange,
  companyName = 'n8n Workflow Manager',
  privacyPolicyUrl = '/privacy-policy',
  cookiePolicyUrl = '/cookie-policy',
}) => {
  const [showBanner, setShowBanner] = useState(false);
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);

  useEffect(() => {
    // Check if user has already provided consent
    const savedConsent = localStorage.getItem('cookieConsent');
    const consentTimestamp = localStorage.getItem('consentTimestamp');
    
    if (savedConsent && consentTimestamp) {
      try {
        const parsed = JSON.parse(savedConsent);
        const timestamp = new Date(consentTimestamp);
        const now = new Date();
        const daysSinceConsent = (now.getTime() - timestamp.getTime()) / (1000 * 3600 * 24);
        
        // Consent expires after 365 days (GDPR requirement)
        if (daysSinceConsent < 365) {
          setConsent(parsed);
          if (onConsentChange) {
            onConsentChange(parsed);
          }
          return;
        }
      } catch (error) {
        console.error('Error parsing saved consent:', error);
      }
    }
    
    // Show banner if no valid consent found
    setShowBanner(true);
  }, [onConsentChange]);

  const handleConsentChange = (newConsent: ConsentPreferences) => {
    setConsent(newConsent);
    if (onConsentChange) {
      onConsentChange(newConsent);
    }
    
    // Apply consent settings
    applyCookieConsent(newConsent);
  };

  const handleBannerClose = () => {
    setShowBanner(false);
  };

  const applyCookieConsent = (consent: ConsentPreferences) => {
    // Clear non-essential cookies if consent is withdrawn
    if (!consent.analytics) {
      clearAnalyticsCookies();
    }
    
    if (!consent.marketing) {
      clearMarketingCookies();
    }
    
    if (!consent.personalization) {
      clearPersonalizationCookies();
    }
    
    // Initialize allowed services
    if (consent.analytics) {
      initializeAnalytics();
    }
    
    if (consent.marketing) {
      initializeMarketing();
    }
    
    if (consent.personalization) {
      initializePersonalization();
    }
  };

  const clearAnalyticsCookies = () => {
    // Clear analytics cookies (Google Analytics, etc.)
    const analyticsCookies = [
      '_ga', '_ga_*', '_gid', '_gat', '_gtag_*', '_utm_*',
      'amplitude_*', 'mixpanel_*', '_hjid', '_hjSession*'
    ];
    
    analyticsCookies.forEach(pattern => {
      if (pattern.includes('*')) {
        // Handle wildcard patterns
        const prefix = pattern.replace('*', '');
        document.cookie.split(';').forEach(cookie => {
          const cookieName = cookie.split('=')[0].trim();
          if (cookieName.startsWith(prefix)) {
            deleteCookie(cookieName);
          }
        });
      } else {
        deleteCookie(pattern);
      }
    });
  };

  const clearMarketingCookies = () => {
    // Clear marketing/advertising cookies
    const marketingCookies = [
      'fbp', '_fbp', 'fr', '_gcl_*', 'ads_*', 'doubleclick_*',
      'linkedin_*', 'twitter_*', '_ttp', '_ttd_*'
    ];
    
    marketingCookies.forEach(pattern => {
      if (pattern.includes('*')) {
        const prefix = pattern.replace('*', '');
        document.cookie.split(';').forEach(cookie => {
          const cookieName = cookie.split('=')[0].trim();
          if (cookieName.startsWith(prefix)) {
            deleteCookie(cookieName);
          }
        });
      } else {
        deleteCookie(pattern);
      }
    });
  };

  const clearPersonalizationCookies = () => {
    // Clear personalization cookies
    const personalizationCookies = [
      'pref_*', 'settings_*', 'theme', 'language', 'customization_*'
    ];
    
    personalizationCookies.forEach(pattern => {
      if (pattern.includes('*')) {
        const prefix = pattern.replace('*', '');
        document.cookie.split(';').forEach(cookie => {
          const cookieName = cookie.split('=')[0].trim();
          if (cookieName.startsWith(prefix)) {
            deleteCookie(cookieName);
          }
        });
      } else {
        deleteCookie(pattern);
      }
    });
  };

  const deleteCookie = (name: string) => {
    // Delete for current domain
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    
    // Delete for parent domains
    const domain = window.location.hostname;
    const domainParts = domain.split('.');
    
    for (let i = 0; i < domainParts.length - 1; i++) {
      const parentDomain = '.' + domainParts.slice(i).join('.');
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${parentDomain};`;
    }
  };

  const initializeAnalytics = () => {
    // Initialize analytics services (Google Analytics, etc.)
    if (typeof window !== 'undefined') {
      // Example: Initialize Google Analytics
      if ((window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          analytics_storage: 'granted'
        });
      }
      
      // Dispatch event for other analytics services
      window.dispatchEvent(new CustomEvent('analyticsConsentGranted'));
    }
  };

  const initializeMarketing = () => {
    // Initialize marketing services
    if (typeof window !== 'undefined') {
      if ((window as any).gtag) {
        (window as any).gtag('consent', 'update', {
          ad_storage: 'granted',
          ad_user_data: 'granted',
          ad_personalization: 'granted'
        });
      }
      
      window.dispatchEvent(new CustomEvent('marketingConsentGranted'));
    }
  };

  const initializePersonalization = () => {
    // Initialize personalization services
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('personalizationConsentGranted'));
    }
  };

  // Don't render anything if consent is already provided and banner is not shown
  if (!showBanner && consent) {
    return null;
  }

  if (!showBanner) {
    return null;
  }

  return (
    <div className="cookie-consent-wrapper">
      <ConsentManager
        onConsentChange={handleConsentChange}
        showBanner={true}
        onBannerClose={handleBannerClose}
      />
      
      {/* Cookie Policy Link */}
      <div className="cookie-info-links">
        <a href={privacyPolicyUrl} className="cookie-link" target="_blank" rel="noopener noreferrer">
          Privacy Policy
        </a>
        <span className="cookie-separator">|</span>
        <a href={cookiePolicyUrl} className="cookie-link" target="_blank" rel="noopener noreferrer">
          Cookie Policy
        </a>
      </div>
    </div>
  );
};

// Hook for using cookie consent in other components
export const useCookieConsent = () => {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedConsent = localStorage.getItem('cookieConsent');
    if (savedConsent) {
      try {
        setConsent(JSON.parse(savedConsent));
      } catch (error) {
        console.error('Error parsing saved consent:', error);
      }
    }
    setLoading(false);
  }, []);

  const updateConsent = (newConsent: ConsentPreferences) => {
    setConsent(newConsent);
    localStorage.setItem('cookieConsent', JSON.stringify(newConsent));
    localStorage.setItem('consentTimestamp', new Date().toISOString());
  };

  const hasConsent = (category: keyof ConsentPreferences): boolean => {
    return consent ? consent[category] : false;
  };

  const clearAllConsent = () => {
    localStorage.removeItem('cookieConsent');
    localStorage.removeItem('consentTimestamp');
    setConsent(null);
  };

  return {
    consent,
    loading,
    hasConsent,
    updateConsent,
    clearAllConsent,
    isAnalyticsEnabled: hasConsent('analytics'),
    isMarketingEnabled: hasConsent('marketing'),
    isPersonalizationEnabled: hasConsent('personalization'),
  };
};

export default CookieConsent;
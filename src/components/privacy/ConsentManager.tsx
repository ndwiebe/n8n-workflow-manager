import React, { useState, useEffect } from 'react';
import './ConsentManager.css';

export interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

interface ConsentManagerProps {
  onConsentChange: (consent: ConsentPreferences) => void;
  initialConsent?: ConsentPreferences;
  showBanner?: boolean;
  onBannerClose?: () => void;
}

const defaultConsent: ConsentPreferences = {
  necessary: true, // Always true, cannot be disabled
  analytics: false,
  marketing: false,
  personalization: false,
};

const ConsentManager: React.FC<ConsentManagerProps> = ({
  onConsentChange,
  initialConsent = defaultConsent,
  showBanner = false,
  onBannerClose,
}) => {
  const [consent, setConsent] = useState<ConsentPreferences>(initialConsent);
  const [showDetails, setShowDetails] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load consent from localStorage on initialization
    const savedConsent = localStorage.getItem('cookieConsent');
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent);
        setConsent({ ...defaultConsent, ...parsed });
        setIsInitialized(true);
      } catch (error) {
        console.error('Error parsing saved consent:', error);
      }
    }
  }, []);

  useEffect(() => {
    if (isInitialized) {
      onConsentChange(consent);
    }
  }, [consent, onConsentChange, isInitialized]);

  const handleConsentChange = (category: keyof ConsentPreferences, value: boolean) => {
    if (category === 'necessary') return; // Cannot disable necessary cookies
    
    const newConsent = { ...consent, [category]: value };
    setConsent(newConsent);
    
    // Save to localStorage
    localStorage.setItem('cookieConsent', JSON.stringify(newConsent));
    localStorage.setItem('consentTimestamp', new Date().toISOString());
  };

  const acceptAll = () => {
    const allAccepted: ConsentPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
    };
    setConsent(allAccepted);
    localStorage.setItem('cookieConsent', JSON.stringify(allAccepted));
    localStorage.setItem('consentTimestamp', new Date().toISOString());
    setIsInitialized(true);
    if (onBannerClose) onBannerClose();
  };

  const acceptNecessaryOnly = () => {
    const necessaryOnly: ConsentPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
    };
    setConsent(necessaryOnly);
    localStorage.setItem('cookieConsent', JSON.stringify(necessaryOnly));
    localStorage.setItem('consentTimestamp', new Date().toISOString());
    setIsInitialized(true);
    if (onBannerClose) onBannerClose();
  };

  const savePreferences = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(consent));
    localStorage.setItem('consentTimestamp', new Date().toISOString());
    setIsInitialized(true);
    if (onBannerClose) onBannerClose();
  };

  if (showBanner) {
    return (
      <div className="consent-banner">
        <div className="consent-banner-content">
          <div className="consent-banner-text">
            <h3>We value your privacy</h3>
            <p>
              We use cookies and similar technologies to provide, protect and improve our services. 
              Some cookies are necessary for basic functionality, while others help us understand 
              how you use our service and personalize your experience.
            </p>
          </div>
          
          {showDetails && (
            <div className="consent-details">
              <ConsentForm
                consent={consent}
                onConsentChange={handleConsentChange}
              />
            </div>
          )}
          
          <div className="consent-banner-actions">
            <button 
              className="btn-secondary" 
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? 'Hide Details' : 'Customize'}
            </button>
            <button className="btn-secondary" onClick={acceptNecessaryOnly}>
              Necessary Only
            </button>
            <button 
              className="btn-primary" 
              onClick={showDetails ? savePreferences : acceptAll}
            >
              {showDetails ? 'Save Preferences' : 'Accept All'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Settings view (when not showing banner)
  return (
    <div className="consent-manager">
      <div className="consent-header">
        <h2>Cookie Preferences</h2>
        <p>
          Manage your cookie preferences below. You can change these settings at any time.
        </p>
      </div>
      
      <ConsentForm
        consent={consent}
        onConsentChange={handleConsentChange}
        showDescriptions={true}
      />
      
      <div className="consent-actions">
        <button className="btn-secondary" onClick={acceptNecessaryOnly}>
          Necessary Only
        </button>
        <button className="btn-secondary" onClick={acceptAll}>
          Accept All
        </button>
        <button className="btn-primary" onClick={savePreferences}>
          Save Preferences
        </button>
      </div>
      
      <div className="consent-info">
        <p>
          <small>
            Last updated: {localStorage.getItem('consentTimestamp') 
              ? new Date(localStorage.getItem('consentTimestamp')!).toLocaleString()
              : 'Not set'
            }
          </small>
        </p>
      </div>
    </div>
  );
};

interface ConsentFormProps {
  consent: ConsentPreferences;
  onConsentChange: (category: keyof ConsentPreferences, value: boolean) => void;
  showDescriptions?: boolean;
}

const ConsentForm: React.FC<ConsentFormProps> = ({
  consent,
  onConsentChange,
  showDescriptions = false,
}) => {
  const categories = [
    {
      key: 'necessary' as keyof ConsentPreferences,
      title: 'Necessary Cookies',
      description: 'Required for basic functionality, authentication, and security. Cannot be disabled.',
      required: true,
    },
    {
      key: 'analytics' as keyof ConsentPreferences,
      title: 'Analytics Cookies',
      description: 'Help us understand how you use our service to improve performance and user experience.',
      required: false,
    },
    {
      key: 'personalization' as keyof ConsentPreferences,
      title: 'Personalization Cookies',
      description: 'Remember your preferences and settings to provide a customized experience.',
      required: false,
    },
    {
      key: 'marketing' as keyof ConsentPreferences,
      title: 'Marketing Cookies',
      description: 'Used to deliver relevant advertising and measure campaign effectiveness.',
      required: false,
    },
  ];

  return (
    <div className="consent-form">
      {categories.map((category) => (
        <div key={category.key} className="consent-category">
          <div className="consent-category-header">
            <label className="consent-label">
              <input
                type="checkbox"
                checked={consent[category.key]}
                onChange={(e) => onConsentChange(category.key, e.target.checked)}
                disabled={category.required}
                className="consent-checkbox"
              />
              <span className="consent-title">
                {category.title}
                {category.required && <span className="required-badge">Required</span>}
              </span>
            </label>
          </div>
          {showDescriptions && (
            <p className="consent-description">{category.description}</p>
          )}
        </div>
      ))}
    </div>
  );
};

export default ConsentManager;
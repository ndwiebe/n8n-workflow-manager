import React from 'react';
import './PrivacyPolicy.css';

interface PrivacyPolicyProps {
  onAccept: () => void;
  onDecline: () => void;
  showModal?: boolean;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  onAccept,
  onDecline,
  showModal = false
}) => {
  const currentDate = new Date().toLocaleDateString();

  if (showModal) {
    return (
      <div className="privacy-modal-overlay">
        <div className="privacy-modal">
          <div className="privacy-header">
            <h2>Privacy Policy</h2>
            <span className="privacy-close" onClick={onDecline}>&times;</span>
          </div>
          <div className="privacy-content">
            <PrivacyPolicyContent />
          </div>
          <div className="privacy-actions">
            <button className="btn-decline" onClick={onDecline}>
              Decline
            </button>
            <button className="btn-accept" onClick={onAccept}>
              Accept & Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="privacy-policy-container">
      <PrivacyPolicyContent />
    </div>
  );
};

const PrivacyPolicyContent: React.FC = () => {
  return (
    <>
      <div className="privacy-section">
        <p><em>Last updated: {new Date().toLocaleDateString()}</em></p>
        
        <h3>1. Introduction</h3>
        <p>
          This Privacy Policy describes how n8n Workflow Manager ("we", "our", or "us") 
          collects, uses, and protects your personal information. We are committed to 
          protecting your privacy and complying with applicable privacy laws including 
          GDPR and PIPEDA.
        </p>

        <h3>2. Information We Collect</h3>
        <h4>2.1 Personal Information</h4>
        <ul>
          <li>Contact information (name, email address)</li>
          <li>Account credentials and authentication data</li>
          <li>n8n instance connection details</li>
          <li>Workflow configuration data</li>
          <li>Usage analytics and performance metrics</li>
        </ul>

        <h4>2.2 Technical Information</h4>
        <ul>
          <li>IP addresses and device identifiers</li>
          <li>Browser type and version</li>
          <li>Operating system information</li>
          <li>Cookies and similar tracking technologies</li>
        </ul>

        <h3>3. How We Use Your Information</h3>
        <p>We use your personal information to:</p>
        <ul>
          <li>Provide and maintain our services</li>
          <li>Authenticate and authorize access</li>
          <li>Manage your workflows and configurations</li>
          <li>Improve our services and user experience</li>
          <li>Communicate with you about your account</li>
          <li>Comply with legal obligations</li>
        </ul>

        <h3>4. Legal Basis for Processing (GDPR)</h3>
        <ul>
          <li><strong>Contract:</strong> Processing necessary for service delivery</li>
          <li><strong>Legitimate Interest:</strong> Service improvement and security</li>
          <li><strong>Consent:</strong> Analytics and non-essential cookies</li>
          <li><strong>Legal Obligation:</strong> Compliance with applicable laws</li>
        </ul>

        <h3>5. Data Sharing and Disclosure</h3>
        <p>We do not sell your personal information. We may share data with:</p>
        <ul>
          <li>n8n instances you connect to (as necessary for functionality)</li>
          <li>Service providers (under strict data processing agreements)</li>
          <li>Legal authorities (when required by law)</li>
        </ul>

        <h3>6. Your Rights</h3>
        <p>Under GDPR and PIPEDA, you have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request copies of your personal data</li>
          <li><strong>Rectification:</strong> Correct inaccurate information</li>
          <li><strong>Erasure:</strong> Request deletion of your data</li>
          <li><strong>Portability:</strong> Export your data in a structured format</li>
          <li><strong>Restriction:</strong> Limit processing of your data</li>
          <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
          <li><strong>Withdraw Consent:</strong> Revoke consent for optional processing</li>
        </ul>

        <h3>7. Data Security</h3>
        <p>
          We implement appropriate technical and organizational measures to protect 
          your personal information, including:
        </p>
        <ul>
          <li>Encryption in transit and at rest</li>
          <li>Access controls and authentication</li>
          <li>Regular security assessments</li>
          <li>Incident response procedures</li>
        </ul>

        <h3>8. Data Retention</h3>
        <p>
          We retain personal information only as long as necessary for the purposes 
          outlined in this policy or as required by law. Account data is deleted 
          within 30 days of account closure.
        </p>

        <h3>9. International Transfers</h3>
        <p>
          If we transfer your data outside your jurisdiction, we ensure appropriate 
          safeguards are in place, including adequacy decisions or standard 
          contractual clauses.
        </p>

        <h3>10. Children's Privacy</h3>
        <p>
          Our services are not intended for individuals under 16 years of age. 
          We do not knowingly collect personal information from children.
        </p>

        <h3>11. Changes to This Policy</h3>
        <p>
          We may update this privacy policy from time to time. We will notify you 
          of any material changes via email or through our service.
        </p>

        <h3>12. Contact Information</h3>
        <p>
          For privacy-related questions or to exercise your rights, contact us at:
        </p>
        <ul>
          <li>Email: privacy@n8n-workflow-manager.com</li>
          <li>Data Protection Officer: dpo@n8n-workflow-manager.com</li>
        </ul>

        <h3>13. Supervisory Authority</h3>
        <p>
          You have the right to file a complaint with your local data protection 
          authority if you believe we have not complied with applicable privacy laws.
        </p>
      </div>
    </>
  );
};

export default PrivacyPolicy;
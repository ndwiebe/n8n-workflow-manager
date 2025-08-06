import React, { useState } from 'react';
import './DataSubjectRights.css';

interface DataRequest {
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  status: 'pending' | 'processing' | 'completed' | 'denied';
  createdAt: string;
  id: string;
  description?: string;
}

interface DataSubjectRightsProps {
  userId?: string;
  onSubmitRequest?: (requestType: string, details: string) => Promise<void>;
  requests?: DataRequest[];
}

const DataSubjectRights: React.FC<DataSubjectRightsProps> = ({
  userId,
  onSubmitRequest,
  requests = [],
}) => {
  const [selectedRequest, setSelectedRequest] = useState<string>('');
  const [requestDetails, setRequestDetails] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showForm, setShowForm] = useState<boolean>(false);

  const requestTypes = [
    {
      type: 'access',
      title: 'Right of Access',
      description: 'Request a copy of all personal data we hold about you',
      icon: '📄',
      details: 'You have the right to obtain confirmation of whether we process your personal data and receive a copy of your data in a structured, commonly used format.',
    },
    {
      type: 'rectification',
      title: 'Right to Rectification',
      description: 'Correct inaccurate or incomplete personal data',
      icon: '✏️',
      details: 'You have the right to have inaccurate personal data corrected and incomplete data completed.',
    },
    {
      type: 'erasure',
      title: 'Right to Erasure (Right to be Forgotten)',
      description: 'Request deletion of your personal data',
      icon: '🗑️',
      details: 'You have the right to request deletion of your personal data when it is no longer necessary for the original purpose or when you withdraw consent.',
    },
    {
      type: 'portability',
      title: 'Right to Data Portability',
      description: 'Export your data in a machine-readable format',
      icon: '📦',
      details: 'You have the right to receive your personal data in a structured, commonly used, machine-readable format and transmit it to another controller.',
    },
    {
      type: 'restriction',
      title: 'Right to Restriction of Processing',
      description: 'Limit how we process your personal data',
      icon: '⏸️',
      details: 'You have the right to restrict processing when you contest accuracy, processing is unlawful, or you need the data for legal claims.',
    },
    {
      type: 'objection',
      title: 'Right to Object',
      description: 'Object to processing based on legitimate interests',
      icon: '🚫',
      details: 'You have the right to object to processing based on legitimate interests, direct marketing, or scientific/historical research.',
    },
  ];

  const handleSubmitRequest = async () => {
    if (!selectedRequest || !onSubmitRequest) return;

    setIsSubmitting(true);
    try {
      await onSubmitRequest(selectedRequest, requestDetails);
      setSelectedRequest('');
      setRequestDetails('');
      setShowForm(false);
    } catch (error) {
      console.error('Error submitting request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', color: '#f39c12', icon: '⏳' },
      processing: { label: 'Processing', color: '#3498db', icon: '⚙️' },
      completed: { label: 'Completed', color: '#27ae60', icon: '✅' },
      denied: { label: 'Denied', color: '#e74c3c', icon: '❌' },
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return (
      <span 
        className="status-badge" 
        style={{ backgroundColor: config.color }}
      >
        {config.icon} {config.label}
      </span>
    );
  };

  return (
    <div className="data-subject-rights">
      <div className="rights-header">
        <h2>Your Privacy Rights</h2>
        <p>
          Under GDPR and PIPEDA, you have several rights regarding your personal data. 
          You can exercise these rights at any time by submitting a request below.
        </p>
      </div>

      {/* Rights Overview */}
      <div className="rights-overview">
        <h3>Your Rights Explained</h3>
        <div className="rights-grid">
          {requestTypes.map((right) => (
            <div key={right.type} className="right-card">
              <div className="right-icon">{right.icon}</div>
              <div className="right-content">
                <h4>{right.title}</h4>
                <p className="right-description">{right.description}</p>
                <details className="right-details">
                  <summary>Learn more</summary>
                  <p>{right.details}</p>
                </details>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Request Form */}
      <div className="request-section">
        <div className="section-header">
          <h3>Submit a Privacy Request</h3>
          <button 
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel Request' : 'New Request'}
          </button>
        </div>

        {showForm && (
          <div className="request-form">
            <div className="form-group">
              <label htmlFor="request-type">Request Type</label>
              <select
                id="request-type"
                value={selectedRequest}
                onChange={(e) => setSelectedRequest(e.target.value)}
                className="form-select"
              >
                <option value="">Select a request type...</option>
                {requestTypes.map((type) => (
                  <option key={type.type} value={type.type}>
                    {type.title}
                  </option>
                ))}
              </select>
            </div>

            {selectedRequest && (
              <div className="selected-right-info">
                <div className="info-card">
                  <h4>
                    {requestTypes.find(r => r.type === selectedRequest)?.icon}{' '}
                    {requestTypes.find(r => r.type === selectedRequest)?.title}
                  </h4>
                  <p>{requestTypes.find(r => r.type === selectedRequest)?.details}</p>
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="request-details">Additional Details (Optional)</label>
              <textarea
                id="request-details"
                value={requestDetails}
                onChange={(e) => setRequestDetails(e.target.value)}
                placeholder="Please provide any additional context or specific information about your request..."
                className="form-textarea"
                rows={4}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitRequest}
                disabled={!selectedRequest || isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Request History */}
      {requests.length > 0 && (
        <div className="request-history">
          <h3>Your Request History</h3>
          <div className="requests-list">
            {requests.map((request) => (
              <div key={request.id} className="request-item">
                <div className="request-header">
                  <div className="request-info">
                    <span className="request-type">
                      {requestTypes.find(r => r.type === request.type)?.icon}{' '}
                      {requestTypes.find(r => r.type === request.type)?.title}
                    </span>
                    <span className="request-date">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
                {request.description && (
                  <p className="request-description">{request.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact Information */}
      <div className="contact-info">
        <h3>Need Help?</h3>
        <p>
          If you have questions about your privacy rights or need assistance with a request, 
          you can contact our Data Protection Officer:
        </p>
        <div className="contact-details">
          <div className="contact-item">
            <strong>Email:</strong> dpo@n8n-workflow-manager.com
          </div>
          <div className="contact-item">
            <strong>Response Time:</strong> We will respond within 30 days
          </div>
          <div className="contact-item">
            <strong>Verification:</strong> We may need to verify your identity before processing requests
          </div>
        </div>
        
        <div className="legal-note">
          <p>
            <small>
              <strong>Note:</strong> You also have the right to lodge a complaint with your local 
              data protection authority if you believe we have not handled your request appropriately.
            </small>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DataSubjectRights;
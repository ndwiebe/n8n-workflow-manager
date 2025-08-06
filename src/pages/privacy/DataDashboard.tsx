import React, { useState, useEffect } from 'react';
import { privacyService } from '../../services/privacyService';
import './DataDashboard.css';

interface UserData {
  personalInfo: {
    id: string;
    email: string;
    name: string;
    createdAt: string;
    lastLogin: string;
    accountStatus: string;
  };
  preferences: {
    theme: string;
    language: string;
    notifications: boolean;
    autoSave: boolean;
  };
  workflows: {
    count: number;
    totalExecutions: number;
    lastModified: string;
  };
  connections: {
    count: number;
    providers: string[];
  };
  activityLog: Array<{
    id: string;
    action: string;
    timestamp: string;
    details: string;
  }>;
  dataProcessingLog: Array<{
    id: string;
    purpose: string;
    legalBasis: string;
    dataTypes: string[];
    timestamp: string;
    retention: string;
  }>;
}

const DataDashboard: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const data = await privacyService.getUserData();
      setUserData(data);
    } catch (err) {
      setError('Failed to load user data. Please try again.');
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadData = async () => {
    try {
      await privacyService.downloadUserData();
    } catch (err) {
      setError('Failed to download data. Please try again.');
      console.error('Error downloading data:', err);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.'
    );
    
    if (confirmed) {
      try {
        await privacyService.requestAccountDeletion();
        alert('Account deletion request submitted. You will receive a confirmation email.');
      } catch (err) {
        setError('Failed to submit deletion request. Please try again.');
        console.error('Error requesting account deletion:', err);
      }
    }
  };

  if (loading) {
    return (
      <div className="data-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="data-dashboard error">
        <div className="error-message">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={loadUserData} className="btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="data-dashboard error">
        <div className="error-message">
          <h2>No Data Available</h2>
          <p>Unable to load your data at this time.</p>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'personal', label: 'Personal Info', icon: '👤' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'workflows', label: 'Workflows', icon: '🔄' },
    { id: 'connections', label: 'Connections', icon: '🔗' },
    { id: 'activity', label: 'Activity Log', icon: '📋' },
    { id: 'processing', label: 'Data Processing', icon: '🔒' },
  ];

  return (
    <div className="data-dashboard">
      <div className="dashboard-header">
        <h1>Your Data Dashboard</h1>
        <p>
          View, manage, and export all your personal data. This dashboard provides 
          complete transparency about what data we collect and how we process it.
        </p>
        <div className="dashboard-actions">
          <button onClick={handleDownloadData} className="btn-primary">
            📥 Download My Data
          </button>
          <button onClick={handleDeleteAccount} className="btn-danger">
            🗑️ Delete Account
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        <nav className="dashboard-nav">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
            >
              <span className="nav-icon">{section.icon}</span>
              <span className="nav-label">{section.label}</span>
            </button>
          ))}
        </nav>

        <main className="dashboard-main">
          {activeSection === 'overview' && (
            <OverviewSection userData={userData} />
          )}
          {activeSection === 'personal' && (
            <PersonalInfoSection personalInfo={userData.personalInfo} />
          )}
          {activeSection === 'preferences' && (
            <PreferencesSection preferences={userData.preferences} />
          )}
          {activeSection === 'workflows' && (
            <WorkflowsSection workflows={userData.workflows} />
          )}
          {activeSection === 'connections' && (
            <ConnectionsSection connections={userData.connections} />
          )}
          {activeSection === 'activity' && (
            <ActivitySection activityLog={userData.activityLog} />
          )}
          {activeSection === 'processing' && (
            <ProcessingSection dataProcessingLog={userData.dataProcessingLog} />
          )}
        </main>
      </div>
    </div>
  );
};

const OverviewSection: React.FC<{ userData: UserData }> = ({ userData }) => (
  <div className="section overview-section">
    <h2>Account Overview</h2>
    <div className="overview-grid">
      <div className="overview-card">
        <h3>👤 Account</h3>
        <p><strong>Email:</strong> {userData.personalInfo.email}</p>
        <p><strong>Member since:</strong> {new Date(userData.personalInfo.createdAt).toLocaleDateString()}</p>
        <p><strong>Status:</strong> {userData.personalInfo.accountStatus}</p>
      </div>
      <div className="overview-card">
        <h3>🔄 Workflows</h3>
        <p><strong>Total:</strong> {userData.workflows.count}</p>
        <p><strong>Executions:</strong> {userData.workflows.totalExecutions}</p>
        <p><strong>Last modified:</strong> {new Date(userData.workflows.lastModified).toLocaleDateString()}</p>
      </div>
      <div className="overview-card">
        <h3>🔗 Connections</h3>
        <p><strong>Total:</strong> {userData.connections.count}</p>
        <p><strong>Providers:</strong> {userData.connections.providers.join(', ')}</p>
      </div>
      <div className="overview-card">
        <h3>📊 Activity</h3>
        <p><strong>Recent actions:</strong> {userData.activityLog.length}</p>
        <p><strong>Last login:</strong> {new Date(userData.personalInfo.lastLogin).toLocaleDateString()}</p>
      </div>
    </div>
  </div>
);

const PersonalInfoSection: React.FC<{ personalInfo: UserData['personalInfo'] }> = ({ personalInfo }) => (
  <div className="section personal-section">
    <h2>Personal Information</h2>
    <div className="data-table">
      <div className="data-row">
        <span className="data-label">User ID:</span>
        <span className="data-value">{personalInfo.id}</span>
      </div>
      <div className="data-row">
        <span className="data-label">Email:</span>
        <span className="data-value">{personalInfo.email}</span>
      </div>
      <div className="data-row">
        <span className="data-label">Name:</span>
        <span className="data-value">{personalInfo.name}</span>
      </div>
      <div className="data-row">
        <span className="data-label">Account Created:</span>
        <span className="data-value">{new Date(personalInfo.createdAt).toLocaleString()}</span>
      </div>
      <div className="data-row">
        <span className="data-label">Last Login:</span>
        <span className="data-value">{new Date(personalInfo.lastLogin).toLocaleString()}</span>
      </div>
      <div className="data-row">
        <span className="data-label">Account Status:</span>
        <span className="data-value">{personalInfo.accountStatus}</span>
      </div>
    </div>
  </div>
);

const PreferencesSection: React.FC<{ preferences: UserData['preferences'] }> = ({ preferences }) => (
  <div className="section preferences-section">
    <h2>Preferences & Settings</h2>
    <div className="data-table">
      <div className="data-row">
        <span className="data-label">Theme:</span>
        <span className="data-value">{preferences.theme}</span>
      </div>
      <div className="data-row">
        <span className="data-label">Language:</span>
        <span className="data-value">{preferences.language}</span>
      </div>
      <div className="data-row">
        <span className="data-label">Notifications:</span>
        <span className="data-value">{preferences.notifications ? 'Enabled' : 'Disabled'}</span>
      </div>
      <div className="data-row">
        <span className="data-label">Auto-save:</span>
        <span className="data-value">{preferences.autoSave ? 'Enabled' : 'Disabled'}</span>
      </div>
    </div>
  </div>
);

const WorkflowsSection: React.FC<{ workflows: UserData['workflows'] }> = ({ workflows }) => (
  <div className="section workflows-section">
    <h2>Workflow Data</h2>
    <div className="data-table">
      <div className="data-row">
        <span className="data-label">Total Workflows:</span>
        <span className="data-value">{workflows.count}</span>
      </div>
      <div className="data-row">
        <span className="data-label">Total Executions:</span>
        <span className="data-value">{workflows.totalExecutions}</span>
      </div>
      <div className="data-row">
        <span className="data-label">Last Modified:</span>
        <span className="data-value">{new Date(workflows.lastModified).toLocaleString()}</span>
      </div>
    </div>
    <p className="section-note">
      Individual workflow data is included in your data export. This includes workflow 
      configurations, execution history, and associated metadata.
    </p>
  </div>
);

const ConnectionsSection: React.FC<{ connections: UserData['connections'] }> = ({ connections }) => (
  <div className="section connections-section">
    <h2>n8n Connections</h2>
    <div className="data-table">
      <div className="data-row">
        <span className="data-label">Total Connections:</span>
        <span className="data-value">{connections.count}</span>
      </div>
      <div className="data-row">
        <span className="data-label">Connected Providers:</span>
        <span className="data-value">{connections.providers.join(', ') || 'None'}</span>
      </div>
    </div>
    <p className="section-note">
      Connection credentials are encrypted and not included in data exports for security reasons. 
      Only connection metadata (provider names, creation dates) is included.
    </p>
  </div>
);

const ActivitySection: React.FC<{ activityLog: UserData['activityLog'] }> = ({ activityLog }) => (
  <div className="section activity-section">
    <h2>Activity Log</h2>
    <div className="activity-list">
      {activityLog.length > 0 ? (
        activityLog.slice(0, 20).map((activity) => (
          <div key={activity.id} className="activity-item">
            <div className="activity-header">
              <span className="activity-action">{activity.action}</span>
              <span className="activity-time">{new Date(activity.timestamp).toLocaleString()}</span>
            </div>
            <p className="activity-details">{activity.details}</p>
          </div>
        ))
      ) : (
        <p>No recent activity recorded.</p>
      )}
    </div>
    {activityLog.length > 20 && (
      <p className="section-note">
        Showing last 20 activities. Complete activity log is available in your data export.
      </p>
    )}
  </div>
);

const ProcessingSection: React.FC<{ dataProcessingLog: UserData['dataProcessingLog'] }> = ({ dataProcessingLog }) => (
  <div className="section processing-section">
    <h2>Data Processing Records</h2>
    <p className="section-description">
      This section shows how we process your personal data in compliance with GDPR Article 30.
    </p>
    <div className="processing-list">
      {dataProcessingLog.map((record) => (
        <div key={record.id} className="processing-item">
          <h4>{record.purpose}</h4>
          <div className="processing-details">
            <div className="detail-row">
              <span className="detail-label">Legal Basis:</span>
              <span className="detail-value">{record.legalBasis}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Data Types:</span>
              <span className="detail-value">{record.dataTypes.join(', ')}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Started:</span>
              <span className="detail-value">{new Date(record.timestamp).toLocaleString()}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Retention:</span>
              <span className="detail-value">{record.retention}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default DataDashboard;
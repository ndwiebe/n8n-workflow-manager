import React, { useState, useEffect } from 'react';
import { privacyService, ExportRequest, ExportStatus } from '../../services/privacyService';
import './DataExport.css';

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  size: string;
  included: string[];
}

const DataExport: React.FC = () => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(['all']);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'xml'>('json');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportHistory, setExportHistory] = useState<ExportRequest[]>([]);
  const [currentExport, setCurrentExport] = useState<ExportRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exportOptions: ExportOption[] = [
    {
      id: 'all',
      name: 'Complete Data Export',
      description: 'All your personal data in a comprehensive package',
      icon: '📦',
      size: '~5-50MB',
      included: [
        'Personal information',
        'Account settings',
        'Workflow configurations',
        'Execution history',
        'Connection metadata',
        'Activity logs',
        'Data processing records'
      ]
    },
    {
      id: 'personal',
      name: 'Personal Information Only',
      description: 'Basic account and profile information',
      icon: '👤',
      size: '~10KB',
      included: [
        'Name and email',
        'Account creation date',
        'Last login information',
        'Account status'
      ]
    },
    {
      id: 'workflows',
      name: 'Workflows & Executions',
      description: 'All workflow configurations and execution history',
      icon: '🔄',
      size: '~1-20MB',
      included: [
        'Workflow definitions',
        'Execution logs',
        'Performance metrics',
        'Error logs',
        'Scheduling information'
      ]
    },
    {
      id: 'connections',
      name: 'Connection Data',
      description: 'n8n connection configurations (credentials excluded)',
      icon: '🔗',
      size: '~50KB',
      included: [
        'Connection names',
        'Provider types',
        'Creation dates',
        'Usage statistics'
      ]
    },
    {
      id: 'activity',
      name: 'Activity & Audit Logs',
      description: 'Complete activity history and audit trail',
      icon: '📋',
      size: '~100KB-2MB',
      included: [
        'Login history',
        'Action logs',
        'System events',
        'Security events',
        'Data access logs'
      ]
    }
  ];

  useEffect(() => {
    loadExportHistory();
    // Poll for current export status if there's an active export
    const interval = setInterval(checkExportStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadExportHistory = async () => {
    try {
      const history = await privacyService.getExportHistory();
      setExportHistory(history);
      
      // Check if there's a current export in progress
      const activeExport = history.find(exp => 
        exp.status === 'pending' || exp.status === 'processing'
      );
      setCurrentExport(activeExport || null);
    } catch (err) {
      console.error('Error loading export history:', err);
    }
  };

  const checkExportStatus = async () => {
    if (currentExport) {
      try {
        const status = await privacyService.getExportStatus(currentExport.id);
        if (status.status !== currentExport.status) {
          setCurrentExport({ ...currentExport, ...status });
          if (status.status === 'completed' || status.status === 'failed') {
            loadExportHistory();
            if (status.status === 'completed') {
              setCurrentExport(null);
            }
          }
        }
      } catch (err) {
        console.error('Error checking export status:', err);
      }
    }
  };

  const handleOptionChange = (optionId: string) => {
    if (optionId === 'all') {
      setSelectedOptions(['all']);
    } else {
      const newOptions = selectedOptions.filter(id => id !== 'all');
      if (selectedOptions.includes(optionId)) {
        const filtered = newOptions.filter(id => id !== optionId);
        setSelectedOptions(filtered.length ? filtered : ['all']);
      } else {
        setSelectedOptions([...newOptions, optionId]);
      }
    }
  };

  const handleExport = async () => {
    if (currentExport) {
      setError('An export is already in progress. Please wait for it to complete.');
      return;
    }

    try {
      setIsExporting(true);
      setError(null);
      
      const exportRequest = await privacyService.requestDataExport({
        categories: selectedOptions,
        format: exportFormat,
        includeDeleted: false
      });
      
      setCurrentExport(exportRequest);
      loadExportHistory();
      
    } catch (err) {
      setError('Failed to start export. Please try again.');
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownload = async (exportId: string) => {
    try {
      await privacyService.downloadExport(exportId);
    } catch (err) {
      setError('Failed to download export. Please try again.');
      console.error('Download error:', err);
    }
  };

  const getStatusBadge = (status: ExportStatus) => {
    const statusConfig = {
      pending: { label: 'Pending', color: '#f39c12', icon: '⏳' },
      processing: { label: 'Processing', color: '#3498db', icon: '⚙️' },
      completed: { label: 'Ready', color: '#27ae60', icon: '✅' },
      failed: { label: 'Failed', color: '#e74c3c', icon: '❌' },
      expired: { label: 'Expired', color: '#95a5a6', icon: '⏰' },
    };
    
    const config = statusConfig[status];
    return (
      <span 
        className="status-badge" 
        style={{ backgroundColor: config.color }}
      >
        {config.icon} {config.label}
      </span>
    );
  };

  const getEstimatedSize = () => {
    if (selectedOptions.includes('all')) {
      return '~5-50MB';
    }
    
    const selectedSizes = exportOptions
      .filter(opt => selectedOptions.includes(opt.id))
      .map(opt => opt.size);
    
    return selectedSizes.length > 0 ? selectedSizes.join(', ') : '~10KB';
  };

  return (
    <div className="data-export">
      <div className="export-header">
        <h1>Export Your Data</h1>
        <p>
          Download a complete copy of your personal data in compliance with GDPR Article 20 
          (Right to Data Portability). Choose what data to include and in which format.
        </p>
      </div>

      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button onClick={() => setError(null)} className="error-close">×</button>
        </div>
      )}

      {currentExport && (
        <div className="current-export">
          <h3>Current Export Status</h3>
          <div className="export-status-card">
            <div className="status-header">
              <span className="export-id">Export #{currentExport.id.slice(-6)}</span>
              {getStatusBadge(currentExport.status)}
            </div>
            <div className="status-details">
              <p><strong>Started:</strong> {new Date(currentExport.createdAt).toLocaleString()}</p>
              <p><strong>Format:</strong> {currentExport.format.toUpperCase()}</p>
              <p><strong>Categories:</strong> {currentExport.categories.join(', ')}</p>
              {currentExport.status === 'processing' && (
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: '45%' }}></div>
                </div>
              )}
              {currentExport.status === 'completed' && (
                <button 
                  onClick={() => handleDownload(currentExport.id)}
                  className="btn-primary"
                >
                  📥 Download Export
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="export-configuration">
        <h2>Configure Your Export</h2>
        
        <div className="export-options">
          <h3>Select Data Categories</h3>
          <div className="options-grid">
            {exportOptions.map((option) => (
              <div
                key={option.id}
                className={`option-card ${
                  selectedOptions.includes(option.id) || 
                  (selectedOptions.includes('all') && option.id !== 'all')
                    ? 'selected' 
                    : ''
                }`}
                onClick={() => handleOptionChange(option.id)}
              >
                <div className="option-header">
                  <span className="option-icon">{option.icon}</span>
                  <div className="option-info">
                    <h4>{option.name}</h4>
                    <p className="option-size">{option.size}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={
                      selectedOptions.includes(option.id) || 
                      (selectedOptions.includes('all') && option.id !== 'all')
                    }
                    onChange={() => handleOptionChange(option.id)}
                    className="option-checkbox"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <p className="option-description">{option.description}</p>
                <div className="option-details">
                  <h5>Includes:</h5>
                  <ul>
                    {option.included.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="format-selection">
          <h3>Export Format</h3>
          <div className="format-options">
            <label className="format-option">
              <input
                type="radio"
                value="json"
                checked={exportFormat === 'json'}
                onChange={(e) => setExportFormat(e.target.value as 'json')}
              />
              <div className="format-info">
                <span className="format-name">JSON</span>
                <span className="format-description">Machine-readable, preserves data structure</span>
              </div>
            </label>
            <label className="format-option">
              <input
                type="radio"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={(e) => setExportFormat(e.target.value as 'csv')}
              />
              <div className="format-info">
                <span className="format-name">CSV</span>
                <span className="format-description">Spreadsheet-compatible, tabular data</span>
              </div>
            </label>
            <label className="format-option">
              <input
                type="radio"
                value="xml"
                checked={exportFormat === 'xml'}
                onChange={(e) => setExportFormat(e.target.value as 'xml')}
              />
              <div className="format-info">
                <span className="format-name">XML</span>
                <span className="format-description">Structured markup, widely supported</span>
              </div>
            </label>
          </div>
        </div>

        <div className="export-summary">
          <h3>Export Summary</h3>
          <div className="summary-card">
            <div className="summary-item">
              <span className="summary-label">Selected Categories:</span>
              <span className="summary-value">
                {selectedOptions.includes('all') 
                  ? 'All Data' 
                  : `${selectedOptions.length} categories`
                }
              </span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Format:</span>
              <span className="summary-value">{exportFormat.toUpperCase()}</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Estimated Size:</span>
              <span className="summary-value">{getEstimatedSize()}</span>
            </div>
          </div>
        </div>

        <div className="export-actions">
          <button
            onClick={handleExport}
            disabled={isExporting || !!currentExport}
            className="btn-primary export-btn"
          >
            {isExporting ? (
              <>
                <span className="spinner-sm"></span>
                Starting Export...
              </>
            ) : (
              <>
                📤 Start Export
              </>
            )}
          </button>
        </div>
      </div>

      {exportHistory.length > 0 && (
        <div className="export-history">
          <h2>Export History</h2>
          <div className="history-list">
            {exportHistory.slice(0, 10).map((exportReq) => (
              <div key={exportReq.id} className="history-item">
                <div className="history-header">
                  <div className="history-info">
                    <span className="history-id">Export #{exportReq.id.slice(-6)}</span>
                    <span className="history-date">
                      {new Date(exportReq.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {getStatusBadge(exportReq.status)}
                </div>
                <div className="history-details">
                  <p><strong>Format:</strong> {exportReq.format.toUpperCase()}</p>
                  <p><strong>Categories:</strong> {exportReq.categories.join(', ')}</p>
                  {exportReq.status === 'completed' && exportReq.expiresAt && (
                    <p><strong>Expires:</strong> {new Date(exportReq.expiresAt).toLocaleDateString()}</p>
                  )}
                </div>
                {exportReq.status === 'completed' && (
                  <button 
                    onClick={() => handleDownload(exportReq.id)}
                    className="btn-secondary download-btn"
                  >
                    📥 Download
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="export-info">
        <h3>Important Information</h3>
        <div className="info-grid">
          <div className="info-card">
            <h4>🔒 Security</h4>
            <p>
              Exports are encrypted and only accessible to you. Download links 
              expire after 7 days for security reasons.
            </p>
          </div>
          <div className="info-card">
            <h4>⏰ Processing Time</h4>
            <p>
              Most exports complete within 10-30 minutes. Large exports may take 
              up to 2 hours. You'll be notified when ready.
            </p>
          </div>
          <div className="info-card">
            <h4>📧 Notifications</h4>
            <p>
              We'll send an email notification when your export is ready for 
              download. Check your spam folder if you don't see it.
            </p>
          </div>
          <div className="info-card">
            <h4>❓ Need Help?</h4>
            <p>
              Contact our Data Protection Officer at dpo@n8n-workflow-manager.com 
              if you need assistance with your export.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataExport;
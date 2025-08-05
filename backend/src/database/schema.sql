-- n8n Workflow Manager Database Schema - Multi-Tenant Enterprise Edition

-- Organizations/Tenants table for multi-tenancy
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    subscription_tier VARCHAR(50) DEFAULT 'starter' CHECK (subscription_tier IN ('starter', 'professional', 'enterprise')),
    max_users INTEGER DEFAULT 5,
    max_workflows INTEGER DEFAULT 10,
    features JSONB DEFAULT '{}',
    encryption_key_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    CONSTRAINT valid_domain CHECK (domain ~* '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}$')
);

-- Users table with organization context
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user', 'viewer')),
    permissions JSONB DEFAULT '{}',
    email_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE NULL,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL,
    UNIQUE(organization_id, email)
);

-- Admin users table (extends users)
CREATE TABLE admin_users (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    system_admin BOOLEAN DEFAULT FALSE,
    permissions TEXT[] DEFAULT '{}',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client business profiles for SMB metrics
CREATE TABLE client_business_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    business_type VARCHAR(100) NOT NULL,
    industry VARCHAR(100),
    employee_count INTEGER,
    annual_revenue DECIMAL(15, 2),
    business_goals TEXT[],
    pain_points TEXT[],
    current_tools JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id)
);

-- Workflow modules table with tenant isolation
CREATE TABLE workflow_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    icon VARCHAR(100),
    required_credentials JSONB NOT NULL DEFAULT '[]',
    external_tools TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    estimated_setup_time VARCHAR(50),
    monthly_price DECIMAL(10, 2),
    active BOOLEAN DEFAULT TRUE,
    is_template BOOLEAN DEFAULT FALSE,
    template_for_industry VARCHAR(100),
    compliance_requirements TEXT[],
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User workflow configurations with enhanced security
CREATE TABLE workflow_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflow_modules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'configuring', 'validating', 'scheduled', 'active', 'error', 'suspended')),
    credentials JSONB NOT NULL DEFAULT '{}',
    encrypted_credentials TEXT, -- Encrypted credential storage
    activated_at TIMESTAMP WITH TIME ZONE,
    scheduled_activation TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    security_scan_status VARCHAR(50) DEFAULT 'pending',
    last_security_scan TIMESTAMP WITH TIME ZONE,
    compliance_status VARCHAR(50) DEFAULT 'unknown',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workflow_id, user_id)
);

-- Business metrics and ROI tracking
CREATE TABLE business_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflow_modules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metric_type VARCHAR(100) NOT NULL, -- 'roi', 'time_saved', 'cost_reduction', 'efficiency'
    metric_value DECIMAL(15, 2) NOT NULL,
    metric_unit VARCHAR(50) NOT NULL, -- 'hours', 'dollars', 'percentage', 'count'
    measurement_period VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly'
    baseline_value DECIMAL(15, 2),
    target_value DECIMAL(15, 2),
    actual_value DECIMAL(15, 2),
    metadata JSONB DEFAULT '{}',
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROI calculations tracking
CREATE TABLE roi_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    workflow_id UUID NOT NULL REFERENCES workflow_modules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    manual_time_per_task INTEGER NOT NULL, -- in minutes
    task_frequency VARCHAR(20) NOT NULL CHECK (task_frequency IN ('daily', 'weekly', 'monthly')),
    tasks_per_period INTEGER NOT NULL,
    employee_hourly_rate DECIMAL(10, 2) NOT NULL,
    implementation_hours DECIMAL(8, 2) NOT NULL,
    implementation_rate DECIMAL(10, 2) NOT NULL,
    monthly_savings DECIMAL(12, 2) NOT NULL,
    implementation_cost DECIMAL(12, 2) NOT NULL,
    monthly_operating_cost DECIMAL(12, 2) NOT NULL,
    payback_period DECIMAL(8, 2) NOT NULL, -- in months
    annual_roi DECIMAL(8, 2) NOT NULL, -- percentage
    three_year_roi DECIMAL(15, 2) NOT NULL,
    calculation_inputs JSONB NOT NULL,
    calculation_results JSONB NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced analytics and metrics with tenant isolation
CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    workflow_id UUID REFERENCES workflow_modules(id) ON DELETE SET NULL,
    configuration_id UUID REFERENCES workflow_configurations(id) ON DELETE SET NULL,
    event_data JSONB DEFAULT '{}',
    business_impact JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events and monitoring
CREATE TABLE security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'failed_login', 'suspicious_activity', 'privilege_escalation', etc.
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    source_ip INET,
    user_agent TEXT,
    event_data JSONB DEFAULT '{}',
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit log with enhanced tracking
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    business_context JSONB DEFAULT '{}',
    compliance_relevant BOOLEAN DEFAULT FALSE,
    retention_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Compliance tracking for SMB requirements
CREATE TABLE compliance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    compliance_type VARCHAR(100) NOT NULL, -- 'SOX', 'GDPR', 'HIPAA', 'SOC2', etc.
    requirement_id VARCHAR(100) NOT NULL,
    workflow_id UUID REFERENCES workflow_modules(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('compliant', 'non_compliant', 'under_review', 'not_applicable')),
    evidence_data JSONB DEFAULT '{}',
    last_assessment TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    next_assessment TIMESTAMP WITH TIME ZONE,
    responsible_user UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data retention policies
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    data_type VARCHAR(100) NOT NULL, -- 'audit_log', 'analytics_events', 'security_events', etc.
    retention_period INTERVAL NOT NULL,
    deletion_method VARCHAR(50) NOT NULL CHECK (deletion_method IN ('soft_delete', 'hard_delete', 'anonymize')),
    active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Encrypted secrets storage
CREATE TABLE encrypted_secrets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key_name VARCHAR(255) NOT NULL,
    encrypted_value TEXT NOT NULL,
    encryption_algorithm VARCHAR(100) NOT NULL,
    key_version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    last_accessed TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, key_name)
);

-- System notifications with tenant context
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('info', 'warning', 'error', 'success', 'security', 'business')),
    category VARCHAR(50) DEFAULT 'general', -- 'security', 'business', 'system', 'compliance'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    data JSONB DEFAULT '{}',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Business intelligence summary tables
CREATE TABLE business_intelligence_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    summary_type VARCHAR(100) NOT NULL, -- 'monthly_roi', 'cost_savings', 'efficiency_gains'
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    summary_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, summary_type, period_start, period_end)
);

-- Performance Indexes for multi-tenant queries
CREATE INDEX idx_organizations_domain ON organizations(domain) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_subscription ON organizations(subscription_tier) WHERE deleted_at IS NULL;

CREATE INDEX idx_users_organization ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email_org ON users(organization_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_last_login ON users(last_login) WHERE deleted_at IS NULL;

CREATE INDEX idx_workflow_modules_org ON workflow_modules(organization_id);
CREATE INDEX idx_workflow_modules_category_org ON workflow_modules(organization_id, category);
CREATE INDEX idx_workflow_modules_active_org ON workflow_modules(organization_id, active);
CREATE INDEX idx_workflow_modules_template ON workflow_modules(is_template, template_for_industry);

CREATE INDEX idx_workflow_configurations_org ON workflow_configurations(organization_id);
CREATE INDEX idx_workflow_configurations_user ON workflow_configurations(user_id);
CREATE INDEX idx_workflow_configurations_workflow ON workflow_configurations(workflow_id);
CREATE INDEX idx_workflow_configurations_status_org ON workflow_configurations(organization_id, status);

CREATE INDEX idx_business_metrics_org ON business_metrics(organization_id);
CREATE INDEX idx_business_metrics_workflow ON business_metrics(workflow_id);
CREATE INDEX idx_business_metrics_type_org ON business_metrics(organization_id, metric_type);
CREATE INDEX idx_business_metrics_measured_at ON business_metrics(measured_at);

CREATE INDEX idx_roi_calculations_org ON roi_calculations(organization_id);
CREATE INDEX idx_roi_calculations_workflow ON roi_calculations(workflow_id);
CREATE INDEX idx_roi_calculations_user ON roi_calculations(user_id);

CREATE INDEX idx_analytics_events_org ON analytics_events(organization_id);
CREATE INDEX idx_analytics_events_type_org ON analytics_events(organization_id, event_type);
CREATE INDEX idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_risk ON analytics_events(risk_score) WHERE risk_score > 50;

CREATE INDEX idx_security_events_org ON security_events(organization_id);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_resolved ON security_events(resolved);
CREATE INDEX idx_security_events_created ON security_events(created_at);

CREATE INDEX idx_audit_log_org ON audit_log(organization_id);
CREATE INDEX idx_audit_log_user ON audit_log(user_id);
CREATE INDEX idx_audit_log_action_org ON audit_log(organization_id, action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
CREATE INDEX idx_audit_log_compliance ON audit_log(compliance_relevant) WHERE compliance_relevant = TRUE;

CREATE INDEX idx_compliance_records_org ON compliance_records(organization_id);
CREATE INDEX idx_compliance_records_type ON compliance_records(compliance_type);
CREATE INDEX idx_compliance_records_status ON compliance_records(status);
CREATE INDEX idx_compliance_records_assessment ON compliance_records(next_assessment);

CREATE INDEX idx_encrypted_secrets_org ON encrypted_secrets(organization_id);
CREATE INDEX idx_encrypted_secrets_name_org ON encrypted_secrets(organization_id, key_name);
CREATE INDEX idx_encrypted_secrets_expires ON encrypted_secrets(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read_org ON notifications(organization_id, read);
CREATE INDEX idx_notifications_priority ON notifications(priority);
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_bi_summaries_org ON business_intelligence_summaries(organization_id);
CREATE INDEX idx_bi_summaries_type ON business_intelligence_summaries(summary_type);
CREATE INDEX idx_bi_summaries_period ON business_intelligence_summaries(period_start, period_end);

-- Row Level Security (RLS) policies for multi-tenant data isolation
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE encrypted_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_intelligence_summaries ENABLE ROW LEVEL SECURITY;

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION log_audit_changes()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID;
    user_id UUID;
BEGIN
    -- Get organization_id and user_id from context or table
    IF NEW.organization_id IS NOT NULL THEN
        org_id = NEW.organization_id;
    ELSIF OLD.organization_id IS NOT NULL THEN
        org_id = OLD.organization_id;
    END IF;

    -- Log the change to audit_log
    INSERT INTO audit_log (
        organization_id,
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        org_id,
        COALESCE(current_setting('app.current_user_id', TRUE)::UUID, NULL),
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' THEN row_to_json(NEW) 
             WHEN TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        NOW()
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Create update triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_modules_updated_at BEFORE UPDATE ON workflow_modules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_configurations_updated_at BEFORE UPDATE ON workflow_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_compliance_records_updated_at BEFORE UPDATE ON compliance_records
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_encrypted_secrets_updated_at BEFORE UPDATE ON encrypted_secrets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create audit triggers for critical tables
CREATE TRIGGER audit_organizations_changes
    AFTER INSERT OR UPDATE OR DELETE ON organizations
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_users_changes
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_workflow_configurations_changes
    AFTER INSERT OR UPDATE OR DELETE ON workflow_configurations
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

CREATE TRIGGER audit_encrypted_secrets_changes
    AFTER INSERT OR UPDATE OR DELETE ON encrypted_secrets
    FOR EACH ROW EXECUTE FUNCTION log_audit_changes();

-- Data retention cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_data()
RETURNS VOID AS $$
DECLARE
    policy RECORD;
    cleanup_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Process each active retention policy
    FOR policy IN 
        SELECT * FROM data_retention_policies WHERE active = TRUE
    LOOP
        cleanup_date := NOW() - policy.retention_period;
        
        -- Apply retention policy based on data type and method
        CASE policy.data_type
            WHEN 'audit_log' THEN
                IF policy.deletion_method = 'hard_delete' THEN
                    DELETE FROM audit_log 
                    WHERE organization_id = policy.organization_id 
                    AND created_at < cleanup_date
                    AND compliance_relevant = FALSE;
                END IF;
            WHEN 'analytics_events' THEN
                IF policy.deletion_method = 'hard_delete' THEN
                    DELETE FROM analytics_events 
                    WHERE organization_id = policy.organization_id 
                    AND created_at < cleanup_date;
                END IF;
            WHEN 'security_events' THEN
                IF policy.deletion_method = 'hard_delete' THEN
                    DELETE FROM security_events 
                    WHERE organization_id = policy.organization_id 
                    AND created_at < cleanup_date
                    AND resolved = TRUE;
                END IF;
        END CASE;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Views for business intelligence and reporting
CREATE OR REPLACE VIEW organization_business_summary AS
SELECT 
    o.id as organization_id,
    o.name as organization_name,
    o.subscription_tier,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT wm.id) as total_workflows,
    COUNT(DISTINCT wc.id) as active_configurations,
    COALESCE(AVG(bm.metric_value) FILTER (WHERE bm.metric_type = 'roi'), 0) as average_roi,
    COALESCE(SUM(bm.metric_value) FILTER (WHERE bm.metric_type = 'cost_reduction'), 0) as total_cost_savings,
    COALESCE(SUM(bm.metric_value) FILTER (WHERE bm.metric_type = 'time_saved'), 0) as total_time_saved
FROM organizations o
LEFT JOIN users u ON o.id = u.organization_id AND u.deleted_at IS NULL
LEFT JOIN workflow_modules wm ON o.id = wm.organization_id
LEFT JOIN workflow_configurations wc ON wm.id = wc.workflow_id AND wc.status = 'active'
LEFT JOIN business_metrics bm ON wm.id = bm.workflow_id
WHERE o.deleted_at IS NULL
GROUP BY o.id, o.name, o.subscription_tier;
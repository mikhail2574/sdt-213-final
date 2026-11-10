ALTER TABLE users ADD CONSTRAINT ck_users_role CHECK (role IN ('Administrator','Staff','Student','Faculty','Applicant'));
ALTER TABLE users ADD CONSTRAINT ck_users_status CHECK (status IN ('Active','Pending','Inactive'));
ALTER TABLE users ADD CONSTRAINT ck_users_console_access CHECK (console_access IS NULL OR (role='Staff' AND console_access IN ('Operator','Viewer')));
ALTER TABLE users ADD CONSTRAINT ck_users_failed_attempts CHECK (failed_attempts >= 0);
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_audit_timestamp ON audit_entries(timestamp);

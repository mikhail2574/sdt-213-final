CREATE TABLE module_sso_tickets (
 ticket_hash VARCHAR(64) PRIMARY KEY, module_code VARCHAR(20) NOT NULL, user_id BIGINT NOT NULL,
 token_id VARCHAR(36) NOT NULL, expires_at TIMESTAMP(6) NOT NULL, used_at TIMESTAMP(6) NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(token_id) REFERENCES auth_sessions(token_id) ON DELETE CASCADE
);
CREATE INDEX idx_sso_ticket_expiry ON module_sso_tickets(expires_at);

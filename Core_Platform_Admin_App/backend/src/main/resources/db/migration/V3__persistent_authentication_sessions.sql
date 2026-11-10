CREATE TABLE auth_sessions (
 token_id VARCHAR(36) PRIMARY KEY,
 user_id BIGINT NOT NULL,
 created_at TIMESTAMP(6) NOT NULL,
 last_activity_at TIMESTAMP(6) NOT NULL,
 expires_at TIMESTAMP(6) NOT NULL,
 revoked_at TIMESTAMP(6) NULL,
 CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
 CONSTRAINT ck_sessions_expiry CHECK (expires_at > created_at)
);
CREATE INDEX idx_sessions_user ON auth_sessions(user_id);

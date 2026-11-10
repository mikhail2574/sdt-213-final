ALTER TABLE users ADD COLUMN preferred_name VARCHAR(120) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN phone VARCHAR(40) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN personal_email VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN photo_url VARCHAR(1024) NOT NULL DEFAULT '';
CREATE INDEX idx_users_directory ON users(status, role, department, name, id);

CREATE TABLE platform_settings (id INT PRIMARY KEY, university_name VARCHAR(120) NOT NULL,
 term_start DATE NULL, term_end DATE NULL, min_password_length INT NOT NULL,
 session_timeout INT NOT NULL, lockout_attempts INT NOT NULL, email_sender VARCHAR(255) NOT NULL);
INSERT INTO platform_settings VALUES (1,'Core University',NULL,NULL,8,30,5,'noreply@coreplatform.dev');
CREATE TABLE connected_modules (code VARCHAR(20) PRIMARY KEY, name VARCHAR(80) NOT NULL, enabled BOOLEAN NOT NULL);
INSERT INTO connected_modules VALUES ('lms','LMS Core',TRUE),('sis','SIS',TRUE),('scheduling','Academic Scheduling',TRUE),('admissions','Admissions',TRUE);
CREATE TABLE role_permissions (role_code VARCHAR(25) NOT NULL, permission VARCHAR(60) NOT NULL, PRIMARY KEY(role_code,permission));
INSERT INTO role_permissions VALUES
 ('Administrator','users.view'),('Administrator','users.create'),('Administrator','users.edit'),('Administrator','roles.manage'),
 ('Administrator','dashboard.view'),('Administrator','audit.view'),('Administrator','reports.view'),('Administrator','settings.manage'),('Administrator','announcements.send'),
 ('Operator','users.view'),('Operator','users.create'),('Operator','users.edit'),('Operator','dashboard.view'),
 ('Viewer','users.view'),('Viewer','dashboard.view'),('Viewer','reports.view'),
 ('Faculty','directory.view'),('Faculty','reports.view'),('Faculty','messages.send'),('Faculty','announcements.send'),
 ('Staff','directory.view'),('Staff','messages.send'),('Student','directory.view'),('Student','messages.send'),('Applicant','messages.send'),
 ('Administrator','messages.send'),('Operator','messages.send'),('Viewer','messages.send');
INSERT INTO role_permissions VALUES
 ('Administrator','modules.lms'),('Administrator','modules.sis'),('Administrator','modules.scheduling'),('Administrator','modules.admissions'),
 ('Operator','modules.lms'),('Operator','modules.sis'),('Operator','modules.scheduling'),('Operator','modules.admissions'),
 ('Viewer','modules.lms'),('Viewer','modules.sis'),('Viewer','modules.scheduling'),('Viewer','modules.admissions'),
 ('Staff','modules.lms'),('Staff','modules.sis'),('Staff','modules.scheduling'),('Staff','modules.admissions'),
 ('Student','modules.lms'),('Student','modules.sis'),('Student','modules.scheduling'),
 ('Faculty','modules.lms'),('Faculty','modules.sis'),('Faculty','modules.scheduling'),('Applicant','modules.admissions');

CREATE TABLE email_tokens (token_hash VARCHAR(64) PRIMARY KEY, user_id BIGINT NOT NULL, purpose VARCHAR(20) NOT NULL,
 expires_at TIMESTAMP(6) NOT NULL, used_at TIMESTAMP(6) NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX idx_email_tokens_user ON email_tokens(user_id,purpose);
CREATE TABLE email_outbox (id BIGINT AUTO_INCREMENT PRIMARY KEY, recipient VARCHAR(255) NOT NULL,
 subject VARCHAR(255) NOT NULL, body TEXT NOT NULL, attempts INT NOT NULL DEFAULT 0,
 next_attempt_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, sent_at TIMESTAMP NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX idx_outbox_delivery ON email_outbox(sent_at,next_attempt_at);
CREATE TABLE notification_preferences (user_id BIGINT NOT NULL, category VARCHAR(40) NOT NULL, email_enabled BOOLEAN NOT NULL,
 PRIMARY KEY(user_id,category), FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE announcements (id VARCHAR(36) PRIMARY KEY, sender_id BIGINT NOT NULL, audience VARCHAR(255) NOT NULL,
 title VARCHAR(200) NOT NULL, text TEXT NOT NULL, channel VARCHAR(20) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE notifications (id BIGINT AUTO_INCREMENT PRIMARY KEY, user_id BIGINT NOT NULL, source VARCHAR(30) NOT NULL,
 category VARCHAR(40) NOT NULL, title VARCHAR(200) NOT NULL, text TEXT NOT NULL,
 read_at TIMESTAMP NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX idx_notifications_inbox ON notifications(user_id,id);
CREATE INDEX idx_notifications_unread ON notifications(user_id,read_at);
CREATE TABLE conversations (id BIGINT AUTO_INCREMENT PRIMARY KEY, first_user BIGINT NOT NULL, second_user BIGINT NOT NULL,
 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(first_user,second_user), CHECK(first_user<second_user),
 FOREIGN KEY(first_user) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY(second_user) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE messages (id BIGINT AUTO_INCREMENT PRIMARY KEY, conversation_id BIGINT NOT NULL, sender_id BIGINT NOT NULL,
 text TEXT NOT NULL, sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
 FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE INDEX idx_messages_thread ON messages(conversation_id,id);
CREATE TABLE service_status (code VARCHAR(30) PRIMARY KEY, state VARCHAR(20) NOT NULL, latency_ms BIGINT NOT NULL,
 checked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP);

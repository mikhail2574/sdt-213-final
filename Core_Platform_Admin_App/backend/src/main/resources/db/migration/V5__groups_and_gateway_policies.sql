CREATE TABLE contact_groups (
 code VARCHAR(64) PRIMARY KEY, title VARCHAR(120) NOT NULL, group_type VARCHAR(10) NOT NULL,
 owner_id BIGINT NULL, source VARCHAR(20) NOT NULL,
 CHECK (group_type IN ('COURSE','OFFICE')),
 FOREIGN KEY(owner_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE group_members (
 group_code VARCHAR(64) NOT NULL, user_id BIGINT NOT NULL, PRIMARY KEY(group_code,user_id),
 FOREIGN KEY(group_code) REFERENCES contact_groups(code) ON DELETE CASCADE,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_group_members_user ON group_members(user_id,group_code);
ALTER TABLE conversations MODIFY first_user BIGINT NULL;
ALTER TABLE conversations MODIFY second_user BIGINT NULL;
CREATE TABLE group_threads (
 group_code VARCHAR(64) NOT NULL, requester_id BIGINT NOT NULL DEFAULT 0, conversation_id BIGINT NOT NULL UNIQUE,
 PRIMARY KEY(group_code,requester_id),
 FOREIGN KEY(group_code) REFERENCES contact_groups(code) ON DELETE CASCADE,
 FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);
CREATE TABLE gateway_policies (
 module_code VARCHAR(20) NOT NULL, path_prefix VARCHAR(200) NOT NULL, http_method VARCHAR(8) NOT NULL,
 permission VARCHAR(60) NOT NULL, PRIMARY KEY(module_code,path_prefix,http_method),
 FOREIGN KEY(module_code) REFERENCES connected_modules(code)
);
INSERT INTO gateway_policies VALUES
 ('lms','/','GET','modules.lms'),('lms','/','HEAD','modules.lms'),
 ('lms','/','POST','modules.lms'),('lms','/','PUT','modules.lms'),('lms','/','PATCH','modules.lms'),('lms','/','DELETE','modules.lms'),
 ('sis','/','GET','modules.sis'),('sis','/','HEAD','modules.sis'),
 ('sis','/','POST','modules.sis'),('sis','/','PUT','modules.sis'),('sis','/','PATCH','modules.sis'),('sis','/','DELETE','modules.sis'),
 ('scheduling','/','GET','modules.scheduling'),('scheduling','/','HEAD','modules.scheduling'),
 ('scheduling','/','POST','modules.scheduling'),('scheduling','/','PUT','modules.scheduling'),('scheduling','/','PATCH','modules.scheduling'),('scheduling','/','DELETE','modules.scheduling'),
 ('admissions','/','GET','modules.admissions'),('admissions','/','HEAD','modules.admissions'),
 ('admissions','/','POST','modules.admissions'),('admissions','/','PUT','modules.admissions'),('admissions','/','PATCH','modules.admissions'),('admissions','/','DELETE','modules.admissions');
CREATE TABLE audit_queue (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, actor VARCHAR(255) NOT NULL, action VARCHAR(100) NOT NULL,
 target VARCHAR(255) NOT NULL, success BOOLEAN NOT NULL, timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE worker_heartbeats (worker VARCHAR(30) PRIMARY KEY, checked_at TIMESTAMP NOT NULL);
CREATE INDEX idx_audit_actor_id ON audit_entries(actor,id);
CREATE INDEX idx_audit_action_id ON audit_entries(action,id);

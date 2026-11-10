CREATE TABLE audit_dispatch_lock (id INT PRIMARY KEY);
INSERT INTO audit_dispatch_lock VALUES (1);
CREATE TABLE user_photos (
 user_id BIGINT PRIMARY KEY, content_type VARCHAR(30) NOT NULL, content MEDIUMBLOB NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

package dev.coreplatform;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcUserRepository implements UserRepository {
    private final JdbcTemplate db;
    public JdbcUserRepository(JdbcTemplate db) { this.db = db; }

    private Map<String, Object> map(ResultSet rs, int row) throws SQLException {
        var result = new LinkedHashMap<String, Object>();
        var meta = rs.getMetaData();
        for (int i = 1; i <= meta.getColumnCount(); i++)
            result.put(meta.getColumnLabel(i).toLowerCase(Locale.ROOT), rs.getObject(i));
        return result;
    }
    private Map<String, Object> one(String sql, Object value) {
        var rows = db.query(sql, this::map, value);
        return rows.isEmpty() ? null : rows.get(0);
    }
    public Map<String, Object> findById(long id) { return one("SELECT * FROM users WHERE id=?", id); }
    public Map<String, Object> findByIdForUpdate(long id) { return one("SELECT * FROM users WHERE id=? FOR UPDATE", id); }
    public Map<String, Object> findByEmail(String email) { return one("SELECT * FROM users WHERE email=?", email); }
    public Map<String, Object> findByEmailForUpdate(String email) { return one("SELECT * FROM users WHERE email=? FOR UPDATE", email); }
    public List<Map<String, Object>> search(String query, String role, String status) {
        // Fetch complete rows in one query instead of querying each returned ID separately.
        return db.query("SELECT * FROM users WHERE (LOWER(name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?)) AND (?='' OR role=?) AND (?='' OR status=?) ORDER BY name LIMIT 250",
            this::map, "%" + query + "%", "%" + query + "%", role, role, status, status);
    }
    public long countAll() { return db.queryForObject("SELECT COUNT(*) FROM users", Long.class); }
    public long countByStatus(String status) { return db.queryForObject("SELECT COUNT(*) FROM users WHERE status=?", Long.class, status); }
    public long countByRole(String role) { return db.queryForObject("SELECT COUNT(*) FROM users WHERE role=?", Long.class, role); }
    public void create(String name, String email, String role, String access, String department, String hash, String status) {
        db.update("INSERT INTO users(name,email,role,console_access,department,password_hash,status) VALUES(?,?,?,?,?,?,?)",
            name, email, role, access, department, hash, status);
    }
    public void update(Map<String, Object> user) {
        db.update("UPDATE users SET name=?,department=?,status=?,role=?,console_access=? WHERE id=?",
            user.get("name"), user.get("department"), user.get("status"), user.get("role"), user.get("console_access"), user.get("id"));
    }
    public void recordFailure(long id, int attempts, Instant lockedUntil) {
        db.update("UPDATE users SET failed_attempts=?,locked_until=? WHERE id=?", attempts,
            lockedUntil == null ? null : Timestamp.from(lockedUntil), id);
    }
    public void resetFailures(long id) { db.update("UPDATE users SET failed_attempts=0,locked_until=NULL WHERE id=?", id); }
    public void recordLogin(long id, Instant now) {
        db.update("UPDATE users SET failed_attempts=0,locked_until=NULL,last_login=? WHERE id=?", Timestamp.from(now), id);
    }
    public void changePassword(long id, String hash) { db.update("UPDATE users SET password_hash=? WHERE id=?", hash, id); }
}

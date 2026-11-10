package dev.coreplatform;

import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcAuditRepository implements AuditRepository {
    private final JdbcTemplate db;
    private final org.springframework.core.env.Environment env;
    public JdbcAuditRepository(JdbcTemplate db,org.springframework.core.env.Environment env) { this.db = db; this.env=env; }
    public void append(String actor, String action, String target, boolean success) {
        boolean queued=env.getProperty("app.audit-async",Boolean.class,true) || !env.getProperty("app.audit-pipeline-enabled",Boolean.class,true);
        db.update(queued?"INSERT INTO audit_queue(actor,action,target,success) VALUES(?,?,?,?)":"INSERT INTO audit_entries(actor,action,target,success) VALUES(?,?,?,?)", actor, action, target, success);
    }
    public List<Map<String, Object>> latest(int limit) {
        return db.query("SELECT * FROM audit_entries ORDER BY id DESC LIMIT ?", (rs, n) -> Map.<String, Object>of(
            "id", rs.getLong("id"), "actor", rs.getString("actor"), "action", rs.getString("action"),
            "target", rs.getString("target"), "result", rs.getBoolean("success") ? "Success" : "Failed",
            "timestamp", rs.getTimestamp("timestamp").toInstant().toString()), limit);
    }
}

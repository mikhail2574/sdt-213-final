package dev.coreplatform;

import java.sql.Timestamp;
import java.time.Clock;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** One database lease serializes workers across instances; insert and dequeue commit together. */
@Service
public class AuditDispatcher {
    private final PlatformRepository db;
    private final Environment env;
    private final Clock clock;
    public AuditDispatcher(PlatformRepository db,Environment env,Clock clock) { this.db=db; this.env=env; this.clock=clock; }
    @Scheduled(fixedDelayString="${app.audit-poll-ms:1000}",initialDelayString="${app.audit-initial-ms:1000}")
    @Transactional
    public void drain() {
        if(!env.getProperty("app.audit-pipeline-enabled",Boolean.class,true)) return;
        db.one("SELECT id FROM audit_dispatch_lock WHERE id=1 FOR UPDATE");
        var queued=db.rows("SELECT * FROM audit_queue ORDER BY id LIMIT 200 FOR UPDATE");
        for(var item:queued) {
            db.write("INSERT INTO audit_entries(actor,action,target,success,timestamp) VALUES(?,?,?,?,?)",item.get("actor"),item.get("action"),item.get("target"),item.get("success"),Timestamp.from(java.time.Instant.parse(item.get("timestamp").toString())));
            db.write("DELETE FROM audit_queue WHERE id=?",item.get("id"));
        }
        var now=Timestamp.from(clock.instant());
        if(db.write("UPDATE worker_heartbeats SET checked_at=? WHERE worker='audit'",now)==0) db.write("INSERT INTO worker_heartbeats VALUES('audit',?)",now);
    }
}

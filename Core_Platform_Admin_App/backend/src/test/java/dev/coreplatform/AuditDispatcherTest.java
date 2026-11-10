package dev.coreplatform;

import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:audit_queue;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE","spring.datasource.username=sa","spring.datasource.password=","spring.flyway.user=sa","spring.flyway.password=","app.seed-demo=0","app.audit-async=true","app.audit-initial-ms=3600000","app.monitor-initial-ms=3600000"})
class AuditDispatcherTest {
    @Autowired AuditRepository audit;
    @Autowired AuditDispatcher dispatcher;
    @Autowired JdbcTemplate db;
    @Test void queueSurvivesDelayedPipelineAndDrainsInOrderWithoutDuplicates() {
        audit.append("first","Test","one",true); audit.append("second","Test","two",false);
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM audit_entries",Integer.class));
        assertEquals(2,db.queryForObject("SELECT COUNT(*) FROM audit_queue",Integer.class));
        dispatcher.drain(); dispatcher.drain();
        assertEquals(java.util.List.of("first","second"),db.queryForList("SELECT actor FROM audit_entries ORDER BY id",String.class));
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM audit_queue",Integer.class));
    }
}

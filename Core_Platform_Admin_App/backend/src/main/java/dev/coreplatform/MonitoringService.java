package dev.coreplatform;

import java.net.http.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class MonitoringService {
    private final ModuleService modules;
    private final PlatformRepository db;
    private final NotificationService notifications;
    private final TransactionTemplate transactions;
    private final Clock clock;
    private final org.springframework.core.env.Environment env;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).followRedirects(HttpClient.Redirect.NEVER).build();
    public MonitoringService(ModuleService modules,PlatformRepository db,NotificationService notifications,org.springframework.transaction.PlatformTransactionManager manager,Clock clock,org.springframework.core.env.Environment env) {
        this.modules=modules; this.db=db; this.notifications=notifications; this.transactions=new TransactionTemplate(manager); this.clock=clock;
        this.env=env;
    }
    @Scheduled(fixedDelayString="${app.monitor-poll-ms:30000}",initialDelayString="${app.monitor-initial-ms:10000}")
    public void checkAll() {
        db.write("INSERT INTO worker_heartbeats(worker,checked_at) VALUES('monitoring',?) ON DUPLICATE KEY UPDATE checked_at=VALUES(checked_at)",Timestamp.from(clock.instant()));
        for(String code:ModuleService.CODES) {
            var module=db.one("SELECT enabled FROM connected_modules WHERE code=?",code);
            String state; long start=System.nanoTime();
            if(!Boolean.TRUE.equals(module.get("enabled"))) state="Disabled";
            else try {
                var response=client.send(HttpRequest.newBuilder(modules.uri(code,"/health",null)).timeout(Duration.ofSeconds(2)).GET().build(),HttpResponse.BodyHandlers.discarding());
                state=response.statusCode()>=200 && response.statusCode()<300?(System.nanoTime()-start>500_000_000?"Degraded":"Operational"):"Down";
            } catch(InterruptedException e) { Thread.currentThread().interrupt(); return; }
            catch(Exception e) { state="Down"; }
            String finalState=state; long latency=(System.nanoTime()-start)/1_000_000;
            save(code,finalState,latency);
        }
        save("database","Operational",0);
        db.count("SELECT COUNT(*) FROM auth_sessions"); save("identity","Operational",0);
        save("gateway",db.count("SELECT COUNT(*) FROM gateway_policies")>0?"Operational":"Down",0);
        String auditState=!env.getProperty("app.audit-pipeline-enabled",Boolean.class,true)?"Down":
            db.count("SELECT COUNT(*) FROM audit_queue WHERE timestamp<?",Timestamp.from(clock.instant().minusSeconds(5)))>0?"Degraded":"Operational";
        save("audit",auditState,0);
        String mailState=!env.getProperty("app.mail-enabled",Boolean.class,false)?"Disabled":
            db.count("SELECT COUNT(*) FROM email_outbox WHERE sent_at IS NULL AND attempts>0")>0?"Degraded":heartbeat("email",60);
        save("email",mailState,0);
    }
    private void save(String code,String finalState,long latency) {
            transactions.executeWithoutResult(tx->{
                db.one("SELECT id FROM platform_settings WHERE id=1 FOR UPDATE");
                var previous=db.one("SELECT state FROM service_status WHERE code=?",code);
                boolean alert=Set.of("Down","Degraded").contains(finalState) && (previous==null || !finalState.equals(previous.get("state")));
                if(previous==null) db.write("INSERT INTO service_status(code,state,latency_ms,checked_at) VALUES(?,?,?,?)",code,finalState,latency,Timestamp.from(clock.instant()));
                else db.write("UPDATE service_status SET state=?,latency_ms=?,checked_at=? WHERE code=?",finalState,latency,Timestamp.from(clock.instant()),code);
                if(alert) for(var u:db.rows("SELECT id FROM users WHERE role='Administrator' AND status='Active'")) notifications.notifyOne(PlatformRepository.id(u),"monitoring","system","Service "+finalState,code+" is "+finalState);
            });
    }
    private String heartbeat(String worker,int seconds) {
        var row=db.one("SELECT checked_at FROM worker_heartbeats WHERE worker=?",worker);
        return row==null?"Unknown":Instant.parse(row.get("checked_at").toString()).isBefore(clock.instant().minusSeconds(seconds))?"Down":"Operational";
    }
    public List<Map<String,Object>> status() {
        var rows=new ArrayList<Map<String,Object>>();
        rows.add(Map.of("code","core","state","Operational","checked_at",clock.instant().toString(),"latency_ms",0));
        rows.addAll(db.rows("SELECT m.code,m.name,CASE WHEN m.enabled=FALSE THEN 'Disabled' ELSE COALESCE(s.state,'Unknown') END AS state,s.latency_ms,s.checked_at FROM connected_modules m LEFT JOIN service_status s ON s.code=m.code ORDER BY m.code"));
        for(String code:List.of("database","identity","gateway","audit","email")) {
            var status=db.one("SELECT code,state,latency_ms,checked_at FROM service_status WHERE code=?",code);
            rows.add(status==null?Map.of("code",code,"state","Unknown","checked_at",clock.instant().toString(),"latency_ms",0):status);
        }
        var monitoring=db.one("SELECT checked_at FROM worker_heartbeats WHERE worker='monitoring'");
        rows.add(Map.of("code","monitoring","state",heartbeat("monitoring",90),"checked_at",monitoring==null?clock.instant().toString():monitoring.get("checked_at"),"latency_ms",0));
        return rows;
    }
}

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
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).followRedirects(HttpClient.Redirect.NEVER).build();
    public MonitoringService(ModuleService modules,PlatformRepository db,NotificationService notifications,org.springframework.transaction.PlatformTransactionManager manager,Clock clock) {
        this.modules=modules; this.db=db; this.notifications=notifications; this.transactions=new TransactionTemplate(manager); this.clock=clock;
    }
    @Scheduled(fixedDelayString="${app.monitor-poll-ms:30000}",initialDelayString="${app.monitor-initial-ms:10000}")
    public void checkAll() {
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
            transactions.executeWithoutResult(tx->{
                db.one("SELECT code FROM connected_modules WHERE code=? FOR UPDATE",code);
                var previous=db.one("SELECT state FROM service_status WHERE code=?",code);
                boolean alert=Set.of("Down","Degraded").contains(finalState) && (previous==null || !finalState.equals(previous.get("state")));
                if(previous==null) db.write("INSERT INTO service_status(code,state,latency_ms,checked_at) VALUES(?,?,?,?)",code,finalState,latency,Timestamp.from(clock.instant()));
                else db.write("UPDATE service_status SET state=?,latency_ms=?,checked_at=? WHERE code=?",finalState,latency,Timestamp.from(clock.instant()),code);
                if(alert) for(var u:db.rows("SELECT id FROM users WHERE role='Administrator' AND status='Active'")) notifications.notifyOne(PlatformRepository.id(u),"monitoring","system","Service "+finalState,code+" is "+finalState);
            });
        }
    }
    public List<Map<String,Object>> status() {
        var rows=new ArrayList<Map<String,Object>>();
        rows.add(Map.of("code","core","state","Operational","checked_at",clock.instant().toString(),"latency_ms",0));
        rows.addAll(db.rows("SELECT m.code,m.name,CASE WHEN m.enabled=FALSE THEN 'Disabled' ELSE COALESCE(s.state,'Unknown') END AS state,s.latency_ms,s.checked_at FROM connected_modules m LEFT JOIN service_status s ON s.code=m.code ORDER BY m.code"));
        return rows;
    }
}

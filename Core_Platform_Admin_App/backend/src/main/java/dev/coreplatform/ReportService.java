package dev.coreplatform;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

/** Integration contract: GET /reports?period=... [&faculty_id=...] -> {rows:[{metric,value}]}.
 * Module implementations must independently verify the JWT and faculty ownership. */
@Service
public class ReportService {
    private final ModuleService modules;
    private final AccessService access;
    private final AuditRepository audit;
    private final ObjectMapper json;
    private final java.util.concurrent.ThreadPoolExecutor workers=new java.util.concurrent.ThreadPoolExecutor(4,8,30,java.util.concurrent.TimeUnit.SECONDS,new java.util.concurrent.SynchronousQueue<>());
    @jakarta.annotation.PreDestroy void close() { workers.shutdownNow(); }
    public ReportService(ModuleService modules,AccessService access,AuditRepository audit,ObjectMapper json) { this.modules=modules; this.access=access; this.audit=audit; this.json=json; }
    public Map<String,Object> build(Jwt jwt,String period,String bearer,boolean csv) {
        var u=access.require(jwt,"reports.view");
        if(period.isBlank() || period.length()>100) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Report period is required (max 100 characters)");
        var rows=new ArrayList<Map<String,Object>>(); var missing=new ArrayList<Map<String,String>>();
        boolean faculty="Faculty".equals(u.get("role"));
        // Fixed fan-out of at most four services. No database transaction spans network calls.
        var pending=new ArrayList<java.util.concurrent.CompletableFuture<Map<String,Object>>>();
        for(String code:(faculty?List.of("lms"):ModuleService.CODES)) {
            try { pending.add(java.util.concurrent.CompletableFuture.supplyAsync(()->fetch(code,period,faculty,u,bearer),workers)); }
            catch(java.util.concurrent.RejectedExecutionException busy) { pending.add(java.util.concurrent.CompletableFuture.completedFuture(Map.of("module",code,"error","Report service busy; retry later"))); }
        }
        var results=pending.stream().map(java.util.concurrent.CompletableFuture::join).toList();
        for(var r:results) {
            if(r.containsKey("error")) missing.add(Map.of("module",r.get("module").toString(),"reason",r.get("error").toString()));
            else {
                @SuppressWarnings("unchecked") var values=(List<Map<String,Object>>)r.get("rows"); rows.addAll(values);
            }
        }
        if(csv) audit.append(u.get("email").toString(),"Exported report",period,true);
        return Map.of("period",period,"scope",faculty?"own_courses":"platform","columns",List.of("module","metric","value"),"rows",rows,"missing_modules",missing);
    }
    private Map<String,Object> fetch(String code,String period,boolean faculty,Map<String,Object> u,String bearer) {
            try {
                String query="period="+URLEncoder.encode(period,StandardCharsets.UTF_8)+(faculty?"&faculty_id="+u.get("id"):"");
                var reply=modules.request(code,"/reports",query,"GET",bearer,null,null);
                if(reply.status()!=200) return Map.<String,Object>of("module",code,"error","HTTP "+reply.status());
                var node=json.readTree(reply.body());
                if(!node.path("rows").isArray() || node.path("rows").size()>10000) return Map.<String,Object>of("module",code,"error","Invalid report contract");
                var entries=new ArrayList<Map<String,Object>>();
                for(var row:node.get("rows")) {
                    if(!row.path("metric").isValueNode() || !row.path("value").isValueNode()) return Map.<String,Object>of("module",code,"error","Invalid report row");
                    entries.add(Map.of("module",code,"metric",row.get("metric").asText(),"value",row.get("value").asText()));
                }
                return Map.<String,Object>of("module",code,"rows",entries);
            } catch(Exception e) { return Map.<String,Object>of("module",code,"error","Unavailable or not configured"); }
    }
}

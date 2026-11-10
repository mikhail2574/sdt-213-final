package dev.coreplatform;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.time.Instant;
import java.util.*;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
public class PlatformApi {
    private final UserService users;
    private final CoreService core;
    private final EmailLinkService links;
    private final NotificationService notifications;
    private final MessageService messages;
    private final SettingsService settings;
    private final AuditService audit;
    private final ReportService reports;
    private final ModuleService modules;
    private final RoleService roles;
    public PlatformApi(UserService users,CoreService core,EmailLinkService links,NotificationService notifications,MessageService messages,SettingsService settings,AuditService audit,ReportService reports,ModuleService modules,RoleService roles) {
        this.users=users; this.core=core; this.links=links; this.notifications=notifications; this.messages=messages;
        this.settings=settings; this.audit=audit; this.reports=reports; this.modules=modules;
        this.roles=roles;
    }
    @PostMapping("/auth/register") public ResponseEntity<?> register(@Valid @RequestBody EmailLinkService.Registration body) { return ResponseEntity.status(201).body(links.register(body)); }
    @PostMapping("/auth/forgot-password") public Map<String,String> forgot(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody EmailLinkService.Reset body) { return links.forgot(jwt,body); }
    @PostMapping("/auth/email-link") public Map<String,Object> redeem(@Valid @RequestBody EmailLinkService.Link body) { return links.redeem(body); }
    @PatchMapping("/me") public Map<String,Object> profile(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody UserService.Profile body) { return users.updateProfile(jwt,body); }
    @GetMapping("/users") public Map<String,Object> users(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(defaultValue="") String q,@RequestParam(defaultValue="") String role,@RequestParam(defaultValue="") String status,
        @RequestParam(defaultValue="") String department,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="50") int size) { return users.search(jwt,q,role,status,department,page,size); }
    @PostMapping("/users") public ResponseEntity<?> create(@AuthenticationPrincipal Jwt jwt,@RequestHeader(value="X-Module-Key",required=false) String key,@Valid @RequestBody CoreService.NewUser body) {
        if(key!=null || jwt==null) {
            if(!modules.authenticate(key).equals("sis")) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"SIS credentials required");
            return ResponseEntity.ok(users.syncStudent(body));
        }
        return ResponseEntity.status(201).body(users.create(jwt,body));
    }
    @PatchMapping("/users/{id}") public Map<String,Object> update(@AuthenticationPrincipal Jwt jwt,@PathVariable long id,@RequestBody Map<String,Object> body) { return core.update(jwt,id,body); }
    @GetMapping("/roles") public List<Map<String,Object>> roles(@AuthenticationPrincipal Jwt jwt,@RequestHeader(value="X-Module-Key",required=false) String key) {
        return roles.list(jwt,key!=null || jwt==null?modules.authenticate(key):null);
    }
    @GetMapping("/announcements") public List<Map<String,Object>> announcements(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="0") long offset,@RequestParam(defaultValue="50") int size) { return notifications.announcements(jwt,offset,size); }
    @GetMapping("/notifications") public Map<String,Object> inbox(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="0") long before,@RequestParam(defaultValue="50") int size) { return notifications.inbox(jwt,before,size); }
    @PostMapping("/notifications/read") public ResponseEntity<?> read(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody NotificationService.Read body) { notifications.read(jwt,body); return ResponseEntity.noContent().build(); }
    @PostMapping("/notifications") public ResponseEntity<?> notify(@AuthenticationPrincipal Jwt jwt,@RequestHeader(value="X-Module-Key",required=false) String key,@Valid @RequestBody NotificationService.Notice body) {
        String module=key!=null || jwt==null?modules.authenticate(key):null;
        return ResponseEntity.status(201).body(notifications.send(jwt,module,body));
    }
    @GetMapping("/conversations") public Map<String,Object> conversations(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="0") long before,@RequestParam(defaultValue="20") int size) { return messages.conversations(jwt,before,size); }
    @GetMapping("/conversations/{id}/messages") public Map<String,Object> history(@AuthenticationPrincipal Jwt jwt,@PathVariable long id,@RequestParam(defaultValue="0") long before,@RequestParam(defaultValue="50") int size) { return messages.history(jwt,id,before,size); }
    @PostMapping("/messages") public ResponseEntity<?> send(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody MessageService.Send body) { return ResponseEntity.status(201).body(messages.send(jwt,body)); }
    @GetMapping("/admin/settings") public Map<String,Object> settings(@AuthenticationPrincipal Jwt jwt) { return settings.get(jwt); }
    @PutMapping("/admin/settings") public Map<String,Object> save(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody SettingsService.Update body) { return settings.save(jwt,body); }
    @GetMapping("/admin/audit") public ResponseEntity<?> audit(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(defaultValue="") String q,@RequestParam(defaultValue="") String actor,@RequestParam(defaultValue="") String action,@RequestParam(defaultValue="") String result,
        @RequestParam(required=false) Instant from,@RequestParam(required=false) Instant to,@RequestParam(defaultValue="0") long before,
        @RequestParam(defaultValue="100") int size,@RequestParam(defaultValue="json") String format) {
        checkFormat(format); boolean csv=format.equals("csv");
        var rows=audit.search(jwt,q,actor,action,result,from,to,before,csv?10000:size,csv);
        return csv?csv("audit.csv",AuditService.csv(List.of("id","timestamp","actor","action","target","result"),rows)):ResponseEntity.ok(rows);
    }
    @GetMapping("/reports") public ResponseEntity<?> reports(@AuthenticationPrincipal Jwt jwt,@RequestHeader("Authorization") String bearer,@RequestParam String period,@RequestParam(defaultValue="json") String format) {
        checkFormat(format); boolean csv=format.equals("csv"); var report=reports.build(jwt,period,bearer,csv);
        if(!csv) return ResponseEntity.ok(report);
        @SuppressWarnings("unchecked") var rows=(List<Map<String,Object>>)report.get("rows");
        var exported=new ArrayList<>(rows);
        @SuppressWarnings("unchecked") var missing=(List<Map<String,String>>)report.get("missing_modules");
        for(var module:missing) exported.add(Map.of("module",module.get("module"),"metric","MISSING","value",module.get("reason")));
        return csv("report.csv",AuditService.csv(List.of("module","metric","value"),exported));
    }
    @RequestMapping(value="/modules/{code}/**",method={RequestMethod.GET,RequestMethod.POST,RequestMethod.PUT,RequestMethod.PATCH,RequestMethod.DELETE,RequestMethod.HEAD})
    public ResponseEntity<byte[]> proxy(@AuthenticationPrincipal Jwt jwt,@PathVariable String code,HttpServletRequest request,@RequestBody(required=false) byte[] body) {
        modules.authorize(jwt,code);
        String prefix="/api/v1/modules/"+code;
        String path=request.getRequestURI().substring(prefix.length());
        var reply=modules.request(code,path.isEmpty()?"/":path,request.getQueryString(),request.getMethod(),request.getHeader("Authorization"),request.getContentType(),body);
        // HTML from an upstream module must never execute on the platform's origin.
        return ResponseEntity.status(reply.status()).header("Content-Type",reply.contentType()).header("X-Content-Type-Options","nosniff").header("Content-Security-Policy","sandbox; default-src 'none'").body(reply.body());
    }
    private void checkFormat(String format) { if(!Set.of("json","csv").contains(format)) throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,"Format must be json or csv"); }
    private ResponseEntity<String> csv(String filename,String value) { return ResponseEntity.ok().header("Content-Type","text/csv; charset=utf-8").header("Content-Disposition","attachment; filename=\""+filename+"\"").body(value); }
}

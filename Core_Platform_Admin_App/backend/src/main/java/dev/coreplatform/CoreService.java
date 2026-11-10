package dev.coreplatform;

import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class CoreService {
    private final UserRepository users;
    private final AuditRepository audit;
    private final AccessService access;
    private final UserService accounts;
    private final MonitoringService monitoring;
    private final PlatformRepository db;
    private final SessionRepository sessions;
    private final java.time.Clock clock;
    private static final Set<String> ROLES = Set.of("Administrator", "Staff", "Student", "Faculty", "Applicant");
    private static final Set<String> STATUSES = Set.of("Active", "Pending", "Inactive");
    public CoreService(UserRepository users, AuditRepository audit,AccessService access,UserService accounts,MonitoringService monitoring,PlatformRepository db,SessionRepository sessions,java.time.Clock clock) {
        this.users = users; this.audit = audit;
        this.access=access; this.accounts=accounts; this.monitoring=monitoring; this.db=db;
        this.sessions=sessions; this.clock=clock;
    }
    private boolean admin(Map<String,Object> u) { return "Administrator".equals(u.get("role")); }
    private void audit(Object actor,String action,Object target,boolean success) {
        audit.append(actor.toString(),action,target.toString(),success);
    }
    public Map<String,String> health() { return Map.of("service","Core API","status","Operational"); }
    public Map<String,Object> me(Jwt jwt) { return accounts.me(jwt); }
    public Map<String,Object> dashboard(Jwt jwt) {
        var u=access.require(jwt,"dashboard.view");
        var stats=db.one("SELECT COUNT(*) AS total_users,COALESCE(SUM(CASE WHEN status='Active' THEN 1 ELSE 0 END),0) AS active_accounts,COALESCE(SUM(CASE WHEN role='Administrator' THEN 1 ELSE 0 END),0) AS administrators,COALESCE(SUM(CASE WHEN status='Pending' THEN 1 ELSE 0 END),0) AS pending_reviews FROM users");
        stats.put("recent_activity",admin(u)?audit.latest(5):List.of());
        stats.put("service",Map.of("name","Core API","status","Operational")); stats.put("services",monitoring.status()); return stats;
    }
    public List<Map<String,Object>> listUsers(Jwt jwt,String q,String role,String status) {
        access.require(jwt,"users.view"); if(q.length()>150) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Search must be at most 150 characters");
        return users.search(q,role,status).stream().map(UserView::of).toList();
    }
    public record NewUser(@NotBlank @Size(min=2,max=120) String name,@NotBlank @Email @Size(max=255) String email,@NotNull String role,@Size(max=100) String department,String console_access) {}
    private void checkAccess(String role,String access) {
        if(!ROLES.contains(role)) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid role");
        if(access!=null && (!"Staff".equals(role) || !Set.of("Operator","Viewer").contains(access))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Console access requires Staff role and Operator or Viewer access");
    }
    @Transactional
    public ResponseEntity<Map<String,Object>> create(Jwt jwt,NewUser body) {
        return ResponseEntity.status(CREATED).body(accounts.create(jwt,body));
    }
    @Transactional
    public Map<String,Object> update(Jwt jwt,long id,Map<String,Object> fields) {
        var u=access.require(jwt,"users.edit");
        if(!admin(u) && !"Operator".equals(u.get("console_access"))) throw new ResponseStatusException(FORBIDDEN,"Read-only access");
        db.one("SELECT id FROM platform_settings WHERE id=1 FOR UPDATE");
        var target=users.findByIdForUpdate(id); if(target==null) throw new ResponseStatusException(NOT_FOUND,"User not found");
        boolean wasAdmin="Administrator".equals(target.get("role")) && "Active".equals(target.get("status"));
        boolean access=fields.keySet().stream().anyMatch(Set.of("role","status","console_access")::contains);
        if(!admin(u) && (fields.containsKey("role") || fields.containsKey("console_access"))) throw new ResponseStatusException(FORBIDDEN,"Operators cannot change roles or console access");
        if(((Number)u.get("id")).longValue()==id && access) throw new ResponseStatusException(BAD_REQUEST,"You cannot change your own access");
        for(var e:fields.entrySet()) {
            String k=e.getKey(); Object v=e.getValue();
            if(!Set.of("name","department","status","role","console_access").contains(k)) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Unknown field: "+k);
            if(v==null && k.equals("console_access")) { target.put(k,null); continue; }
            if(!(v instanceof String)) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid "+k);
            String s=(String)v;
            if((k.equals("name") && (s.strip().length()<2 || s.length()>120)) || (k.equals("department") && s.length()>100) || (k.equals("status") && !STATUSES.contains(s))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid "+k);
            target.put(k,s);
        }
        checkAccess((String)target.get("role"),(String)target.get("console_access"));
        if(wasAdmin && (!"Administrator".equals(target.get("role")) || !"Active".equals(target.get("status"))) && db.count("SELECT COUNT(*) FROM users WHERE role='Administrator' AND status='Active'")<=1)
            throw new ResponseStatusException(BAD_REQUEST,"Cannot remove the last active administrator");
        users.update(target);
        if(access) sessions.revokeAll(id,clock.instant());
        audit(u.get("email"),"Updated user",target.get("email"),true); return UserView.of(target);
    }
}

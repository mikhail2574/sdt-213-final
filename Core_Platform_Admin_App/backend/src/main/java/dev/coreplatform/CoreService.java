package dev.coreplatform;

import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class CoreService {
    private final UserRepository users;
    private final AuditRepository audit;
    private final BCryptPasswordEncoder passwords;
    private final JwtEncoder encoder;
    private static final Set<String> ROLES = Set.of("Administrator", "Staff", "Student", "Faculty", "Applicant");
    private static final Set<String> STATUSES = Set.of("Active", "Pending", "Inactive");
    public CoreService(UserRepository users, AuditRepository audit, BCryptPasswordEncoder passwords, JwtEncoder encoder) {
        this.users = users; this.audit = audit; this.passwords = passwords; this.encoder = encoder;
    }
    private Map<String,Object> output(Map<String,Object> u) {
        var result=new LinkedHashMap<String,Object>();
        for(String k:List.of("id","name","email","role","console_access","department","status","last_login")) {
            Object v=u.get(k); result.put(k,v instanceof Timestamp t?t.toInstant().toString():v);
        }
        return result;
    }
    private boolean admin(Map<String,Object> u) { return "Administrator".equals(u.get("role")); }
    private Map<String,Object> actor(Jwt jwt, boolean console) {
        Map<String,Object> u=null;
        try { if(jwt!=null) u=users.findById(Long.parseLong(jwt.getSubject())); } catch(NumberFormatException ignored) {}
        if(u==null || !"Active".equals(u.get("status"))) throw new ResponseStatusException(UNAUTHORIZED,"Account is not active");
        if(console && !admin(u) && !("Staff".equals(u.get("role")) && ("Operator".equals(u.get("console_access")) || "Viewer".equals(u.get("console_access")))))
            throw new ResponseStatusException(FORBIDDEN,"Admin Console access denied");
        return u;
    }
    private void audit(Object actor,String action,Object target,boolean success) {
        audit.append(actor.toString(),action,target.toString(),success);
    }
    public record Login(@NotBlank @Email String email,@NotNull String password) {}
    public Map<String,String> health() { return Map.of("service","Core API","status","Operational"); }
    // Failed sign-ins must commit their counters and audit entries, even when returning an error.
    @Transactional(noRollbackFor=ResponseStatusException.class)
    public Map<String,Object> login(Login body) {
        String email=body.email().strip().toLowerCase(Locale.ROOT);
        var u=users.findByEmailForUpdate(email); var now=Instant.now();
        if(u!=null && u.get("locked_until") instanceof Timestamp lock) {
            if(lock.toInstant().isAfter(now)) { audit(email,"Locked sign-in attempt",email,false); throw new ResponseStatusException(LOCKED,"Account is locked for up to 15 minutes"); }
            users.resetFailures(((Number)u.get("id")).longValue()); u.put("failed_attempts",0);
        }
        if(u==null || body.password().getBytes(StandardCharsets.UTF_8).length>72 || !passwords.matches(body.password(),(String)u.get("password_hash"))) {
            if(u!=null) {
                int failures=((Number)u.get("failed_attempts")).intValue()+1;
                users.recordFailure(((Number)u.get("id")).longValue(), failures, failures>=5?now.plusSeconds(900):null);
            }
            audit(email,"Failed sign-in",email,false); throw new ResponseStatusException(UNAUTHORIZED,"Invalid email or password");
        }
        if(!"Active".equals(u.get("status"))) { audit(email,"Inactive sign-in",email,false); throw new ResponseStatusException(FORBIDDEN,"Account is not active"); }
        users.recordLogin(((Number)u.get("id")).longValue(),now);
        audit(email,"Signed in",email,true); u.put("last_login",Timestamp.from(now));
        var claims=JwtClaimsSet.builder().subject(u.get("id").toString()).issuedAt(now).expiresAt(now.plusSeconds(1800)).build();
        String token=encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
        return Map.of("access_token",token,"token_type","bearer","user",output(u));
    }
    public Map<String,Object> me(Jwt jwt) { return output(actor(jwt,false)); }
    public Map<String,Object> dashboard(Jwt jwt) {
        var u=actor(jwt,true);
        return Map.of("total_users",users.countAll(),"active_accounts",users.countByStatus("Active"),"administrators",users.countByRole("Administrator"),"pending_reviews",users.countByStatus("Pending"),"recent_activity",admin(u)?audit.latest(5):List.of(),"service",Map.of("name","Core API","status","Operational"));
    }
    public List<Map<String,Object>> listUsers(Jwt jwt,String q,String role,String status) {
        actor(jwt,true); if(q.length()>150) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Search must be at most 150 characters");
        return users.search(q,role,status).stream().map(this::output).toList();
    }
    public record NewUser(@NotBlank @Size(min=2,max=120) String name,@NotBlank @Email @Size(max=255) String email,@NotNull String role,@Size(max=100) String department,String console_access) {}
    private void checkAccess(String role,String access) {
        if(!ROLES.contains(role)) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid role");
        if(access!=null && (!"Staff".equals(role) || !Set.of("Operator","Viewer").contains(access))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Console access requires Staff role and Operator or Viewer access");
    }
    @Transactional
    public ResponseEntity<Map<String,Object>> create(Jwt jwt,NewUser body) {
        var u=actor(jwt,true); if(!admin(u)) throw new ResponseStatusException(FORBIDDEN,"Only administrators can create users");
        checkAccess(body.role(),body.console_access());
        String email=body.email().toLowerCase(Locale.ROOT);
        users.create(body.name().strip(),email,body.role(),body.console_access(),body.department()==null?"":body.department().strip(),passwords.encode(UUID.randomUUID().toString()),"Pending");
        audit(u.get("email"),"Created pending user",email,true);
        return ResponseEntity.status(CREATED).body(output(users.findByEmail(email)));
    }
    @Transactional
    public Map<String,Object> update(Jwt jwt,long id,Map<String,Object> fields) {
        var u=actor(jwt,true);
        if(!admin(u) && !"Operator".equals(u.get("console_access"))) throw new ResponseStatusException(FORBIDDEN,"Read-only access");
        var target=users.findByIdForUpdate(id); if(target==null) throw new ResponseStatusException(NOT_FOUND,"User not found");
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
        users.update(target);
        audit(u.get("email"),"Updated user",target.get("email"),true); return output(target);
    }
    public List<Map<String,Object>> activity(Jwt jwt) {
        if(!admin(actor(jwt,true))) throw new ResponseStatusException(FORBIDDEN,"Audit log is restricted to administrators"); return audit.latest(100);
    }
}

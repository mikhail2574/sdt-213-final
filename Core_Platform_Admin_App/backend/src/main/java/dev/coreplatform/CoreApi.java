package dev.coreplatform;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.Instant;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/v1")
public class CoreApi implements CommandLineRunner {
    private final JdbcTemplate db;
    private final BCryptPasswordEncoder passwords;
    private final JwtEncoder encoder;
    private final boolean seed;
    private static final Set<String> ROLES = Set.of("Administrator", "Staff", "Student", "Faculty", "Applicant");
    private static final Set<String> STATUSES = Set.of("Active", "Pending", "Inactive");
    public CoreApi(JdbcTemplate db, BCryptPasswordEncoder passwords, JwtEncoder encoder, @Value("${app.seed-demo}") String seed) {
        this.db=db; this.passwords=passwords; this.encoder=encoder; this.seed=seed.equals("1");
    }
    @Override public void run(String... args) {
        if (!seed || db.queryForObject("SELECT COUNT(*) FROM users", Long.class)>0) return;
        String[][] rows={
            {"Mykhailo Naumenko","admin","Administrator",null,"IT Services","admin123"},
            {"Emma Johnson","student","Student",null,"Software Engineering","student123"},
            {"Dr. Daniel Reed","faculty","Faculty",null,"Computer Science","faculty123"},
            {"Yaroslav Kalinichenko","staff","Staff","Operator","IT Help Desk","staff123"},
            {"Olivia Martin","viewer","Staff","Viewer","Dean's Office","viewer123"},
            {"Alex Morgan","applicant","Applicant",null,"Admissions","applicant123"}};
        for(var r:rows) db.update("INSERT INTO users(name,email,role,console_access,department,password_hash,status) VALUES(?,?,?,?,?,?,'Active')",r[0],r[1]+"@coreplatform.dev",r[2],r[3],r[4],passwords.encode(r[5]));
    }
    private Map<String,Object> find(String clause, Object value) {
        var rows=db.queryForList("SELECT * FROM users WHERE "+clause,value);
        if(rows.isEmpty()) return null;
        var normalized=new LinkedHashMap<String,Object>();
        rows.get(0).forEach((k,v)->normalized.put(k.toLowerCase(Locale.ROOT),v));
        return normalized;
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
        try { if(jwt!=null) u=find("id=?",Long.parseLong(jwt.getSubject())); } catch(NumberFormatException ignored) {}
        if(u==null || !"Active".equals(u.get("status"))) throw new ResponseStatusException(UNAUTHORIZED,"Account is not active");
        if(console && !admin(u) && !("Staff".equals(u.get("role")) && ("Operator".equals(u.get("console_access")) || "Viewer".equals(u.get("console_access")))))
            throw new ResponseStatusException(FORBIDDEN,"Admin Console access denied");
        return u;
    }
    private void audit(Object actor,String action,Object target,boolean success) {
        db.update("INSERT INTO audit_entries(actor,action,target,success) VALUES(?,?,?,?)",actor,action,target,success);
    }
    public record Login(@NotBlank @Email String email,@NotNull String password) {}
    @GetMapping("/health") public Map<String,String> health() { return Map.of("service","Core API","status","Operational"); }
    // Failed sign-ins must commit their counters and audit entries, even when returning an error.
    @Transactional(noRollbackFor=ResponseStatusException.class)
    @PostMapping("/auth/login") public Map<String,Object> login(@Valid @RequestBody Login body) {
        String email=body.email().strip().toLowerCase(Locale.ROOT);
        var u=find("email=? FOR UPDATE",email); var now=Instant.now();
        if(u!=null && u.get("locked_until") instanceof Timestamp lock) {
            if(lock.toInstant().isAfter(now)) { audit(email,"Locked sign-in attempt",email,false); throw new ResponseStatusException(LOCKED,"Account is locked for up to 15 minutes"); }
            db.update("UPDATE users SET failed_attempts=0,locked_until=NULL WHERE id=?",u.get("id")); u.put("failed_attempts",0);
        }
        if(u==null || body.password().getBytes(StandardCharsets.UTF_8).length>72 || !passwords.matches(body.password(),(String)u.get("password_hash"))) {
            if(u!=null) {
                int failures=((Number)u.get("failed_attempts")).intValue()+1;
                db.update("UPDATE users SET failed_attempts=?,locked_until=? WHERE id=?",failures,failures>=5?Timestamp.from(now.plusSeconds(900)):null,u.get("id"));
            }
            audit(email,"Failed sign-in",email,false); throw new ResponseStatusException(UNAUTHORIZED,"Invalid email or password");
        }
        if(!"Active".equals(u.get("status"))) { audit(email,"Inactive sign-in",email,false); throw new ResponseStatusException(FORBIDDEN,"Account is not active"); }
        db.update("UPDATE users SET failed_attempts=0,locked_until=NULL,last_login=? WHERE id=?",Timestamp.from(now),u.get("id"));
        audit(email,"Signed in",email,true); u.put("last_login",Timestamp.from(now));
        var claims=JwtClaimsSet.builder().subject(u.get("id").toString()).issuedAt(now).expiresAt(now.plusSeconds(1800)).build();
        String token=encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
        return Map.of("access_token",token,"token_type","bearer","user",output(u));
    }
    @GetMapping("/me") public Map<String,Object> me(@AuthenticationPrincipal Jwt jwt) { return output(actor(jwt,false)); }
    private long count(String where) { return db.queryForObject("SELECT COUNT(*) FROM users "+where,Long.class); }
    private List<Map<String,Object>> audits(int limit) {
        return db.query("SELECT * FROM audit_entries ORDER BY id DESC LIMIT ?",(rs,n)->Map.<String,Object>of("id",rs.getLong("id"),"actor",rs.getString("actor"),"action",rs.getString("action"),"target",rs.getString("target"),"result",rs.getBoolean("success")?"Success":"Failed","timestamp",rs.getTimestamp("timestamp").toInstant().toString()),limit);
    }
    @GetMapping("/admin/dashboard") public Map<String,Object> dashboard(@AuthenticationPrincipal Jwt jwt) {
        var u=actor(jwt,true);
        return Map.of("total_users",count(""),"active_accounts",count("WHERE status='Active'"),"administrators",count("WHERE role='Administrator'"),"pending_reviews",count("WHERE status='Pending'"),"recent_activity",admin(u)?audits(5):List.of(),"service",Map.of("name","Core API","status","Operational"));
    }
    @GetMapping("/admin/users") public List<Map<String,Object>> users(@AuthenticationPrincipal Jwt jwt,@RequestParam(defaultValue="") String q,@RequestParam(defaultValue="") String role,@RequestParam(defaultValue="") String status) {
        actor(jwt,true); if(q.length()>150) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Search must be at most 150 characters");
        return db.query("SELECT id FROM users WHERE (LOWER(name) LIKE LOWER(?) OR LOWER(email) LIKE LOWER(?)) AND (?='' OR role=?) AND (?='' OR status=?) ORDER BY name LIMIT 250",(rs,n)->output(find("id=?",rs.getLong(1))),"%"+q+"%","%"+q+"%",role,role,status,status);
    }
    public record NewUser(@NotBlank @Size(min=2,max=120) String name,@NotBlank @Email @Size(max=255) String email,@NotNull String role,@Size(max=100) String department,String console_access) {}
    private void checkAccess(String role,String access) {
        if(!ROLES.contains(role)) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid role");
        if(access!=null && (!"Staff".equals(role) || !Set.of("Operator","Viewer").contains(access))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Console access requires Staff role and Operator or Viewer access");
    }
    @Transactional
    @PostMapping("/admin/users") public ResponseEntity<Map<String,Object>> create(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody NewUser body) {
        var u=actor(jwt,true); if(!admin(u)) throw new ResponseStatusException(FORBIDDEN,"Only administrators can create users");
        checkAccess(body.role(),body.console_access());
        String email=body.email().toLowerCase(Locale.ROOT);
        db.update("INSERT INTO users(name,email,role,console_access,department,password_hash,status) VALUES(?,?,?,?,?,?,'Pending')",body.name().strip(),email,body.role(),body.console_access(),body.department()==null?"":body.department().strip(),passwords.encode(UUID.randomUUID().toString()));
        audit(u.get("email"),"Created pending user",email,true);
        return ResponseEntity.status(CREATED).body(output(find("email=?",email)));
    }
    @Transactional
    @PatchMapping("/admin/users/{id}") public Map<String,Object> update(@AuthenticationPrincipal Jwt jwt,@PathVariable long id,@RequestBody Map<String,Object> fields) {
        var u=actor(jwt,true);
        if(!admin(u) && !"Operator".equals(u.get("console_access"))) throw new ResponseStatusException(FORBIDDEN,"Read-only access");
        var target=find("id=? FOR UPDATE",id); if(target==null) throw new ResponseStatusException(NOT_FOUND,"User not found");
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
        db.update("UPDATE users SET name=?,department=?,status=?,role=?,console_access=? WHERE id=?",target.get("name"),target.get("department"),target.get("status"),target.get("role"),target.get("console_access"),id);
        audit(u.get("email"),"Updated user",target.get("email"),true); return output(target);
    }
    @GetMapping("/admin/audit") public List<Map<String,Object>> activity(@AuthenticationPrincipal Jwt jwt) {
        if(!admin(actor(jwt,true))) throw new ResponseStatusException(FORBIDDEN,"Audit log is restricted to administrators"); return audits(100);
    }
}

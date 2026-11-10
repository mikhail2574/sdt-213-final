package dev.coreplatform;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class SettingsService {
    private final PlatformRepository db;
    private final AccessService access;
    private final AuditRepository audit;
    public SettingsService(PlatformRepository db,AccessService access,AuditRepository audit) { this.db=db; this.access=access; this.audit=audit; }
    public record Values(@NotBlank @Size(max=120) String university_name,LocalDate term_start,LocalDate term_end,
        @Min(8) @Max(72) int min_password_length,@Min(1) @Max(120) int session_timeout,@Min(3) @Max(10) int lockout_attempts,
        @NotBlank @Email @Size(max=255) String email_sender) {}
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"name"})
    public record Module(@NotBlank String code,@NotNull Boolean enabled) {}
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"user_count"})
    public record Role(@NotBlank String code,@NotNull @Size(max=30) Set<@NotBlank @Size(max=60) String> permissions) {}
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"permission_codes"})
    public record Update(@NotNull @Valid Values settings,@NotNull @Size(min=4,max=4) List<@NotNull @Valid Module> modules,
        @NotNull @Size(min=7,max=7) List<@NotNull @Valid Role> roles) {}
    public Map<String,Object> get(Jwt jwt) { access.administrator(jwt); return snapshot(); }
    public Map<String,Object> snapshot() {
        var roles=new ArrayList<Map<String,Object>>();
        var permissions=db.rows("SELECT role_code,permission FROM role_permissions ORDER BY permission");
        var counts=db.rows("SELECT CASE WHEN role='Staff' AND console_access IS NOT NULL THEN console_access ELSE role END AS code,COUNT(*) AS total FROM users GROUP BY code");
        for(String role:List.of("Administrator","Operator","Viewer","Student","Faculty","Staff","Applicant")) {
            long count=counts.stream().filter(r->role.equals(r.get("code"))).mapToLong(r->((Number)r.get("total")).longValue()).sum();
            roles.add(Map.of("code",role,"user_count",count,"permissions",permissions.stream().filter(r->role.equals(r.get("role_code"))).map(r->r.get("permission")).toList()));
        }
        return Map.of("settings",db.one("SELECT university_name,term_start,term_end,min_password_length,session_timeout,lockout_attempts,email_sender FROM platform_settings WHERE id=1"),"modules",db.rows("SELECT code,name,enabled FROM connected_modules ORDER BY code"),"roles",roles,"permission_codes",AccessService.CODES);
    }
    @Transactional
    public Map<String,Object> save(Jwt jwt,Update body) {
        var u=access.administrator(jwt); access.require(jwt,"settings.manage");
        var settings=body.settings();
        if((settings.term_start()==null)!=(settings.term_end()==null) || (settings.term_start()!=null && settings.term_end().isBefore(settings.term_start()))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid academic term dates");
        Set<String> moduleCodes=new HashSet<>(),roleCodes=new HashSet<>();
        for(var m:body.modules()) moduleCodes.add(m.code());
        for(var r:body.roles()) {
            roleCodes.add(r.code());
            if(!AccessService.CODES.containsAll(r.permissions())) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Unknown permission");
            if(!r.code().equals("Administrator") && !Collections.disjoint(r.permissions(),Set.of("roles.manage","settings.manage","audit.view"))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Administrative permissions require Administrator role");
            if(r.code().equals("Administrator") && !r.permissions().containsAll(Set.of("roles.manage","settings.manage","users.view","users.edit"))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Cannot remove administrator recovery permissions");
            if(!Set.of("Administrator","Operator","Viewer").contains(r.code()) && !Collections.disjoint(r.permissions(),Set.of("users.view","users.edit","users.create","dashboard.view"))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Console permissions require console access");
            if(r.code().equals("Viewer") && !Collections.disjoint(r.permissions(),Set.of("users.edit","users.create","announcements.send"))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Viewer access is read-only");
        }
        if(!moduleCodes.equals(Set.of("lms","sis","scheduling","admissions")) || !roleCodes.equals(Set.of("Administrator","Operator","Viewer","Student","Faculty","Staff","Applicant"))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Supply each module and role exactly once");
        db.one("SELECT id FROM platform_settings WHERE id=1 FOR UPDATE");
        db.write("UPDATE platform_settings SET university_name=?,term_start=?,term_end=?,min_password_length=?,session_timeout=?,lockout_attempts=?,email_sender=? WHERE id=1",settings.university_name(),settings.term_start(),settings.term_end(),settings.min_password_length(),settings.session_timeout(),settings.lockout_attempts(),settings.email_sender());
        for(var m:body.modules()) db.write("UPDATE connected_modules SET enabled=? WHERE code=?",m.enabled(),m.code());
        db.write("DELETE FROM role_permissions");
        var rows=new ArrayList<Object[]>();
        for(var r:body.roles()) for(String p:r.permissions()) rows.add(new Object[]{r.code(),p});
        db.batch("INSERT INTO role_permissions(role_code,permission) VALUES(?,?)",rows);
        audit.append(u.get("email").toString(),"Updated settings and permissions","Platform",true); return snapshot();
    }
}

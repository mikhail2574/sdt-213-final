package dev.coreplatform;

import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class AccessService {
    private final UserRepository users;
    private final PlatformRepository db;
    public static final Set<String> CODES=Set.of("users.view","users.create","users.edit","roles.manage","dashboard.view","audit.view","reports.view","settings.manage","announcements.send","directory.view","messages.send","modules.lms","modules.sis","modules.scheduling","modules.admissions");
    public AccessService(UserRepository users,PlatformRepository db) { this.users=users; this.db=db; }
    public Map<String,Object> actor(Jwt jwt) {
        Map<String,Object> u=null;
        try { if(jwt!=null) u=users.findById(Long.parseLong(jwt.getSubject())); } catch(NumberFormatException ignored) {}
        if(u==null || !"Active".equals(u.get("status"))) throw new ResponseStatusException(UNAUTHORIZED,"Account is not active");
        return u;
    }
    public String role(Map<String,Object> u) {
        return "Staff".equals(u.get("role")) && u.get("console_access")!=null?(String)u.get("console_access"):(String)u.get("role");
    }
    public List<String> permissions(Map<String,Object> u) {
        return db.rows("SELECT permission FROM role_permissions WHERE role_code=? ORDER BY permission",role(u)).stream().map(r->(String)r.get("permission")).toList();
    }
    public boolean has(Map<String,Object> u,String permission) { return permissions(u).contains(permission); }
    public Map<String,Object> require(Jwt jwt,String permission) {
        var u=actor(jwt); if(!has(u,permission)) throw new ResponseStatusException(FORBIDDEN,"Permission required: "+permission); return u;
    }
    public Map<String,Object> administrator(Jwt jwt) {
        var u=actor(jwt); if(!"Administrator".equals(u.get("role"))) throw new ResponseStatusException(FORBIDDEN,"Administrator access required"); return u;
    }
    public boolean contactAllowed(Map<String,Object> sender,Map<String,Object> target) {
        if(!"Active".equals(target.get("status"))) return false;
        return switch((String)sender.get("role")) {
            case "Student" -> Set.of("Faculty","Staff").contains(target.get("role"));
            case "Applicant" -> "Staff".equals(target.get("role")) && "Admissions".equals(target.get("department"));
            default -> true;
        };
    }
}

package dev.coreplatform;

import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

/** Shared, read-only role contract; assignments use account management and edits use settings. */
@Service
public class RoleService {
    private final AccessService access;
    private final PlatformRepository db;
    public RoleService(AccessService access,PlatformRepository db) { this.access=access; this.db=db; }
    public List<Map<String,Object>> list(Jwt jwt,String module) {
        if(module==null) access.require(jwt,"users.view");
        var permissions=db.rows("SELECT role_code,permission FROM role_permissions ORDER BY role_code,permission");
        return List.of("Administrator","Operator","Viewer","Student","Faculty","Staff","Applicant").stream()
            .map(code->Map.<String,Object>of("code",code,"permissions",permissions.stream().filter(p->code.equals(p.get("role_code"))).map(p->p.get("permission")).toList())).toList();
    }
}

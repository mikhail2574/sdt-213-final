package dev.coreplatform;

import jakarta.validation.Valid;
import java.util.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/v1")
public class IntegrationApi {
    private final GroupService groups;
    private final ModuleService modules;
    private final AccessService access;
    private final JwtDecoder decoder;
    private final PlatformRepository db;
    private final AuditRepository audit;
    private final SsoService sso;
    public IntegrationApi(GroupService groups,ModuleService modules,AccessService access,JwtDecoder decoder,PlatformRepository db,AuditRepository audit,SsoService sso) { this.groups=groups; this.modules=modules; this.access=access; this.decoder=decoder; this.db=db; this.audit=audit; this.sso=sso; }
    @GetMapping("/groups") public List<Map<String,Object>> groups(@AuthenticationPrincipal Jwt jwt) { return groups.list(jwt); }
    @PutMapping("/integrations/groups/{code}") public Map<String,Object> sync(@AuthenticationPrincipal Jwt jwt,@RequestHeader(value="X-Module-Key",required=false) String key,@PathVariable String code,@Valid @RequestBody GroupService.Group body) {
        return groups.sync(jwt,key==null && jwt!=null?null:modules.authenticate(key),code,body);
    }
    public record Introspection(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=8192) String token) {
        @Override public String toString() { return "Introspection[REDACTED]"; }
    }
    @PostMapping("/auth/introspect") public Map<String,Object> introspect(@RequestHeader("X-Module-Key") String key,@Valid @RequestBody Introspection body) {
        String module=modules.authenticate(key);
        Jwt token;
        try { token=decoder.decode(body.token()); } catch(JwtException e) { return Map.of("active",false); }
        Map<String,Object> user;
        try { user=access.moduleActor(token,module); } catch(ResponseStatusException e) { return Map.of("active",false); }
        var permissions=access.permissions(user);
        if(!permissions.contains("modules."+module)) return Map.of("active",false);
        return Map.of("active",true,"sub",token.getSubject(),"exp",token.getExpiresAt().getEpochSecond(),"role",user.get("role"),"permissions",permissions,"module",module);
    }
    public record Launch(@jakarta.validation.constraints.NotBlank String code) {}
    public record Exchange(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(max=128) String ticket) { @Override public String toString() { return "Exchange[REDACTED]"; } }
    @PostMapping("/auth/module-ticket") public Map<String,Object> launch(@AuthenticationPrincipal Jwt jwt,@Valid @RequestBody Launch body) { return sso.issue(jwt,body.code()); }
    @PostMapping("/auth/module-exchange") public Map<String,Object> exchange(@RequestHeader("X-Module-Key") String key,@Valid @RequestBody Exchange body) { return sso.exchange(key,body.ticket()); }
    @GetMapping("/admin/gateway-policies") public List<Map<String,Object>> policies(@AuthenticationPrincipal Jwt jwt) { access.administrator(jwt); return db.rows("SELECT * FROM gateway_policies ORDER BY module_code,path_prefix,http_method"); }
    public record Policy(@jakarta.validation.constraints.NotBlank String module_code,
        @jakarta.validation.constraints.Pattern(regexp="/[A-Za-z0-9_./-]*") @jakarta.validation.constraints.Size(max=200) String path_prefix,
        @jakarta.validation.constraints.Pattern(regexp="GET|POST|PUT|PATCH|DELETE|HEAD") String http_method,@jakarta.validation.constraints.NotBlank String permission) {}
    @PutMapping("/admin/gateway-policies")
    @org.springframework.transaction.annotation.Transactional
    public List<Map<String,Object>> policies(@AuthenticationPrincipal Jwt jwt,@RequestBody @Valid List<@Valid Policy> body) {
        var actor=access.administrator(jwt); access.require(jwt,"settings.manage");
        if(body.isEmpty() || body.size()>500) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Supply 1 to 500 policies");
        Set<String> keys=new HashSet<>();
        for(var p:body) if(p==null || p.module_code()==null || p.permission()==null || p.path_prefix()==null || p.path_prefix().length()>200 || !p.path_prefix().matches("/[A-Za-z0-9_./-]*") || p.http_method()==null || !Set.of("GET","POST","PUT","PATCH","DELETE","HEAD").contains(p.http_method()) || !ModuleService.CODES.contains(p.module_code()) || !AccessService.CODES.contains(p.permission()) || p.path_prefix().contains("..") || !keys.add(p.module_code()+":"+p.http_method()+":"+p.path_prefix())) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid or duplicate gateway policy");
        db.one("SELECT id FROM platform_settings WHERE id=1 FOR UPDATE");
        db.write("DELETE FROM gateway_policies");
        db.batch("INSERT INTO gateway_policies(module_code,path_prefix,http_method,permission) VALUES(?,?,?,?)",body.stream().map(p->new Object[]{p.module_code(),p.path_prefix(),p.http_method(),p.permission()}).toList());
        audit.append(actor.get("email").toString(),"Updated gateway policies","Gateway",true);
        return policies(jwt);
    }
}

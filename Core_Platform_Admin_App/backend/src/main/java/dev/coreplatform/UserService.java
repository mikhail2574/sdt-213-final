package dev.coreplatform;

import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class UserService {
    private final PlatformRepository db;
    private final AccessService access;
    private final UserRepository users;
    private final AuthService auth;
    private final EmailLinkService links;
    private final AuditRepository audit;
    private final BCryptPasswordEncoder passwords;
    public UserService(PlatformRepository db,AccessService access,UserRepository users,AuthService auth,EmailLinkService links,AuditRepository audit,BCryptPasswordEncoder passwords) {
        this.db=db; this.access=access; this.users=users; this.auth=auth; this.links=links; this.audit=audit; this.passwords=passwords;
    }
    public Map<String,Object> me(Jwt jwt) {
        var u=access.actor(jwt); var view=UserView.of(u);
        for(String key:List.of("preferred_name","phone","personal_email","photo_url")) view.put(key,u.get(key));
        var permissions=access.permissions(u); view.put("permissions",permissions);
        view.put("email_preferences",db.rows("SELECT category,email_enabled FROM notification_preferences WHERE user_id=? ORDER BY category",PlatformRepository.id(u)));
        view.put("modules",db.rows("SELECT code,name FROM connected_modules WHERE enabled=TRUE ORDER BY code").stream().filter(m->permissions.contains("modules."+m.get("code"))).toList());
        return view;
    }
    public record Profile(@Size(max=120) String preferred_name,@Size(max=40) String phone,@Email @Size(max=255) String personal_email,
        @Size(max=1024) String photo_url,Map<String,Boolean> email_preferences,@Size(max=1024) String current_password,
        @Size(max=72) String new_password,@Size(max=72) String confirm_password) {
        @Override public String toString() { return "Profile[REDACTED]"; }
    }
    @Transactional
    public Map<String,Object> updateProfile(Jwt jwt,Profile body) {
        var u=access.actor(jwt); long id=PlatformRepository.id(u);
        users.findByIdForUpdate(id);
        if(body.photo_url()!=null && !body.photo_url().isEmpty() && !body.photo_url().equals("/api/v1/me/photo") && !body.photo_url().matches("https://[^\\s]+")) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Photo URL must use HTTPS");
        db.write("UPDATE users SET preferred_name=COALESCE(?,preferred_name),phone=COALESCE(?,phone),personal_email=COALESCE(?,personal_email),photo_url=COALESCE(?,photo_url) WHERE id=?",body.preferred_name(),body.phone(),body.personal_email(),body.photo_url(),id);
        if(body.email_preferences()!=null) {
            if(body.email_preferences().size()>40) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Too many notification categories");
            for(var e:body.email_preferences().entrySet()) {
                if(!e.getKey().matches("[A-Za-z0-9_.-]{1,40}") || e.getValue()==null) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid notification preference");
                db.write("DELETE FROM notification_preferences WHERE user_id=? AND category=?",id,e.getKey());
                db.write("INSERT INTO notification_preferences VALUES(?,?,?)",id,e.getKey(),e.getValue());
            }
        }
        if(body.new_password()!=null || body.current_password()!=null || body.confirm_password()!=null) {
            if(body.current_password()==null || body.new_password()==null) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Current and new passwords are required");
            auth.changePassword(jwt,new AuthService.PasswordChange(body.current_password(),body.new_password(),body.confirm_password()==null?body.new_password():body.confirm_password()));
        }
        return me(jwt);
    }
    public Map<String,Object> search(Jwt jwt,String q,String role,String status,String department,int page,int size) {
        var u=access.actor(jwt); boolean console=access.has(u,"users.view");
        if(!console) access.require(jwt,"directory.view");
        if(q.length()>150 || department.length()>100 || page<0 || page>100000 || size<1 || size>100) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid search or pagination");
        if(!role.isEmpty() && !Set.of("Administrator","Student","Staff","Faculty","Applicant").contains(role)) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid role");
        if(!status.isEmpty() && !Set.of("Active","Inactive","Pending").contains(status)) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid status");
        String scope=console?"":" AND status='Active'"+("Student".equals(u.get("role"))?" AND role IN ('Faculty','Staff')":"");
        String where=" FROM users WHERE (LOWER(name) LIKE LOWER(?) ESCAPE '!' OR LOWER(email) LIKE LOWER(?) ESCAPE '!' OR LOWER(department) LIKE LOWER(?) ESCAPE '!') AND (?='' OR role=?) AND (?='' OR status=?) AND (?='' OR department=?)"+scope;
        String pattern="%"+q.replace("!","!!").replace("%","!%").replace("_","!_")+"%";
        Object[] filters={pattern,pattern,pattern,role,role,status,status,department,department};
        String fields=console?"id,name,email,role,console_access,department,status,last_login":"id,name,email,role,department";
        var args=new ArrayList<>(Arrays.asList(filters)); args.add(size); args.add((long)page*size);
        var items=db.rows("SELECT "+fields+where+" ORDER BY name,id LIMIT ? OFFSET ?",args.toArray());
        return Map.of("items",items,"total",db.count("SELECT COUNT(*)"+where,filters),"page",page,"size",size);
    }
    @Transactional
    public Map<String,Object> create(Jwt jwt,CoreService.NewUser body) {
        var actor=access.require(jwt,"users.create");
        if(body.name().strip().length()<2) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Name must contain at least 2 non-padding characters");
        if(!Set.of("Administrator","Staff","Faculty","Student","Applicant").contains(body.role())) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid role");
        boolean admin="Administrator".equals(actor.get("role"));
        if(!admin && ("Administrator".equals(body.role()) || body.console_access()!=null)) throw new ResponseStatusException(FORBIDDEN,"Only administrators may assign console access or administrator roles");
        if(body.console_access()!=null && (!"Staff".equals(body.role()) || !Set.of("Operator","Viewer").contains(body.console_access()))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid console access");
        String address=body.email().strip().toLowerCase(Locale.ROOT);
        users.create(body.name().strip(),address,body.role(),body.console_access(),body.department()==null?"":body.department(),passwords.encode(UUID.randomUUID().toString()),"Pending");
        var u=users.findByEmail(address); links.issue(u,"invite");
        audit.append(actor.get("email").toString(),"Created pending user",address,true); return UserView.of(u);
    }
    @Transactional
    public Map<String,Object> syncStudent(CoreService.NewUser body) {
        if(body.name().strip().length()<2) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Name must contain at least 2 non-padding characters");
        if(!"Student".equals(body.role()) || body.console_access()!=null) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"SIS may synchronize Student accounts only");
        String address=body.email().strip().toLowerCase(Locale.ROOT);
        var u=users.findByEmailForUpdate(address);
        if(u==null) {
            users.create(body.name().strip(),address,"Student",null,body.department()==null?"":body.department(),passwords.encode(UUID.randomUUID().toString()),"Pending");
            u=users.findByEmail(address); links.issue(u,"invite");
        } else {
            if(!Set.of("Student","Applicant").contains(u.get("role"))) throw new ResponseStatusException(CONFLICT,"Email belongs to a different account type");
            u.put("role","Student"); u.put("name",body.name().strip());
            if(body.department()!=null) u.put("department",body.department());
            users.update(u);
            // An unconfirmed applicant still needs confirmation; keep its original confirmation token.
        }
        db.write("INSERT INTO notifications(user_id,source,category,title,text) VALUES(?,'sis','accounts','Student account synchronized','Your student record has been synchronized')",PlatformRepository.id(u));
        audit.append("Module:sis","Synchronized student",address,true); return UserView.of(u);
    }
}

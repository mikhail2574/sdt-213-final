package dev.coreplatform;

import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class GroupService {
    private final PlatformRepository db;
    private final AccessService access;
    private final UserRepository users;
    private final AuditRepository audit;
    public GroupService(PlatformRepository db,AccessService access,UserRepository users,AuditRepository audit) { this.db=db; this.access=access; this.users=users; this.audit=audit; }
    public record Group(@NotBlank @Size(max=120) String title,@NotNull @Pattern(regexp="COURSE|OFFICE") String group_type,
        @NotNull @Positive Long owner_id,@NotNull @Size(max=10000) Set<@NotNull @Positive Long> member_ids) {}
    public Map<String,Object> find(String code) {
        var group=db.one("SELECT * FROM contact_groups WHERE code=?",code);
        if(group==null) throw new ResponseStatusException(NOT_FOUND,"Group not found"); return group;
    }
    public boolean member(String code,long user) {
        return db.count("SELECT COUNT(*) FROM contact_groups g WHERE g.code=? AND (g.owner_id=? OR EXISTS (SELECT 1 FROM group_members m WHERE m.group_code=g.code AND m.user_id=?))",code,user,user)>0;
    }
    public List<Map<String,Object>> list(Jwt jwt) {
        long id=PlatformRepository.id(access.actor(jwt));
        return db.rows("SELECT g.code,g.title,g.group_type,g.owner_id,(SELECT COUNT(*) FROM group_members m WHERE m.group_code=g.code) AS member_count FROM contact_groups g WHERE g.group_type='OFFICE' OR g.owner_id=? OR EXISTS (SELECT 1 FROM group_members m WHERE m.group_code=g.code AND m.user_id=?) ORDER BY g.title LIMIT 500",id,id);
    }
    @Transactional
    public Map<String,Object> sync(Jwt jwt,String module,String code,Group body) {
        if(!code.matches("[A-Za-z0-9_.-]{1,64}")) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid group code");
        String actor;
        if(module==null) actor=access.administrator(jwt).get("email").toString();
        else {
            if(!Set.of("sis","lms").contains(module) || !body.group_type().equals("COURSE")) throw new ResponseStatusException(FORBIDDEN,"Only SIS/LMS can synchronize course groups");
            actor="Module:"+module;
        }
        var owner=users.findById(body.owner_id());
        if(owner==null || !"Active".equals(owner.get("status")) || !(body.group_type().equals("COURSE")?Set.of("Faculty","Staff"):Set.of("Staff","Administrator")).contains(owner.get("role"))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid group owner");
        // Serialize replacement of a group, including simultaneous first synchronization.
        db.one("SELECT id FROM platform_settings WHERE id=1 FOR UPDATE");
        var current=db.one("SELECT * FROM contact_groups WHERE code=? FOR UPDATE",code);
        if(current!=null && module!=null && !module.equals(current.get("source"))) throw new ResponseStatusException(FORBIDDEN,"Group belongs to a different source");
        Set<Long> ids=new HashSet<>(body.member_ids()); ids.add(body.owner_id());
        String marks=String.join(",",Collections.nCopies(ids.size(),"?"));
        if(db.count("SELECT COUNT(*) FROM users WHERE status='Active' AND id IN ("+marks+")",ids.toArray())!=ids.size()) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Every group member must be an active account");
        if(current==null) db.write("INSERT INTO contact_groups(code,title,group_type,owner_id,source) VALUES(?,?,?,?,?)",code,body.title(),body.group_type(),body.owner_id(),module==null?"core":module);
        else {
            if(!current.get("group_type").equals(body.group_type())) throw new ResponseStatusException(CONFLICT,"Group type cannot change");
            db.write("UPDATE contact_groups SET title=?,owner_id=? WHERE code=?",body.title(),body.owner_id(),code);
        }
        db.write("DELETE FROM group_members WHERE group_code=?",code);
        db.batch("INSERT INTO group_members(group_code,user_id) VALUES(?,?)",ids.stream().map(id->new Object[]{code,id}).toList());
        audit.append(actor,"Synchronized group",code,true); return find(code);
    }
    public List<Map<String,Object>> announcementRecipients(Map<String,Object> actor,String code) {
        var group=find(code);
        long id=PlatformRepository.id(actor);
        if(!"Administrator".equals(actor.get("role")) && !(member(code,id) && ("Staff".equals(actor.get("role")) || Objects.equals(group.get("owner_id"),id))))
            throw new ResponseStatusException(FORBIDDEN,"You do not own or manage this course group");
        return recipients(code);
    }
    public List<Map<String,Object>> recipients(String code) {
        return db.rows("SELECT u.id,u.email FROM users u JOIN group_members m ON m.user_id=u.id WHERE m.group_code=? AND u.status='Active'",code);
    }
}

package dev.coreplatform;

import jakarta.validation.constraints.*;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class NotificationService {
    private final PlatformRepository db;
    private final AccessService access;
    private final EmailService email;
    private final AuditRepository audit;
    private final Clock clock;
    public NotificationService(PlatformRepository db,AccessService access,EmailService email,AuditRepository audit,Clock clock) {
        this.db=db; this.access=access; this.email=email; this.audit=audit; this.clock=clock;
    }
    public record Notice(@NotBlank @Size(max=200) String title,@NotBlank @Size(max=10000) String text,
        @Pattern(regexp="[A-Za-z0-9_.-]{1,40}") String category,@Size(max=500) List<@NotNull @Positive Long> user_ids,
        @Size(max=255) String audience,@Pattern(regexp="in_app|email|both") String channel) {}
    public record Read(@NotNull @Size(max=500) List<@NotNull @Positive Long> ids) {}
    public List<Map<String,Object>> announcements(Jwt jwt,long offset,int size) {
        var actor=access.require(jwt,"announcements.send");
        if(offset<0 || offset>100000 || size<1 || size>100) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid pagination");
        boolean admin="Administrator".equals(actor.get("role"));
        return db.rows("SELECT id,sender_id,audience,title,text,channel,created_at FROM announcements WHERE (?=TRUE OR sender_id=?) ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?",admin,PlatformRepository.id(actor),size,offset);
    }
    public Map<String,Object> inbox(Jwt jwt,long before,int size) {
        long id=PlatformRepository.id(access.actor(jwt));
        if(size<1 || size>100 || before<0) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid pagination");
        var rows=db.rows("SELECT id,source,category,title,text,read_at,created_at FROM notifications WHERE user_id=? AND (?=0 OR id<?) ORDER BY id DESC LIMIT ?",id,before,before,size+1);
        boolean more=rows.size()>size; var items=rows.subList(0,Math.min(size,rows.size()));
        return Map.of("unread_count",db.count("SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL",id),"items",items,"has_more",more,"next_before",more?PlatformRepository.id(items.get(items.size()-1)):0);
    }
    @Transactional
    public void read(Jwt jwt,Read body) {
        long id=PlatformRepository.id(access.actor(jwt)); var now=Timestamp.from(clock.instant());
        if(body.ids().isEmpty()) db.write("UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL",now,id);
        else db.batch("UPDATE notifications SET read_at=? WHERE id=? AND user_id=? AND read_at IS NULL",body.ids().stream().map(n->new Object[]{now,n,id}).toList());
    }
    @Transactional
    public Map<String,Object> send(Jwt jwt,String module,Notice body) {
        var actor=module==null?access.require(jwt,"announcements.send"):null;
        boolean ids=body.user_ids()!=null && !body.user_ids().isEmpty();
        if(ids==(body.audience()!=null)) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Supply user_ids or audience");
        if(module!=null && !ids) throw new ResponseStatusException(FORBIDDEN,"Modules must supply explicit user_ids");
        String clause; Object[] args;
        if(ids) { clause="id IN ("+String.join(",",Collections.nCopies(body.user_ids().size(),"?"))+")"; args=body.user_ids().toArray(); }
        else if("ALL".equals(body.audience())) { clause="1=1"; args=new Object[]{}; }
        else if(body.audience().startsWith("ROLE:")) { clause="role=?"; args=new Object[]{body.audience().substring(5)}; }
        else if(body.audience().startsWith("DEPARTMENT:")) { clause="department=?"; args=new Object[]{body.audience().substring(11)}; }
        else throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Unsupported audience; course audiences require a course-membership integration");
        if(actor!=null && !"Administrator".equals(actor.get("role"))) {
            if(!"Staff".equals(actor.get("role")) || !Objects.equals(body.audience(),"DEPARTMENT:"+actor.get("department"))) throw new ResponseStatusException(FORBIDDEN,"Audience is outside your permitted scope");
        }
        String category=body.category()==null?"announcements":body.category();
        String channel=body.channel()==null?"in_app":body.channel();
        String source=module==null?"core":module;
        var recipients=db.rows("SELECT id,email FROM users WHERE status='Active' AND "+clause,args);
        if(ids && recipients.size()!=new HashSet<>(body.user_ids()).size()) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"One or more recipients do not exist or are inactive");
        // One preference query and batched inserts; no per-recipient database reads.
        Set<Long> optedOut=new HashSet<>();
        for(var pref:db.rows("SELECT user_id FROM notification_preferences WHERE category=? AND email_enabled=FALSE",category)) optedOut.add(((Number)pref.get("user_id")).longValue());
        if(!channel.equals("email")) db.batch("INSERT INTO notifications(user_id,source,category,title,text) VALUES(?,?,?,?,?)",recipients.stream().map(u->new Object[]{PlatformRepository.id(u),source,category,body.title(),body.text()}).toList());
        if(!channel.equals("in_app")) db.batch("INSERT INTO email_outbox(recipient,subject,body) VALUES(?,?,?)",recipients.stream().filter(u->!optedOut.contains(PlatformRepository.id(u))).map(u->new Object[]{u.get("email"),body.title(),body.text()}).toList());
        String announcement=UUID.randomUUID().toString();
        if(actor!=null) db.write("INSERT INTO announcements(id,sender_id,audience,title,text,channel) VALUES(?,?,?,?,?,?)",announcement,PlatformRepository.id(actor),ids?"USERS":body.audience(),body.title(),body.text(),channel);
        audit.append(actor==null?"Module:"+module:actor.get("email").toString(),"Sent notification",announcement,true);
        return Map.of("id",announcement,"recipients",recipients.size());
    }
    public void notifyOne(long user,String source,String category,String title,String text) {
        db.write("INSERT INTO notifications(user_id,source,category,title,text) VALUES(?,?,?,?,?)",user,source,category,title,text);
        var preference=db.one("SELECT email_enabled FROM notification_preferences WHERE user_id=? AND category=?",user,category);
        if(preference==null || Boolean.TRUE.equals(preference.get("email_enabled"))) {
            var u=db.one("SELECT email FROM users WHERE id=?",user);
            if(u!=null) email.enqueue((String)u.get("email"),title,text);
        }
    }
}

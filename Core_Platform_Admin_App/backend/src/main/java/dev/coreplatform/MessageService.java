package dev.coreplatform;

import jakarta.validation.constraints.*;
import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class MessageService {
    private final PlatformRepository db;
    private final UserRepository users;
    private final AccessService access;
    private final NotificationService notifications;
    private final GroupService groups;
    private static final String SCOPE="(c.first_user=? OR c.second_user=? OR EXISTS (SELECT 1 FROM group_threads t JOIN group_members g ON g.group_code=t.group_code WHERE t.conversation_id=c.id AND g.user_id=?))";
    public MessageService(PlatformRepository db,UserRepository users,AccessService access,NotificationService notifications,GroupService groups) {
        this.db=db; this.users=users; this.access=access; this.notifications=notifications;
        this.groups=groups;
    }
    public record Send(@Positive Long conversation_id,@Positive Long recipient_id,@Pattern(regexp="[A-Za-z0-9_.-]{1,64}") String group_code,@NotBlank @Size(max=10000) String text) {}
    public Map<String,Object> conversations(Jwt jwt,long before,int size) {
        long user=PlatformRepository.id(access.actor(jwt));
        if(before<0 || size<1 || size>50) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid pagination");
        var rows=db.rows("SELECT c.id,c.first_user,c.second_user,c.created_at,t.group_code,g.title FROM conversations c LEFT JOIN group_threads t ON t.conversation_id=c.id LEFT JOIN contact_groups g ON g.code=t.group_code WHERE "+SCOPE+" AND (?=0 OR c.id<?) ORDER BY c.id DESC LIMIT ?",user,user,user,before,before,size+1);
        boolean more=rows.size()>size; var items=rows.subList(0,Math.min(size,rows.size()));
        // Last 20 messages per selected conversation in one query, using MySQL 8 window functions.
        if(!items.isEmpty()) {
            String marks=String.join(",",Collections.nCopies(items.size(),"?"));
            var messages=db.rows("SELECT id,conversation_id,sender_id,text,sent_at FROM (SELECT m.*,ROW_NUMBER() OVER (PARTITION BY conversation_id ORDER BY id DESC) rn FROM messages m WHERE conversation_id IN ("+marks+")) recent WHERE rn<=20 ORDER BY id",items.stream().map(u->u.get("id")).toArray());
            Map<Object,List<Map<String,Object>>> grouped=new HashMap<>();
            for(var m:messages) grouped.computeIfAbsent(m.get("conversation_id"),k->new ArrayList<>()).add(m);
            for(var c:items) c.put("messages",grouped.getOrDefault(c.get("id"),List.of()));
        }
        return Map.of("items",items,"has_more",more,"next_before",more?PlatformRepository.id(items.get(items.size()-1)):0);
    }
    public Map<String,Object> history(Jwt jwt,long id,long before,int size) {
        long user=PlatformRepository.id(access.actor(jwt));
        if(size<1 || size>100 || before<0) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid pagination");
        if(db.one("SELECT c.id FROM conversations c WHERE c.id=? AND "+SCOPE,id,user,user,user)==null) throw new ResponseStatusException(NOT_FOUND,"Conversation not found");
        var rows=db.rows("SELECT id,sender_id,text,sent_at FROM messages WHERE conversation_id=? AND (?=0 OR id<?) ORDER BY id DESC LIMIT ?",id,before,before,size+1);
        boolean more=rows.size()>size; var items=rows.subList(0,Math.min(size,rows.size()));
        return Map.of("items",items,"has_more",more,"next_before",more?PlatformRepository.id(items.get(items.size()-1)):0);
    }
    @Transactional
    public Map<String,Object> send(Jwt jwt,Send body) {
        var sender=access.require(jwt,"messages.send"); long user=PlatformRepository.id(sender);
        int destinations=(body.conversation_id()==null?0:1)+(body.recipient_id()==null?0:1)+(body.group_code()==null?0:1);
        if(destinations!=1) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Supply conversation_id, recipient_id or group_code");
        long conversation,recipient;
        String groupCode=null;
        long requester=0;
        if(body.conversation_id()!=null) {
            var c=db.one("SELECT c.* FROM conversations c WHERE c.id=? AND "+SCOPE+" FOR UPDATE",body.conversation_id(),user,user,user);
            if(c==null) throw new ResponseStatusException(NOT_FOUND,"Conversation not found");
            conversation=PlatformRepository.id(c);
            var thread=db.one("SELECT group_code,requester_id FROM group_threads WHERE conversation_id=?",conversation);
            if(thread!=null) { groupCode=thread.get("group_code").toString(); requester=((Number)thread.get("requester_id")).longValue(); recipient=0; }
            else { long first=((Number)c.get("first_user")).longValue(); recipient=first==user?((Number)c.get("second_user")).longValue():first; }
        } else if(body.group_code()!=null) {
            groupCode=body.group_code(); var group=groups.find(groupCode);
            boolean office=group.get("group_type").equals("OFFICE");
            if(!office && !groups.member(groupCode,user)) throw new ResponseStatusException(FORBIDDEN,"Course membership required");
            if(office && groups.member(groupCode,user)) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Office staff must reply to a requester conversation");
            requester=office?user:0;
            db.one("SELECT code FROM contact_groups WHERE code=? FOR UPDATE",groupCode);
            var thread=db.one("SELECT conversation_id FROM group_threads WHERE group_code=? AND requester_id=?",groupCode,requester);
            if(thread==null) {
                conversation=db.insert("INSERT INTO conversations(first_user,second_user) VALUES(?,NULL)",office?user:null);
                db.write("INSERT INTO group_threads(group_code,requester_id,conversation_id) VALUES(?,?,?)",groupCode,requester,conversation);
            } else conversation=((Number)thread.get("conversation_id")).longValue();
            recipient=0;
        } else {
            recipient=body.recipient_id(); conversation=0;
        }
        if(groupCode==null) {
            var target=users.findById(recipient);
            if(target==null || recipient==user || !access.contactAllowed(sender,target)) throw new ResponseStatusException(FORBIDDEN,"Recipient is outside your permitted scope");
        }
        if(conversation==0) {
            // Stable pair lock serializes creation without catching constraint failures inside a transaction.
            long first=Math.min(user,recipient),second=Math.max(user,recipient); users.findByIdForUpdate(first);
            var c=db.one("SELECT id FROM conversations WHERE first_user=? AND second_user=?",first,second);
            conversation=c==null?db.insert("INSERT INTO conversations(first_user,second_user) VALUES(?,?)",first,second):PlatformRepository.id(c);
        }
        long id=db.insert("INSERT INTO messages(conversation_id,sender_id,text) VALUES(?,?,?)",conversation,user,body.text());
        var recipients=new HashSet<Long>();
        if(groupCode==null) recipients.add(recipient);
        else { for(var r:groups.recipients(groupCode)) recipients.add(PlatformRepository.id(r)); if(requester!=0) recipients.add(requester); }
        recipients.remove(user);
        notifications.notifyMany(recipients,"core","messages","New message from "+sender.get("name"),body.text());
        return db.one("SELECT id,conversation_id,sender_id,text,sent_at FROM messages WHERE id=?",id);
    }
}

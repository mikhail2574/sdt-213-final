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
    public MessageService(PlatformRepository db,UserRepository users,AccessService access,NotificationService notifications) {
        this.db=db; this.users=users; this.access=access; this.notifications=notifications;
    }
    public record Send(@Positive Long conversation_id,@Positive Long recipient_id,@NotBlank @Size(max=10000) String text) {}
    public Map<String,Object> conversations(Jwt jwt,long before,int size) {
        long user=PlatformRepository.id(access.actor(jwt));
        if(before<0 || size<1 || size>50) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid pagination");
        var rows=db.rows("SELECT id,first_user,second_user,created_at FROM conversations WHERE (first_user=? OR second_user=?) AND (?=0 OR id<?) ORDER BY id DESC LIMIT ?",user,user,before,before,size+1);
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
        if(db.one("SELECT id FROM conversations WHERE id=? AND (first_user=? OR second_user=?)",id,user,user)==null) throw new ResponseStatusException(NOT_FOUND,"Conversation not found");
        var rows=db.rows("SELECT id,sender_id,text,sent_at FROM messages WHERE conversation_id=? AND (?=0 OR id<?) ORDER BY id DESC LIMIT ?",id,before,before,size+1);
        boolean more=rows.size()>size; var items=rows.subList(0,Math.min(size,rows.size()));
        return Map.of("items",items,"has_more",more,"next_before",more?PlatformRepository.id(items.get(items.size()-1)):0);
    }
    @Transactional
    public Map<String,Object> send(Jwt jwt,Send body) {
        var sender=access.require(jwt,"messages.send"); long user=PlatformRepository.id(sender);
        if((body.conversation_id()==null)==(body.recipient_id()==null)) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Supply conversation_id or recipient_id");
        long conversation,recipient;
        if(body.conversation_id()!=null) {
            var c=db.one("SELECT * FROM conversations WHERE id=? AND (first_user=? OR second_user=?) FOR UPDATE",body.conversation_id(),user,user);
            if(c==null) throw new ResponseStatusException(NOT_FOUND,"Conversation not found");
            conversation=PlatformRepository.id(c);
            long first=((Number)c.get("first_user")).longValue(); recipient=first==user?((Number)c.get("second_user")).longValue():first;
        } else {
            recipient=body.recipient_id(); conversation=0;
        }
        var target=users.findById(recipient);
        if(target==null || recipient==user || !access.contactAllowed(sender,target)) throw new ResponseStatusException(FORBIDDEN,"Recipient is outside your permitted scope");
        if(conversation==0) {
            // Stable pair lock serializes creation without catching constraint failures inside a transaction.
            long first=Math.min(user,recipient),second=Math.max(user,recipient); users.findByIdForUpdate(first);
            var c=db.one("SELECT id FROM conversations WHERE first_user=? AND second_user=?",first,second);
            conversation=c==null?db.insert("INSERT INTO conversations(first_user,second_user) VALUES(?,?)",first,second):PlatformRepository.id(c);
        }
        long id=db.insert("INSERT INTO messages(conversation_id,sender_id,text) VALUES(?,?,?)",conversation,user,body.text());
        notifications.notifyOne(recipient,"core","messages","New message from "+sender.get("name"),body.text());
        return db.one("SELECT id,conversation_id,sender_id,text,sent_at FROM messages WHERE id=?",id);
    }
}

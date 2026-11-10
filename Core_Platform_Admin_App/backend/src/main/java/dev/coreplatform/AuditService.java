package dev.coreplatform;

import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class AuditService {
    private final PlatformRepository db;
    private final AccessService access;
    private final AuditRepository audit;
    public AuditService(PlatformRepository db,AccessService access,AuditRepository audit) { this.db=db; this.access=access; this.audit=audit; }
    public List<Map<String,Object>> search(Jwt jwt,String q,String actor,String action,String result,Instant from,Instant to,long before,int size,boolean csv) {
        var u=access.administrator(jwt); access.require(jwt,"audit.view");
        if(q.length()>150 || actor.length()>255 || action.length()>100 || before<0 || size<1 || size>(csv?10000:100) || !Set.of("","Success","Failed").contains(result) || (from!=null && to!=null && from.isAfter(to))) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Invalid audit filters");
        StringBuilder where=new StringBuilder(" WHERE 1=1"); var args=new ArrayList<Object>();
        if(!q.isEmpty()) { where.append(" AND (LOWER(actor) LIKE LOWER(?) OR LOWER(action) LIKE LOWER(?) OR LOWER(target) LIKE LOWER(?))"); for(int i=0;i<3;i++) args.add("%"+q+"%"); }
        if(!actor.isEmpty()) { where.append(" AND actor=?"); args.add(actor); }
        if(!action.isEmpty()) { where.append(" AND action=?"); args.add(action); }
        if(!result.isEmpty()) { where.append(" AND success=?"); args.add(result.equals("Success")); }
        if(from!=null) { where.append(" AND timestamp>=?"); args.add(Timestamp.from(from)); }
        if(to!=null) { where.append(" AND timestamp<=?"); args.add(Timestamp.from(to)); }
        if(before!=0) { where.append(" AND id<?"); args.add(before); }
        args.add(size);
        var items=db.rows("SELECT id,actor,action,target,CASE WHEN success THEN 'Success' ELSE 'Failed' END AS result,timestamp FROM audit_entries"+where+" ORDER BY id DESC LIMIT ?",args.toArray());
        if(csv) audit.append(u.get("email").toString(),"Exported audit log","Activity log",true);
        return items;
    }
    public static String csv(List<String> columns,List<Map<String,Object>> rows) {
        StringBuilder result=new StringBuilder(String.join(",",columns)).append("\r\n");
        for(var row:rows) {
            var values=new ArrayList<String>();
            for(String key:columns) {
                String value=Objects.toString(row.get(key),"");
                // Neutralize spreadsheet formulas, including leading whitespace/control characters.
                if(value.stripLeading().matches("(?s)^[=+@-].*") || value.startsWith("\t") || value.startsWith("\r")) value="'"+value;
                values.add("\""+value.replace("\"","\"\"")+"\"");
            }
            result.append(String.join(",",values)).append("\r\n");
        }
        return result.toString();
    }
}

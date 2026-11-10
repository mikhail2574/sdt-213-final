package dev.coreplatform;

import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

/** SQL boundary for the platform services. Only fixed SQL and bound values are accepted. */
@Repository
public class PlatformRepository {
    private final JdbcTemplate db;
    public PlatformRepository(JdbcTemplate db) { this.db=db; }
    public List<Map<String,Object>> rows(String sql, Object... args) {
        return db.query(sql,(rs,n)-> {
            Map<String,Object> row=new LinkedHashMap<>();
            var meta=rs.getMetaData();
            for(int i=1;i<=meta.getColumnCount();i++) {
                Object v=rs.getObject(i);
                row.put(meta.getColumnLabel(i).toLowerCase(Locale.ROOT),v instanceof Timestamp t?t.toInstant().toString():v);
            }
            return row;
        },args);
    }
    public Map<String,Object> one(String sql,Object... args) {
        var rows=rows(sql,args); return rows.isEmpty()?null:rows.get(0);
    }
    public long count(String sql,Object... args) { return db.queryForObject(sql,Long.class,args); }
    public int write(String sql,Object... args) { return db.update(sql,args); }
    public long insert(String sql,Object... args) {
        var keys=new GeneratedKeyHolder();
        db.update(c->{
            var s=c.prepareStatement(sql,new String[]{"id"});
            for(int i=0;i<args.length;i++) s.setObject(i+1,args[i]);
            return s;
        },keys);
        return Objects.requireNonNull(keys.getKey()).longValue();
    }
    public void batch(String sql,List<Object[]> args) { db.batchUpdate(sql,args); }
    static long id(Map<String,Object> row) { return ((Number)row.get("id")).longValue(); }
}

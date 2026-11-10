package dev.coreplatform;

import java.sql.Timestamp;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Explicit public account fields: hashes and lockout counters never leave the backend. */
final class UserView {
    private UserView() {}
    static Map<String, Object> of(Map<String, Object> user) {
        var result = new LinkedHashMap<String, Object>();
        for (String key : List.of("id", "name", "email", "role", "console_access", "department", "status", "last_login")) {
            Object value = user.get(key);
            result.put(key, value instanceof Timestamp t ? t.toInstant().toString() : value);
        }
        return result;
    }
}

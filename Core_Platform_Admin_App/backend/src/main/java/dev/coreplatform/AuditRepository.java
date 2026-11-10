package dev.coreplatform;

import java.util.List;
import java.util.Map;

/** Append/read interface: application code cannot edit or delete audit events. */
public interface AuditRepository {
    void append(String actor, String action, String target, boolean success);
    List<Map<String, Object>> latest(int limit);
}

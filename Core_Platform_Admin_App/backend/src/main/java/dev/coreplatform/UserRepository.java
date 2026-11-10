package dev.coreplatform;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** Persistence boundary for account data; callers never construct SQL clauses. */
public interface UserRepository {
    Map<String, Object> findById(long id);
    Map<String, Object> findByIdForUpdate(long id);
    Map<String, Object> findByEmail(String email);
    Map<String, Object> findByEmailForUpdate(String email);
    List<Map<String, Object>> search(String query, String role, String status);
    long countAll();
    long countByStatus(String status);
    long countByRole(String role);
    void create(String name, String email, String role, String access, String department, String hash, String status);
    void update(Map<String, Object> user);
    void recordFailure(long id, int attempts, Instant lockedUntil);
    void resetFailures(long id);
    void recordLogin(long id, Instant now);
    void changePassword(long id, String hash);
}

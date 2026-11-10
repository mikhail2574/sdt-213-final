package dev.coreplatform;

import java.sql.Timestamp;
import java.time.Instant;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcSessionRepository implements SessionRepository {
    private final JdbcTemplate db;
    public JdbcSessionRepository(JdbcTemplate db) { this.db = db; }
    public void create(String tokenId, long userId, Instant now, Instant expiresAt) {
        db.update("INSERT INTO auth_sessions(token_id,user_id,created_at,last_activity_at,expires_at) VALUES(?,?,?,?,?)",
            tokenId, userId, Timestamp.from(now), Timestamp.from(now), Timestamp.from(expiresAt));
    }
    public boolean touchIfValid(String tokenId, long userId, Instant now, Instant idleCutoff) {
        // Conditional update makes validation and activity renewal one atomic operation.
        return db.update("UPDATE auth_sessions SET last_activity_at=GREATEST(last_activity_at,?) WHERE token_id=? AND user_id=? AND revoked_at IS NULL AND expires_at>? AND last_activity_at>?",
            Timestamp.from(now), tokenId, userId, Timestamp.from(now), Timestamp.from(idleCutoff)) == 1;
    }
    public void revoke(String tokenId, long userId, Instant now) {
        db.update("UPDATE auth_sessions SET revoked_at=? WHERE token_id=? AND user_id=? AND revoked_at IS NULL", Timestamp.from(now), tokenId, userId);
    }
    public void revokeAll(long userId, Instant now) {
        db.update("UPDATE auth_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL", Timestamp.from(now), userId);
    }
}

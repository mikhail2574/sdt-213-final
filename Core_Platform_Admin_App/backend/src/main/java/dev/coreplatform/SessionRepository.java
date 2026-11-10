package dev.coreplatform;

import java.time.Instant;

/** Stores session identifiers, never raw bearer tokens. */
public interface SessionRepository {
    void create(String tokenId, long userId, Instant now, Instant expiresAt);
    boolean touchIfValid(String tokenId, long userId, Instant now, Instant idleCutoff);
    void revoke(String tokenId, long userId, Instant now);
    void revokeAll(long userId, Instant now);
}

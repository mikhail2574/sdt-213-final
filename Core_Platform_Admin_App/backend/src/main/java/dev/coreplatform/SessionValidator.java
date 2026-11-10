package dev.coreplatform;

import java.time.Clock;
import java.time.Duration;
import org.springframework.security.oauth2.core.*;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Component;

@Component
public class SessionValidator implements OAuth2TokenValidator<Jwt> {
    static final Duration IDLE_TIMEOUT = Duration.ofMinutes(30);
    private final SessionRepository sessions;
    private final UserRepository users;
    private final Clock clock;
    private final PlatformRepository db;
    public SessionValidator(SessionRepository sessions, UserRepository users, Clock clock, PlatformRepository db) {
        this.sessions = sessions; this.users = users; this.clock = clock;
        this.db=db;
    }
    @Override public OAuth2TokenValidatorResult validate(Jwt token) {
        var now = clock.instant();
        try {
            long userId = Long.parseLong(token.getSubject());
            if (token.getId() != null && token.getExpiresAt() != null && token.getExpiresAt().isAfter(now)) {
                var user = users.findById(userId);
                if (user != null && "Active".equals(user.get("status")) &&
                    sessions.touchIfValid(token.getId(), userId, now, now.minus(java.time.Duration.ofMinutes(((Number)db.one("SELECT session_timeout FROM platform_settings WHERE id=1").get("session_timeout")).longValue()))))
                    return OAuth2TokenValidatorResult.success();
            }
        } catch (NumberFormatException | NullPointerException ignored) { }
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Session is expired, revoked or inactive", null));
    }
}

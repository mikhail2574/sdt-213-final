package dev.coreplatform;

import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.util.*;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class AuthService {
    private static final Duration MAX_SESSION = Duration.ofHours(8);
    private final UserRepository users;
    private final AuditRepository audit;
    private final SessionRepository sessions;
    private final BCryptPasswordEncoder passwords;
    private final JwtEncoder encoder;
    private final Clock clock;
    private final String dummyHash;
    public AuthService(UserRepository users, AuditRepository audit, SessionRepository sessions,
                       BCryptPasswordEncoder passwords, JwtEncoder encoder, Clock clock) {
        this.users = users; this.audit = audit; this.sessions = sessions;
        this.passwords = passwords; this.encoder = encoder; this.clock = clock;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }
    public record Login(@NotBlank @Email @Size(max=255) String email, @NotNull @Size(max=1024) String password) {
        @Override public String toString() { return "Login[email=" + email + ", password=[REDACTED]]"; }
    }

    // Authentication failures must commit lockout counters and their audit events.
    @Transactional(noRollbackFor=ResponseStatusException.class)
    public Map<String, Object> login(Login body) {
        String email = body.email().strip().toLowerCase(Locale.ROOT);
        var user = users.findByEmailForUpdate(email);
        var now = clock.instant();
        if (user != null && user.get("locked_until") instanceof Timestamp lock) {
            if (lock.toInstant().isAfter(now)) {
                audit.append(email, "Locked sign-in attempt", email, false);
                throw new ResponseStatusException(LOCKED, "Account is locked for up to 15 minutes");
            }
            users.resetFailures(((Number) user.get("id")).longValue());
            user.put("failed_attempts", 0);
        }
        boolean valid = body.password().getBytes(StandardCharsets.UTF_8).length <= 72 &&
            passwords.matches(body.password(), user == null ? dummyHash : (String) user.get("password_hash"));
        if (!valid || user == null) {
            if (user != null) {
                int failures = ((Number) user.get("failed_attempts")).intValue() + 1;
                users.recordFailure(((Number) user.get("id")).longValue(), failures, failures >= 5 ? now.plusSeconds(900) : null);
            }
            audit.append(email, "Failed sign-in", email, false);
            throw new ResponseStatusException(UNAUTHORIZED, "Invalid email or password");
        }
        if (!"Active".equals(user.get("status"))) {
            audit.append(email, "Inactive sign-in", email, false);
            throw new ResponseStatusException(FORBIDDEN, "Account is not active");
        }
        long id = ((Number) user.get("id")).longValue();
        String tokenId = UUID.randomUUID().toString();
        var expiresAt = now.plus(MAX_SESSION);
        sessions.create(tokenId, id, now, expiresAt);
        users.recordLogin(id, now);
        audit.append(email, "Signed in", email, true);
        user.put("last_login", Timestamp.from(now));
        var claims = JwtClaimsSet.builder().id(tokenId).subject(Long.toString(id)).issuedAt(now).expiresAt(expiresAt).build();
        String token = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return Map.of("access_token", token, "token_type", "bearer", "user", UserView.of(user));
    }
    @Transactional
    public void logout(Jwt token) {
        long id = Long.parseLong(token.getSubject());
        var user = users.findById(id);
        if (user == null || !"Active".equals(user.get("status")))
            throw new ResponseStatusException(UNAUTHORIZED, "Account is not active");
        sessions.revoke(token.getId(), id, clock.instant());
        audit.append((String) user.get("email"), "Signed out", (String) user.get("email"), true);
    }
}

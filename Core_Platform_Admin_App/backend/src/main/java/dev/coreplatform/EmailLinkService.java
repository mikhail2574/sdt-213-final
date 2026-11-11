package dev.coreplatform;

import jakarta.validation.constraints.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class EmailLinkService {
    private final PlatformRepository db;
    private final UserRepository users;
    private final AuditRepository audit;
    private final SessionRepository sessions;
    private final EmailService email;
    private final BCryptPasswordEncoder passwords;
    private final PasswordPolicy policy;
    private final Clock clock;
    private final String linkBase;
    private final AccessService access;
    private final AuthService auth;
    public EmailLinkService(PlatformRepository db,UserRepository users,AuditRepository audit,SessionRepository sessions,
        EmailService email,BCryptPasswordEncoder passwords,PasswordPolicy policy,Clock clock,AccessService access,AuthService auth,
        @Value("${app.email-link-base}") String linkBase) {
        this.db=db; this.users=users; this.audit=audit; this.sessions=sessions; this.email=email;
        this.passwords=passwords; this.policy=policy; this.clock=clock; this.linkBase=linkBase; this.access=access; this.auth=auth;
    }
    public record Registration(@NotBlank @Size(min=2,max=120) String name,@NotBlank @Email @Size(max=255) String email,
        @NotBlank @Size(max=72) String password,@NotBlank @Size(max=72) String confirm_password,@AssertTrue boolean privacy_accepted) {
        @Override public String toString() { return "Registration[REDACTED]"; }
    }
    public record Reset(@NotBlank @Email @Size(max=255) String email) {}
    public record Link(@NotBlank @Size(max=128) String token,@Size(max=72) String password,@Size(max=72) String confirm_password) {
        @Override public String toString() { return "Link[REDACTED]"; }
    }
    static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch(NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    public void issue(Map<String,Object> user,String purpose) {
        long id=PlatformRepository.id(user);
        db.write("UPDATE email_tokens SET used_at=? WHERE user_id=? AND purpose=? AND used_at IS NULL",Timestamp.from(clock.instant()),id,purpose);
        byte[] bytes=new byte[32]; new SecureRandom().nextBytes(bytes);
        String raw=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        db.write("INSERT INTO email_tokens(token_hash,user_id,purpose,expires_at) VALUES(?,?,?,?)",hash(raw),id,purpose,
            Timestamp.from(clock.instant().plus(purpose.equals("confirm")?Duration.ofDays(7):Duration.ofHours(24))));
        email.enqueue((String)user.get("email"),purpose.equals("confirm")?"Confirm your account":"Set your password",linkBase+"?token="+raw+"&purpose="+purpose);
    }
    @Transactional
    public Map<String,Object> register(Registration body) {
        if(body.name().strip().length()<2) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Name must contain at least 2 non-padding characters");
        policy.validate(body.password());
        if(!body.password().equals(body.confirm_password())) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"The new passwords do not match");
        String address=body.email().strip().toLowerCase(Locale.ROOT);
        users.create(body.name().strip(),address,"Applicant",null,"",passwords.encode(body.password()),"Pending");
        var u=users.findByEmail(address); issue(u,"confirm"); audit.append(address,"Registered applicant",address,true);
        return UserView.of(u);
    }
    @Transactional
    public Map<String,String> forgot(Jwt jwt,Reset body) {
        String address=body.email().strip().toLowerCase(Locale.ROOT);
        var actor=jwt==null?null:access.actor(jwt);
        if(actor!=null && !address.equals(actor.get("email"))) access.require(jwt,"users.edit");
        var u=users.findByEmailForUpdate(address);
        // Bound queue growth for repeated public requests without revealing account existence.
        if(u!=null && "Active".equals(u.get("status")) && db.count("SELECT COUNT(*) FROM email_tokens WHERE user_id=? AND purpose='reset' AND used_at IS NULL AND expires_at>?",PlatformRepository.id(u),Timestamp.from(clock.instant().plus(Duration.ofHours(24)).minusSeconds(60)))==0) issue(u,"reset");
        audit.append(actor==null?address:(String)actor.get("email"),"Requested password reset",address,true);
        return Map.of("detail","If an active account exists, a password reset link will be sent");
    }
    @Transactional
    public Map<String,Object> redeem(Link body) {
        String digest=hash(body.token());
        var initial=db.one("SELECT user_id FROM email_tokens WHERE token_hash=?",digest);
        if(initial==null) throw new ResponseStatusException(BAD_REQUEST,"Link is invalid, expired or already used");
        long id=((Number)initial.get("user_id")).longValue();
        var u=users.findByIdForUpdate(id);
        var token=db.one("SELECT * FROM email_tokens WHERE token_hash=? FOR UPDATE",digest);
        if(u==null || token==null || token.get("used_at")!=null || !Instant.parse((String)token.get("expires_at")).isAfter(clock.instant()))
            throw new ResponseStatusException(BAD_REQUEST,"Link is invalid, expired or already used");
        String purpose=(String)token.get("purpose");
        if("Inactive".equals(u.get("status"))) throw new ResponseStatusException(FORBIDDEN,"Account is inactive");
        if(purpose.equals("confirm")) {
            if(body.password()!=null || !"Pending".equals(u.get("status"))) throw new ResponseStatusException(BAD_REQUEST,"Invalid confirmation request");
        } else {
            policy.validate(body.password());
            if(body.confirm_password()!=null && !body.password().equals(body.confirm_password())) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"The new passwords do not match");
            users.changePassword(id,passwords.encode(body.password())); users.resetFailures(id); sessions.revokeAll(id,clock.instant());
        }
        if(!purpose.equals("reset")) { u.put("status","Active"); users.update(u); }
        db.write("UPDATE email_tokens SET used_at=? WHERE user_id=? AND used_at IS NULL",Timestamp.from(clock.instant()),id);
        audit.append((String)u.get("email"),purpose.equals("confirm")?"Confirmed email":"Set password using email link",u.get("email").toString(),true);
        return purpose.equals("confirm")?auth.startSession(u):Map.of("detail","Password updated; sign in again");
    }
    @Scheduled(fixedDelayString="${app.cleanup-ms:3600000}")
    @Transactional
    public void removeExpiredApplicants() {
        // Lock account rows before deleting so confirmation and cleanup cannot race.
        var expired=db.rows("SELECT u.id FROM users u WHERE u.role='Applicant' AND u.status='Pending' AND EXISTS (SELECT 1 FROM email_tokens t WHERE t.user_id=u.id AND t.purpose='confirm' AND t.used_at IS NULL AND t.expires_at<=?) FOR UPDATE",Timestamp.from(clock.instant()));
        for(var row:expired) {
            long id=PlatformRepository.id(row);
            audit.append("System","Removed unconfirmed applicant",Long.toString(id),true);
            db.write("DELETE FROM users WHERE id=?",id);
        }
    }
}

package dev.coreplatform;

import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.springframework.core.env.Environment;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class SsoService {
    private final PlatformRepository db;
    private final AccessService access;
    private final ModuleService modules;
    private final Environment env;
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final Clock clock;
    private final AuditRepository audit;
    public SsoService(PlatformRepository db,AccessService access,ModuleService modules,Environment env,JwtEncoder encoder,JwtDecoder decoder,Clock clock,AuditRepository audit) {
        this.db=db; this.access=access; this.modules=modules; this.env=env; this.encoder=encoder; this.decoder=decoder; this.clock=clock; this.audit=audit;
    }
    @Transactional
    public Map<String,Object> issue(Jwt jwt,String code) {
        var user=access.actor(jwt); modules.authorize(jwt,code); modules.enabled(code);
        String destination=env.getProperty("app.modules."+code+".web-url","");
        if(destination.isBlank()) throw new ResponseStatusException(SERVICE_UNAVAILABLE,"Module sign-in is not configured");
        URI uri;
        try { uri=URI.create(destination); } catch(IllegalArgumentException e) { throw new ResponseStatusException(SERVICE_UNAVAILABLE,"Invalid module sign-in configuration"); }
        if(uri.getHost()==null || uri.getUserInfo()!=null || uri.getFragment()!=null || !("https".equals(uri.getScheme()) || ("http".equals(uri.getScheme()) && Set.of("127.0.0.1","localhost").contains(uri.getHost())))) throw new ResponseStatusException(SERVICE_UNAVAILABLE,"Module sign-in must use HTTPS (or local development HTTP)");
        byte[] bytes=new byte[32]; new SecureRandom().nextBytes(bytes); String ticket=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        db.write("INSERT INTO module_sso_tickets(ticket_hash,module_code,user_id,token_id,expires_at) VALUES(?,?,?,?,?)",EmailLinkService.hash(ticket),code,PlatformRepository.id(user),jwt.getId(),Timestamp.from(clock.instant().plusSeconds(60)));
        audit.append(user.get("email").toString(),"Launched module",code,true);
        return Map.of("launch_url",destination+(uri.getRawQuery()==null?"?":"&")+"sso_ticket="+URLEncoder.encode(ticket,StandardCharsets.UTF_8),"expires_in",60);
    }
    @Transactional
    public Map<String,Object> exchange(String key,String raw) {
        String code=modules.authenticate(key);
        var ticket=db.one("SELECT * FROM module_sso_tickets WHERE ticket_hash=? FOR UPDATE",EmailLinkService.hash(raw));
        if(ticket==null || ticket.get("used_at")!=null || !code.equals(ticket.get("module_code")) || !Instant.parse(ticket.get("expires_at").toString()).isAfter(clock.instant())) throw new ResponseStatusException(BAD_REQUEST,"SSO ticket is invalid, expired or already used");
        var session=db.one("SELECT expires_at FROM auth_sessions WHERE token_id=? AND user_id=?",ticket.get("token_id"),ticket.get("user_id"));
        if(session==null) throw new ResponseStatusException(UNAUTHORIZED,"Session is no longer active");
        var claims=JwtClaimsSet.builder().id(ticket.get("token_id").toString()).subject(ticket.get("user_id").toString()).issuedAt(clock.instant()).expiresAt(Instant.parse(session.get("expires_at").toString())).audience(List.of(code)).claim("module",code).build();
        String encoded=encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
        Jwt token;
        try { token=decoder.decode(encoded); } catch(JwtException e) { throw new ResponseStatusException(UNAUTHORIZED,"Session is no longer active"); }
        var user=access.moduleActor(token,code); var permissions=access.permissions(user);
        if(!permissions.contains("modules."+code)) throw new ResponseStatusException(FORBIDDEN,"Module access denied");
        db.write("UPDATE module_sso_tickets SET used_at=? WHERE ticket_hash=?",Timestamp.from(clock.instant()),EmailLinkService.hash(raw));
        return Map.of("access_token",encoded,"token_type","bearer","module",code,"expires_at",token.getExpiresAt().toString());
    }
}

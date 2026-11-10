package dev.coreplatform;

import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.Flow;
import java.nio.ByteBuffer;
import java.io.ByteArrayOutputStream;
import org.springframework.core.env.Environment;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@Service
public class ModuleService {
    static final List<String> CODES=List.of("lms","sis","scheduling","admissions");
    private final Environment env;
    private final PlatformRepository db;
    private final AccessService access;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).followRedirects(HttpClient.Redirect.NEVER).build();
    public ModuleService(Environment env,PlatformRepository db,AccessService access) { this.env=env; this.db=db; this.access=access; }
    public String authenticate(String key) {
        if(key==null || key.isBlank()) throw new ResponseStatusException(UNAUTHORIZED,"Module credentials required");
        for(String code:CODES) {
            String expected=env.getProperty("app.modules."+code+".key","");
            if(!expected.isEmpty() && MessageDigest.isEqual(EmailLinkService.hash(expected).getBytes(StandardCharsets.US_ASCII),EmailLinkService.hash(key).getBytes(StandardCharsets.US_ASCII))) {
                enabled(code); return code;
            }
        }
        throw new ResponseStatusException(UNAUTHORIZED,"Invalid module credentials");
    }
    public void enabled(String code) {
        var module=db.one("SELECT enabled FROM connected_modules WHERE code=?",code);
        if(module==null) throw new ResponseStatusException(NOT_FOUND,"Module not found");
        if(!Boolean.TRUE.equals(module.get("enabled"))) throw new ResponseStatusException(SERVICE_UNAVAILABLE,"Module is disabled");
    }
    public URI uri(String code,String path,String query) {
        enabled(code);
        String base=env.getProperty("app.modules."+code+".url","");
        if(base.isBlank()) throw new ResponseStatusException(SERVICE_UNAVAILABLE,"Module is not configured");
        URI configured=URI.create(base);
        if(!Set.of("http","https").contains(configured.getScheme()) || configured.getHost()==null || configured.getRawQuery()!=null || configured.getRawFragment()!=null || configured.getUserInfo()!=null)
            throw new ResponseStatusException(SERVICE_UNAVAILABLE,"Invalid module configuration");
        if(!path.startsWith("/") || path.contains("..") || path.contains("\\") || path.contains("%") || path.contains(";") || path.contains("//")) throw new ResponseStatusException(BAD_REQUEST,"Invalid module path");
        return URI.create(base.replaceAll("/+$","")+path+(query==null?"":"?"+query));
    }
    public void authorize(Jwt jwt,String code) {
        if(!CODES.contains(code)) throw new ResponseStatusException(NOT_FOUND,"Module not found");
        access.require(jwt,"modules."+code);
    }
    public record Reply(int status,String contentType,byte[] body) {}
    public Reply request(String code,String path,String query,String method,String bearer,String contentType,byte[] body) {
        if(body!=null && body.length>1048576) throw new ResponseStatusException(PAYLOAD_TOO_LARGE,"Maximum request size is 1 MB");
        try {
            var request=HttpRequest.newBuilder(uri(code,path,query)).timeout(Duration.ofSeconds(3)).header("Authorization",bearer)
                .header("Accept","application/json");
            if(contentType!=null) request.header("Content-Type",contentType);
            request.method(method,body==null?HttpRequest.BodyPublishers.noBody():HttpRequest.BodyPublishers.ofByteArray(body));
            var pending=client.sendAsync(request.build(),info->new LimitedBody());
            try {
                var response=pending.get(3,TimeUnit.SECONDS);
                return new Reply(response.statusCode(),response.headers().firstValue("Content-Type").orElse("application/json"),response.body());
            } catch(TimeoutException e) { pending.cancel(true); throw new ResponseStatusException(SERVICE_UNAVAILABLE,"Module timed out"); }
        } catch(InterruptedException e) { Thread.currentThread().interrupt(); throw new ResponseStatusException(BAD_GATEWAY,"Module request interrupted"); }
        catch(ExecutionException e) { throw new ResponseStatusException(BAD_GATEWAY,"Module failed or response exceeded 2 MB"); }
    }
    private static final class LimitedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> result=new CompletableFuture<>();
        private final ByteArrayOutputStream bytes=new ByteArrayOutputStream();
        private Flow.Subscription subscription;
        public CompletionStage<byte[]> getBody() { return result; }
        public void onSubscribe(Flow.Subscription subscription) { this.subscription=subscription; subscription.request(1); }
        public void onNext(List<ByteBuffer> buffers) {
            for(var buffer:buffers) {
                if(bytes.size()+buffer.remaining()>2097152) { subscription.cancel(); result.completeExceptionally(new java.io.IOException("Response size limit")); return; }
                byte[] part=new byte[buffer.remaining()]; buffer.get(part); bytes.writeBytes(part);
            }
            subscription.request(1);
        }
        public void onError(Throwable error) { result.completeExceptionally(error); }
        public void onComplete() { result.complete(bytes.toByteArray()); }
    }
}

package dev.coreplatform;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.junit.jupiter.api.*;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ModuleServiceTest {
    HttpServer server;
    ModuleService modules;
    PlatformRepository db;
    @BeforeEach void setup() throws Exception {
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        server.start();
        db=mock(PlatformRepository.class);
        when(db.one("SELECT enabled FROM connected_modules WHERE code=?","lms")).thenReturn(Map.of("enabled",true));
        var env=new MockEnvironment().withProperty("app.modules.lms.url","http://127.0.0.1:"+server.getAddress().getPort()).withProperty("app.modules.lms.key","trusted-key");
        modules=new ModuleService(env,db,mock(AccessService.class));
    }
    @AfterEach void close() { server.stop(0); }
    @Test void proxyPreservesMethodQueryBearerBodyAndStatus() {
        server.createContext("/data",exchange->{
            assertEquals("POST",exchange.getRequestMethod());
            assertEquals("q=test",exchange.getRequestURI().getRawQuery());
            assertEquals("Bearer session",exchange.getRequestHeaders().getFirst("Authorization"));
            assertNull(exchange.getRequestHeaders().getFirst("X-Module-Key"));
            assertEquals("{}",new String(exchange.getRequestBody().readAllBytes(),StandardCharsets.UTF_8));
            byte[] body="{\"ok\":true}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.sendResponseHeaders(201,body.length); exchange.getResponseBody().write(body); exchange.close();
        });
        var reply=modules.request("lms","/data","q=test","POST","Bearer session","application/json","{}".getBytes(StandardCharsets.UTF_8));
        assertEquals(201,reply.status()); assertEquals("{\"ok\":true}",new String(reply.body(),StandardCharsets.UTF_8));
    }
    @Test void moduleKeysDisabledRoutesAndTraversal() {
        assertEquals("lms",modules.authenticate("trusted-key"));
        assertEquals(401,assertThrows(ResponseStatusException.class,()->modules.authenticate("wrong")).getStatusCode().value());
        for(String path:new String[]{"/../secret","/%2e%2e/secret","//outside","/a\\b"}) assertEquals(400,assertThrows(ResponseStatusException.class,()->modules.uri("lms",path,null)).getStatusCode().value());
        when(db.one("SELECT enabled FROM connected_modules WHERE code=?","lms")).thenReturn(Map.of("enabled",false));
        assertEquals(503,assertThrows(ResponseStatusException.class,()->modules.authenticate("trusted-key")).getStatusCode().value());
    }
    @Test void oversizedUpstreamResponseIsCancelled() {
        server.createContext("/large",exchange->{
            try { byte[] body=new byte[2097153]; exchange.sendResponseHeaders(200,body.length); exchange.getResponseBody().write(body); }
            catch(java.io.IOException ignored) {} finally { exchange.close(); }
        });
        assertEquals(502,assertThrows(ResponseStatusException.class,()->modules.request("lms","/large",null,"GET","Bearer session",null,null)).getStatusCode().value());
    }
}

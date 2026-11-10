package dev.coreplatform;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class CoreApi {
    private final CoreService core;
    private final AuthService auth;
    private final PlatformRepository db;
    public CoreApi(CoreService core, AuthService auth, PlatformRepository db) { this.core = core; this.auth = auth; this.db = db; }
    @GetMapping("/health") public Map<String, String> health() { return core.health(); }
    @GetMapping("/health/readiness") public ResponseEntity<Map<String,String>> readiness() {
        try {
            db.count("SELECT 1");
            return ResponseEntity.ok(Map.of("status","ready"));
        } catch(org.springframework.dao.DataAccessException e) {
            return ResponseEntity.status(503).body(Map.of("status","unavailable"));
        }
    }
    @PostMapping("/auth/login") public Map<String, Object> login(@Valid @RequestBody AuthService.Login body) { return auth.login(body); }
    @PostMapping("/auth/logout") public ResponseEntity<Void> logout(@AuthenticationPrincipal Jwt jwt) { auth.logout(jwt); return ResponseEntity.noContent().build(); }
    @PostMapping("/auth/change-password") public ResponseEntity<Void> changePassword(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody AuthService.PasswordChange body) {
        auth.changePassword(jwt, body); return ResponseEntity.noContent().build();
    }
    @GetMapping("/me") public Map<String, Object> me(@AuthenticationPrincipal Jwt jwt) { return core.me(jwt); }
    @GetMapping("/admin/dashboard") public Map<String, Object> dashboard(@AuthenticationPrincipal Jwt jwt) { return core.dashboard(jwt); }
    @GetMapping("/admin/users") public List<Map<String, Object>> users(@AuthenticationPrincipal Jwt jwt,
        @RequestParam(defaultValue="") String q, @RequestParam(defaultValue="") String role, @RequestParam(defaultValue="") String status) {
        return core.listUsers(jwt, q, role, status);
    }
    @PostMapping("/admin/users") public ResponseEntity<Map<String, Object>> create(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody CoreService.NewUser body) {
        return core.create(jwt, body);
    }
    @PatchMapping("/admin/users/{id}") public Map<String, Object> update(@AuthenticationPrincipal Jwt jwt, @PathVariable long id, @RequestBody Map<String, Object> fields) {
        return core.update(jwt, id, fields);
    }
}

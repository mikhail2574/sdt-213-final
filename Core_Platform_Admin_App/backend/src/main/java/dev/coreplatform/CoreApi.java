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
    public CoreApi(CoreService core) { this.core = core; }
    @GetMapping("/health") public Map<String, String> health() { return core.health(); }
    @PostMapping("/auth/login") public Map<String, Object> login(@Valid @RequestBody CoreService.Login body) { return core.login(body); }
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
    @GetMapping("/admin/audit") public List<Map<String, Object>> activity(@AuthenticationPrincipal Jwt jwt) { return core.activity(jwt); }
}

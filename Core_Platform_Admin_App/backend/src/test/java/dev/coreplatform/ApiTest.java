package dev.coreplatform;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=${TEST_DATABASE_URL:jdbc:h2:mem:core;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE}", "spring.datasource.username=${TEST_DATABASE_USER:sa}", "spring.datasource.password=${TEST_DATABASE_PASSWORD:}", "app.seed-demo=1"})
@AutoConfigureMockMvc
class ApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    @Autowired CoreApi api;
    @BeforeEach void reset() { db.update("DELETE FROM audit_entries"); db.update("DELETE FROM users"); api.run(); }
    String login(String account) throws Exception {
        var response=mvc.perform(post("/api/v1/auth/login").contentType("application/json").content("{\"email\":\""+account+"@coreplatform.dev\",\"password\":\""+account+"123\"}"))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer "+json.readTree(response).get("access_token").asText();
    }
    @Test void permissionsAndAuthentication() throws Exception {
        mvc.perform(get("/api/v1/health")).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer malformed")).andExpect(status().isUnauthorized());
        String student=login("student");
        mvc.perform(get("/api/v1/me").header("Authorization",student)).andExpect(jsonPath("$.role").value("Student")).andExpect(jsonPath("$.password_hash").doesNotExist());
        mvc.perform(get("/api/v1/admin/users").header("Authorization",student)).andExpect(status().isForbidden());
        String admin=login("admin");
        mvc.perform(get("/api/v1/admin/dashboard").header("Authorization",admin)).andExpect(jsonPath("$.total_users").value(6));
        mvc.perform(get("/api/v1/admin/users").param("q","Emma").header("Authorization",admin)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/admin/audit").header("Authorization",login("viewer"))).andExpect(status().isForbidden());
    }
    @Test void lockoutAndRecovery() throws Exception {
        for(int i=0;i<5;i++) mvc.perform(post("/api/v1/auth/login").contentType("application/json").content("{\"email\":\"student@coreplatform.dev\",\"password\":\"wrong\"}")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").contentType("application/json").content("{\"email\":\"student@coreplatform.dev\",\"password\":\"student123\"}")).andExpect(status().isLocked());
        db.update("UPDATE users SET locked_until=? WHERE email='student@coreplatform.dev'", java.sql.Timestamp.from(java.time.Instant.now().minusSeconds(10)));
        login("student");
        Assertions.assertEquals(0,db.queryForObject("SELECT failed_attempts FROM users WHERE email='student@coreplatform.dev'",Integer.class));
        Assertions.assertEquals(6,db.queryForObject("SELECT COUNT(*) FROM audit_entries WHERE success=false",Integer.class));
    }
    @Test void creationEditingAndValidation() throws Exception {
        String admin=login("admin"), viewer=login("viewer"), operator=login("staff");
        String body="{\"name\":\"New Person\",\"email\":\"new@test.edu\",\"role\":\"Faculty\",\"department\":\"CS\"}";
        mvc.perform(post("/api/v1/admin/users").header("Authorization",viewer).contentType("application/json").content(body)).andExpect(status().isForbidden());
        String created=mvc.perform(post("/api/v1/admin/users").header("Authorization",admin).contentType("application/json").content(body)).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("Pending")).andReturn().getResponse().getContentAsString();
        long id=json.readTree(created).get("id").asLong();
        mvc.perform(post("/api/v1/admin/users").header("Authorization",admin).contentType("application/json").content(body)).andExpect(status().isConflict());
        mvc.perform(patch("/api/v1/admin/users/"+id).header("Authorization",viewer).contentType("application/json").content("{\"status\":\"Active\"}")).andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/admin/users/"+id).header("Authorization",operator).contentType("application/json").content("{\"role\":\"Administrator\"}")).andExpect(status().isForbidden());
        mvc.perform(patch("/api/v1/admin/users/"+id).header("Authorization",operator).contentType("application/json").content("{\"status\":\"Inactive\"}")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("Inactive"));
        for(String invalid:new String[]{"{\"name\":null}","{\"role\":\"Invalid\"}","{\"console_access\":\"Operator\"}"})
            mvc.perform(patch("/api/v1/admin/users/"+id).header("Authorization",admin).contentType("application/json").content(invalid)).andExpect(status().isUnprocessableEntity());
        long adminId=db.queryForObject("SELECT id FROM users WHERE role='Administrator'",Long.class);
        mvc.perform(patch("/api/v1/admin/users/"+adminId).header("Authorization",admin).contentType("application/json").content("{\"status\":\"Inactive\"}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/admin/audit").header("Authorization",admin)).andExpect(jsonPath("$[0].action").value("Updated user"));
        db.update("UPDATE users SET status='Inactive' WHERE email='staff@coreplatform.dev'");
        mvc.perform(get("/api/v1/me").header("Authorization",operator)).andExpect(status().isUnauthorized());
    }
}

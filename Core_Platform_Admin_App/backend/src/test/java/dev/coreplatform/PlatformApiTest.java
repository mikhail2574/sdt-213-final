package dev.coreplatform;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.datasource.url=jdbc:h2:mem:platform;MODE=MySQL;DB_CLOSE_DELAY=-1;DATABASE_TO_LOWER=TRUE","spring.datasource.username=sa","spring.datasource.password=","app.seed-demo=1","app.modules.sis.key=test-sis-key","app.modules.lms.key=test-lms-key","app.monitor-initial-ms=3600000","app.mail-enabled=true","app.mail-initial-ms=3600000"})
@AutoConfigureMockMvc
class PlatformApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate db;
    @Autowired DemoDataLoader demo;
    @Autowired EmailLinkService links;
    @Autowired EmailService email;
    @Autowired MonitoringService monitoring;
    @org.springframework.test.context.bean.override.mockito.MockitoBean org.springframework.mail.javamail.JavaMailSender mail;
    @BeforeEach void reset() {
        db.update("DELETE FROM users"); db.update("DELETE FROM audit_entries"); db.update("DELETE FROM email_outbox");
        db.update("DELETE FROM announcements"); db.update("DELETE FROM service_status");
        db.update("UPDATE connected_modules SET enabled=TRUE");
        db.update("UPDATE platform_settings SET min_password_length=8,session_timeout=30,lockout_attempts=5");
        demo.run();
    }
    String login(String account) throws Exception {
        var result=mvc.perform(post("/api/v1/auth/login").contentType("application/json").content(json.writeValueAsString(Map.of("email",account+"@coreplatform.dev","password",account+"123"))))
            .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return "Bearer "+json.readTree(result).get("access_token").asText();
    }
    long id(String account) { return db.queryForObject("SELECT id FROM users WHERE email=?",Long.class,account+"@coreplatform.dev"); }
    String token(String email) {
        String body=db.queryForObject("SELECT body FROM email_outbox WHERE recipient=? ORDER BY id DESC LIMIT 1",String.class,email);
        var match=Pattern.compile("[?]token=([A-Za-z0-9_-]+)").matcher(body); assertTrue(match.find()); return match.group(1);
    }
    @Test void registrationConfirmationSingleUseAndCleanup() throws Exception {
        String body=json.writeValueAsString(Map.of("name","New Applicant","email","new@example.edu","password","secret123","confirm_password","secret123","privacy_accepted",true));
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(body)).andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("Pending"));
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(body)).andExpect(status().isConflict());
        String raw=token("new@example.edu");
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM email_tokens WHERE token_hash=?",Integer.class,raw));
        var response=mvc.perform(post("/api/v1/auth/email-link").contentType("application/json").content(json.writeValueAsString(Map.of("token",raw))))
            .andExpect(status().isOk()).andExpect(jsonPath("$.user.status").value("Active")).andReturn().getResponse().getContentAsString();
        mvc.perform(get("/api/v1/me").header("Authorization","Bearer "+json.readTree(response).get("access_token").asText())).andExpect(status().isOk());
        mvc.perform(post("/api/v1/auth/email-link").contentType("application/json").content(json.writeValueAsString(Map.of("token",raw)))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/auth/register").contentType("application/json").content(body.replace("new@example.edu","expired@example.edu"))).andExpect(status().isCreated());
        db.update("UPDATE email_tokens SET expires_at=? WHERE user_id=(SELECT id FROM users WHERE email='expired@example.edu')",Timestamp.from(Instant.now().minusSeconds(1)));
        links.removeExpiredApplicants();
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM users WHERE email='expired@example.edu'",Integer.class));
    }
    @Test void resetIsNeutralExpiresAndRevokesSessions() throws Exception {
        String student=login("student");
        String existing=mvc.perform(post("/api/v1/auth/forgot-password").contentType("application/json").content("{\"email\":\"student@coreplatform.dev\"}")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String unknown=mvc.perform(post("/api/v1/auth/forgot-password").contentType("application/json").content("{\"email\":\"unknown@coreplatform.dev\"}")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertEquals(existing,unknown);
        String raw=token("student@coreplatform.dev");
        String body=json.writeValueAsString(Map.of("token",raw,"password","changed123"));
        mvc.perform(post("/api/v1/auth/email-link").contentType("application/json").content(body)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/me").header("Authorization",student)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/email-link").contentType("application/json").content(body)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/auth/forgot-password").contentType("application/json").content("{\"email\":\"faculty@coreplatform.dev\"}")).andExpect(status().isOk());
        raw=token("faculty@coreplatform.dev"); db.update("UPDATE email_tokens SET expires_at=?",Timestamp.from(Instant.now().minusSeconds(1)));
        mvc.perform(post("/api/v1/auth/email-link").contentType("application/json").content(json.writeValueAsString(Map.of("token",raw,"password","changed123")))).andExpect(status().isBadRequest());
    }
    @Test void profileDirectoryPrivacyAndPagination() throws Exception {
        String student=login("student"),admin=login("admin");
        mvc.perform(patch("/api/v1/me").header("Authorization",student).contentType("application/json").content("{\"preferred_name\":\"Emma\",\"phone\":\"+380670000000\",\"email_preferences\":{\"messages\":false}}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.preferred_name").value("Emma")).andExpect(jsonPath("$.permissions").isArray()).andExpect(jsonPath("$.modules").isArray());
        mvc.perform(patch("/api/v1/me").header("Authorization",student).contentType("application/json").content("{\"role\":\"Administrator\"}")).andExpect(status().isUnprocessableEntity());
        mvc.perform(get("/api/v1/users").header("Authorization",student)).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(3))
            .andExpect(jsonPath("$.items[0].status").doesNotExist()).andExpect(jsonPath("$.items[0].password_hash").doesNotExist());
        mvc.perform(get("/api/v1/users").header("Authorization",student).param("role","Student")).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/v1/users").header("Authorization",admin).param("department","Computer Science").param("size","1")).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
        mvc.perform(get("/api/v1/users").header("Authorization",admin).param("size","101")).andExpect(status().isUnprocessableEntity());
        mvc.perform(get("/api/v1/users").header("Authorization",student).param("q","%")).andExpect(jsonPath("$.total").value(0));
    }
    @Test void invitationsAndSisAreScopedAndIdempotent() throws Exception {
        String operator=login("staff");
        String body="{\"name\":\"SIS Student\",\"email\":\"synced@example.edu\",\"role\":\"Student\",\"department\":\"CS\"}";
        mvc.perform(post("/api/v1/users").contentType("application/json").content(body)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/users").header("X-Module-Key","bad").contentType("application/json").content(body)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/users").header("X-Module-Key","test-lms-key").contentType("application/json").content(body)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/users").header("X-Module-Key","test-sis-key").contentType("application/json").content(body)).andExpect(status().isOk());
        mvc.perform(post("/api/v1/users").header("X-Module-Key","test-sis-key").contentType("application/json").content(body)).andExpect(status().isOk());
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM users WHERE email='synced@example.edu'",Integer.class));
        assertEquals(1,db.queryForObject("SELECT COUNT(*) FROM email_outbox WHERE recipient='synced@example.edu'",Integer.class));
        String oldHash=db.queryForObject("SELECT password_hash FROM users WHERE id=?",String.class,id("applicant"));
        mvc.perform(post("/api/v1/users").header("X-Module-Key","test-sis-key").contentType("application/json").content(body.replace("synced@example.edu","applicant@coreplatform.dev"))).andExpect(jsonPath("$.role").value("Student"));
        assertEquals(oldHash,db.queryForObject("SELECT password_hash FROM users WHERE id=?",String.class,id("applicant")));
        mvc.perform(post("/api/v1/users").header("Authorization",operator).contentType("application/json").content(body.replace("synced@example.edu","invited@example.edu"))).andExpect(status().isCreated());
        String invite=token("invited@example.edu");
        mvc.perform(post("/api/v1/auth/email-link").contentType("application/json").content(json.writeValueAsString(Map.of("token",invite,"password","secret123")))).andExpect(status().isOk());
        assertEquals("Active",db.queryForObject("SELECT status FROM users WHERE email='invited@example.edu'",String.class));
        mvc.perform(post("/api/v1/users").header("Authorization",operator).contentType("application/json").content(body.replace("Student","Administrator").replace("synced@example.edu","escalated@example.edu"))).andExpect(status().isForbidden());
    }
    @Test void notificationsArePrivateAndHonorEmailPreferences() throws Exception {
        String student=login("student"),faculty=login("faculty");
        mvc.perform(patch("/api/v1/me").header("Authorization",student).contentType("application/json").content("{\"email_preferences\":{\"grades\":false}}")).andExpect(status().isOk());
        String body=json.writeValueAsString(Map.of("title","Grade posted","text","View LMS","category","grades","user_ids",List.of(id("student")),"channel","both"));
        mvc.perform(post("/api/v1/notifications").header("X-Module-Key","test-lms-key").contentType("application/json").content(body)).andExpect(status().isCreated());
        assertEquals(0,db.queryForObject("SELECT COUNT(*) FROM email_outbox",Integer.class));
        mvc.perform(get("/api/v1/notifications").header("Authorization",student)).andExpect(jsonPath("$.unread_count").value(1));
        long notice=db.queryForObject("SELECT id FROM notifications",Long.class);
        mvc.perform(post("/api/v1/notifications/read").header("Authorization",faculty).contentType("application/json").content("{\"ids\":["+notice+"]}")).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/notifications").header("Authorization",student)).andExpect(jsonPath("$.unread_count").value(1));
        mvc.perform(post("/api/v1/notifications/read").header("Authorization",student).contentType("application/json").content("{\"ids\":[]}")).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/notifications").header("Authorization",student)).andExpect(jsonPath("$.unread_count").value(0));
        mvc.perform(post("/api/v1/notifications").header("Authorization",faculty).contentType("application/json").content(body)).andExpect(status().isForbidden());
    }
    @Test void messagingDoesNotExposeForeignConversations() throws Exception {
        String student=login("student"),faculty=login("faculty"),staff=login("staff");
        String body=json.writeValueAsString(Map.of("recipient_id",id("faculty"),"text","Hello"));
        String response=mvc.perform(post("/api/v1/messages").header("Authorization",student).contentType("application/json").content(body)).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString();
        long conversation=json.readTree(response).get("conversation_id").asLong();
        mvc.perform(get("/api/v1/conversations").header("Authorization",faculty)).andExpect(jsonPath("$.items[0].messages[0].text").value("Hello"));
        mvc.perform(get("/api/v1/conversations/"+conversation+"/messages").header("Authorization",staff)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/messages").header("Authorization",staff).contentType("application/json").content(json.writeValueAsString(Map.of("conversation_id",conversation,"text","Intrusion")))).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/messages").header("Authorization",student).contentType("application/json").content(json.writeValueAsString(Map.of("recipient_id",id("applicant"),"text","Forbidden")))).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/messages").header("Authorization",faculty).contentType("application/json").content(json.writeValueAsString(Map.of("conversation_id",conversation,"text","Reply")))).andExpect(status().isCreated());
    }
    @Test void settingsValidationModuleSwitchAndTimeout() throws Exception {
        String admin=login("admin"),student=login("student");
        var initial=json.readTree(mvc.perform(get("/api/v1/admin/settings").header("Authorization",admin)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        ObjectNode update=json.createObjectNode(); update.set("settings",initial.get("settings").deepCopy());
        ArrayNode modules=update.putArray("modules"),roles=update.putArray("roles");
        for(var m:initial.get("modules")) modules.addObject().put("code",m.get("code").asText()).put("enabled",!m.get("code").asText().equals("admissions"));
        for(var r:initial.get("roles")) { var value=roles.addObject().put("code",r.get("code").asText()); value.set("permissions",r.get("permissions").deepCopy()); }
        ((ObjectNode)update.get("settings")).put("min_password_length",4);
        mvc.perform(put("/api/v1/admin/settings").header("Authorization",admin).contentType("application/json").content(json.writeValueAsString(update))).andExpect(status().isUnprocessableEntity());
        assertTrue(db.queryForObject("SELECT enabled FROM connected_modules WHERE code='admissions'",Boolean.class));
        ((ObjectNode)update.get("settings")).put("min_password_length",8).put("session_timeout",20);
        mvc.perform(put("/api/v1/admin/settings").header("Authorization",admin).contentType("application/json").content(json.writeValueAsString(update))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/modules/admissions/health").header("Authorization",admin)).andExpect(status().isServiceUnavailable());
        mvc.perform(get("/api/v1/me").header("Authorization",login("applicant"))).andExpect(jsonPath("$.modules.length()").value(0));
        db.update("UPDATE auth_sessions SET last_activity_at=? WHERE user_id=?",Timestamp.from(Instant.now().minusSeconds(21*60)),id("student"));
        mvc.perform(get("/api/v1/me").header("Authorization",student)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/admin/settings").header("Authorization",login("viewer"))).andExpect(status().isForbidden());
    }
    @Test void auditCsvFiltersAndMissingReportData() throws Exception {
        String admin=login("admin");
        db.update("INSERT INTO audit_entries(actor,action,target,success) VALUES('=1+1','Test action','value,with,commas',FALSE)");
        mvc.perform(get("/api/v1/admin/audit").header("Authorization",admin).param("action","Test action").param("result","Failed"))
            .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/admin/audit").header("Authorization",admin).param("action","Test action").param("format","csv"))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("\"'=1+1\"")));
        mvc.perform(get("/api/v1/reports").header("Authorization",admin).param("period","Fall 2026"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.rows.length()").value(0)).andExpect(jsonPath("$.missing_modules.length()").value(4));
        mvc.perform(get("/api/v1/reports").header("Authorization",login("faculty")).param("period","Fall 2026"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.scope").value("own_courses")).andExpect(jsonPath("$.missing_modules.length()").value(1));
        mvc.perform(get("/api/v1/reports").header("Authorization",login("student")).param("period","Fall 2026")).andExpect(status().isForbidden());
    }
    @Test void smtpFailureIsRetriedWithoutLosingNotification() {
        org.mockito.Mockito.doThrow(new org.springframework.mail.MailSendException("Unavailable")).when(mail).send(org.mockito.ArgumentMatchers.any(org.springframework.mail.SimpleMailMessage.class));
        email.enqueue("student@coreplatform.dev","Test","Test body");
        email.deliver();
        assertEquals(1,db.queryForObject("SELECT attempts FROM email_outbox",Integer.class));
        assertNull(db.queryForObject("SELECT sent_at FROM email_outbox",Timestamp.class));
        org.mockito.Mockito.doNothing().when(mail).send(org.mockito.ArgumentMatchers.any(org.springframework.mail.SimpleMailMessage.class));
        db.update("UPDATE email_outbox SET next_attempt_at=?",Timestamp.from(Instant.now().minusSeconds(1)));
        email.deliver();
        assertNotNull(db.queryForObject("SELECT sent_at FROM email_outbox",Timestamp.class));
    }
    @Test void permissionChangesApplyToExistingSessionsAndSettingsRoundTrip() throws Exception {
        String admin=login("admin"),operator=login("staff"),student=login("student");
        String original=mvc.perform(get("/api/v1/admin/settings").header("Authorization",admin)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        ObjectNode changed=(ObjectNode)json.readTree(original);
        for(var role:changed.withArray("roles")) if(role.get("code").asText().equals("Operator")) {
            var permissions=(ArrayNode)role.get("permissions");
            for(int i=permissions.size()-1;i>=0;i--) if(permissions.get(i).asText().equals("users.edit")) permissions.remove(i);
        }
        for(var role:changed.withArray("roles")) if(role.get("code").asText().equals("Student")) {
            var permissions=(ArrayNode)role.get("permissions");
            for(int i=permissions.size()-1;i>=0;i--) if(permissions.get(i).asText().equals("modules.lms")) permissions.remove(i);
        }
        try {
            mvc.perform(put("/api/v1/admin/settings").header("Authorization",admin).contentType("application/json").content(json.writeValueAsString(changed))).andExpect(status().isOk());
            mvc.perform(patch("/api/v1/users/"+id("student")).header("Authorization",operator).contentType("application/json").content("{\"department\":\"Updated\"}")).andExpect(status().isForbidden());
            mvc.perform(get("/api/v1/roles").header("X-Module-Key","test-lms-key")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(7));
            mvc.perform(get("/api/v1/modules/lms/health").header("Authorization",student)).andExpect(status().isForbidden());
        } finally {
            mvc.perform(put("/api/v1/admin/settings").header("Authorization",admin).contentType("application/json").content(original)).andExpect(status().isOk());
        }
    }
    @Test void boundedRequestsAndDocumentedSecuritySchemes() throws Exception {
        mvc.perform(post("/api/v1/users").contentType("application/json").content(new byte[1048577])).andExpect(status().isPayloadTooLarge()).andExpect(jsonPath("$.detail").exists());
        mvc.perform(get("/v3/api-docs")).andExpect(status().isOk()).andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer")).andExpect(jsonPath("$.components.securitySchemes.moduleKey.name").value("X-Module-Key"));
    }
    @Test void unhealthyModuleAlertsAreRecordedOnlyOnTransitions() throws Exception {
        monitoring.checkAll();
        assertEquals(4,db.queryForObject("SELECT COUNT(*) FROM service_status WHERE state='Down'",Integer.class));
        int notices=db.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id=? AND category='system'",Integer.class,id("admin"));
        assertEquals(4,notices);
        monitoring.checkAll();
        assertEquals(notices,db.queryForObject("SELECT COUNT(*) FROM notifications WHERE user_id=? AND category='system'",Integer.class,id("admin")));
        mvc.perform(get("/api/v1/admin/dashboard").header("Authorization",login("admin"))).andExpect(jsonPath("$.services.length()").value(5));
    }
}

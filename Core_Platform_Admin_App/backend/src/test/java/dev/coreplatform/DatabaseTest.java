package dev.coreplatform;

import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import static org.junit.jupiter.api.Assertions.*;

class DatabaseTest {
    JdbcTemplate database() {
        var source = new DriverManagerDataSource("jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        Flyway.configure().dataSource(source).load().migrate();
        return new JdbcTemplate(source);
    }
    @Test void constraintsAndRepositorySearch() {
        var db = database();
        var users = new JdbcUserRepository(db);
        users.create("Alice", "alice@test.edu", "Faculty", null, "CS", "hash", "Active");
        assertEquals(1, users.search("ALICE", "Faculty", "Active").size());
        assertTrue(users.search("Alice", "Student", "").isEmpty());
        assertTrue(users.search("' OR 1=1 --", "", "").isEmpty());
        assertThrows(DataIntegrityViolationException.class, () -> users.create("Duplicate", "alice@test.edu", "Faculty", null, "", "hash", "Active"));
        assertThrows(DataIntegrityViolationException.class, () -> users.create("Invalid", "role@test.edu", "Unknown", null, "", "hash", "Active"));
        assertThrows(DataIntegrityViolationException.class, () -> users.create("Invalid", "access@test.edu", "Student", "Operator", "", "hash", "Active"));
        assertThrows(DataIntegrityViolationException.class, () -> users.create("Invalid", "status@test.edu", "Student", null, "", "hash", "Unknown"));
        assertEquals(1, users.countAll());
    }
    @Test void accountAndAuditWritesRollBackTogether() {
        var db = database();
        var users = new JdbcUserRepository(db);
        var audit = new JdbcAuditRepository(db);
        var tx = new TransactionTemplate(new DataSourceTransactionManager(db.getDataSource()));
        assertThrows(IllegalStateException.class, () -> tx.execute(status -> {
            users.create("Alice", "alice@test.edu", "Faculty", null, "CS", "hash", "Active");
            audit.append("admin@test.edu", "Created user", "alice@test.edu", true);
            throw new IllegalStateException("Simulated failure before commit");
        }));
        assertEquals(0, users.countAll());
        assertTrue(audit.latest(10).isEmpty());
    }
    @Test void migrationUpgradePreservesExistingAccountsAndCanRestart() {
        var source = new DriverManagerDataSource("jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        Flyway.configure().dataSource(source).target("1").load().migrate();
        var users = new JdbcUserRepository(new JdbcTemplate(source));
        users.create("Alice", "alice@test.edu", "Faculty", null, "CS", "original-hash", "Active");
        var flyway = Flyway.configure().dataSource(source).load();
        flyway.migrate();
        assertEquals("original-hash", users.findByEmail("alice@test.edu").get("password_hash"));
        assertEquals(0, flyway.migrate().migrationsExecuted);
        assertTrue(flyway.validateWithResult().validationSuccessful);
    }
    @Test void legacySchemaCanBeExplicitlyBaselinedWithoutLosingData() {
        var source = new DriverManagerDataSource("jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        var db = new JdbcTemplate(source);
        new org.springframework.jdbc.datasource.init.ResourceDatabasePopulator(
            new org.springframework.core.io.ClassPathResource("db/migration/V1__initial_accounts_and_audit.sql")).execute(source);
        var users = new JdbcUserRepository(db);
        users.create("Legacy", "legacy@test.edu", "Student", null, "CS", "old-hash", "Active");
        Flyway.configure().dataSource(source).baselineOnMigrate(true).baselineVersion("0").load().migrate();
        assertEquals("old-hash", users.findByEmail("legacy@test.edu").get("password_hash"));
    }
}

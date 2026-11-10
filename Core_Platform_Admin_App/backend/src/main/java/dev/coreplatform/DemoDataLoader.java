package dev.coreplatform;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class DemoDataLoader implements CommandLineRunner {
    private final UserRepository users;
    private final BCryptPasswordEncoder passwords;
    private final boolean enabled;
    public DemoDataLoader(UserRepository users, BCryptPasswordEncoder passwords, @Value("${app.seed-demo}") String enabled) {
        this.users = users; this.passwords = passwords; this.enabled = enabled.equals("1");
    }
    @Override @Transactional
    public void run(String... args) {
        if (!enabled || users.countAll() > 0) return;
        String[][] rows={
            {"Mykhailo Naumenko","admin","Administrator",null,"IT Services","admin123"},
            {"Emma Johnson","student","Student",null,"Software Engineering","student123"},
            {"Dr. Daniel Reed","faculty","Faculty",null,"Computer Science","faculty123"},
            {"Yaroslav Kalinichenko","staff","Staff","Operator","IT Help Desk","staff123"},
            {"Olivia Martin","viewer","Staff","Viewer","Dean's Office","viewer123"},
            {"Alex Morgan","applicant","Applicant",null,"Admissions","applicant123"}};
        for(var r:rows) users.create(r[0],r[1]+"@coreplatform.dev",r[2],r[3],r[4],passwords.encode(r[5]),"Active");
    }
}

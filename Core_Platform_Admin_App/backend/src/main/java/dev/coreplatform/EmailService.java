package dev.coreplatform;

import java.sql.Timestamp;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Transactional outbox: account/notification writes never depend on a live SMTP connection. */
@Service
public class EmailService {
    private final PlatformRepository db;
    private final JavaMailSender mail;
    private final Clock clock;
    private final boolean enabled;
    public EmailService(PlatformRepository db,JavaMailSender mail,Clock clock,@Value("${app.mail-enabled:false}") boolean enabled) {
        this.db=db; this.mail=mail; this.clock=clock; this.enabled=enabled;
    }
    public void enqueue(String to,String subject,String body) {
        db.write("INSERT INTO email_outbox(recipient,subject,body) VALUES(?,?,?)",to,subject,body);
    }
    @Scheduled(fixedDelayString="${app.mail-poll-ms:10000}",initialDelayString="${app.mail-initial-ms:1000}")
    @Transactional
    public void deliver() {
        if(!enabled) return;
        // Locks prevent two application instances from delivering the same queue item concurrently.
        for(var row:db.rows("SELECT * FROM email_outbox WHERE sent_at IS NULL AND next_attempt_at<=? ORDER BY id LIMIT 20 FOR UPDATE SKIP LOCKED",Timestamp.from(clock.instant()))) {
            long id=PlatformRepository.id(row);
            try {
                var m=new SimpleMailMessage();
                m.setFrom((String)db.one("SELECT email_sender FROM platform_settings WHERE id=1").get("email_sender"));
                m.setTo((String)row.get("recipient")); m.setSubject((String)row.get("subject")); m.setText((String)row.get("body"));
                mail.send(m);
                db.write("UPDATE email_outbox SET sent_at=? WHERE id=?",Timestamp.from(clock.instant()),id);
            } catch(org.springframework.mail.MailException e) {
                int attempt=((Number)row.get("attempts")).intValue()+1;
                db.write("UPDATE email_outbox SET attempts=?,next_attempt_at=? WHERE id=?",attempt,Timestamp.from(clock.instant().plusSeconds(Math.min(3600,30L*(1L<<Math.min(attempt,7))))),id);
            }
        }
        db.write("INSERT INTO worker_heartbeats(worker,checked_at) VALUES('email',?) ON DUPLICATE KEY UPDATE checked_at=VALUES(checked_at)",Timestamp.from(clock.instant()));
    }
}

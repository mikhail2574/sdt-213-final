package dev.coreplatform;

import java.nio.charset.StandardCharsets;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY;

@Service
public class PasswordPolicy {
    private final PlatformRepository db;
    public PasswordPolicy(PlatformRepository db) { this.db=db; }
    public void validate(String value) {
        int min=((Number)db.one("SELECT min_password_length FROM platform_settings WHERE id=1").get("min_password_length")).intValue();
        if(value==null || value.length()<min || value.getBytes(StandardCharsets.UTF_8).length>72 ||
            !value.codePoints().anyMatch(Character::isLetter) || !value.codePoints().anyMatch(Character::isDigit))
            throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Use at least "+min+" characters, including a letter and a number, and at most 72 UTF-8 bytes");
    }
}

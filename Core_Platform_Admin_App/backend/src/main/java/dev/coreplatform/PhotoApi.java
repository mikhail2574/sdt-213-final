package dev.coreplatform;

import java.io.*;
import javax.imageio.ImageIO;
import org.springframework.http.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import static org.springframework.http.HttpStatus.*;

@RestController
@RequestMapping("/api/v1/me/photo")
public class PhotoApi {
    private final PlatformRepository db;
    private final AccessService access;
    public PhotoApi(PlatformRepository db,AccessService access) { this.db=db; this.access=access; }
    @PostMapping(consumes={"image/png","image/jpeg"})
    @Transactional
    public java.util.Map<String,String> upload(@AuthenticationPrincipal Jwt jwt,@RequestBody byte[] body) throws IOException {
        long id=PlatformRepository.id(access.actor(jwt));
        String type;
        try(var input=ImageIO.createImageInputStream(new ByteArrayInputStream(body))) {
            var readers=ImageIO.getImageReaders(input);
            if(!readers.hasNext()) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Use a PNG or JPEG image");
            var reader=readers.next();
            try {
                reader.setInput(input); String format=reader.getFormatName().toLowerCase(java.util.Locale.ROOT);
                if(!java.util.Set.of("png","jpeg","jpg").contains(format) || reader.getWidth(0)>4096 || reader.getHeight(0)>4096) throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Use a PNG or JPEG up to 4096 pixels per side");
                type=format.equals("png")?"image/png":"image/jpeg";
            } finally { reader.dispose(); }
        } catch(javax.imageio.IIOException e) { throw new ResponseStatusException(UNPROCESSABLE_ENTITY,"Image is invalid"); }
        db.one("SELECT id FROM users WHERE id=? FOR UPDATE",id);
        db.write("DELETE FROM user_photos WHERE user_id=?",id);
        db.write("INSERT INTO user_photos VALUES(?,?,?)",id,type,body);
        db.write("UPDATE users SET photo_url='/api/v1/me/photo' WHERE id=?",id);
        return java.util.Map.of("photo_url","/api/v1/me/photo");
    }
    @GetMapping public ResponseEntity<byte[]> read(@AuthenticationPrincipal Jwt jwt) {
        long id=PlatformRepository.id(access.actor(jwt));
        var photo=db.one("SELECT content_type,content FROM user_photos WHERE user_id=?",id);
        if(photo==null) throw new ResponseStatusException(NOT_FOUND,"No profile photo");
        Object value=photo.get("content");
        try {
            byte[] bytes=value instanceof byte[] data?data:((java.sql.Blob)value).getBytes(1,(int)((java.sql.Blob)value).length());
            return ResponseEntity.ok().header("Content-Type",photo.get("content_type").toString()).header("Cache-Control","private, no-store").header("X-Content-Type-Options","nosniff").body(bytes);
        } catch(java.sql.SQLException e) { throw new IllegalStateException(e); }
    }
}

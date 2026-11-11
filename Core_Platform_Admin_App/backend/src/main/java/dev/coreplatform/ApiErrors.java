package dev.coreplatform;
import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
@RestControllerAdvice
public class ApiErrors {
    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<?> status(ResponseStatusException e) { return ResponseEntity.status(e.getStatusCode()).body(Map.of("detail",e.getReason()==null?"Request failed":e.getReason())); }
    @ExceptionHandler(DuplicateKeyException.class)
    ResponseEntity<?> duplicate() { return ResponseEntity.status(409).body(Map.of("detail","Email is already registered")); }
    @ExceptionHandler({org.springframework.web.servlet.resource.NoResourceFoundException.class,
        org.springframework.web.HttpRequestMethodNotSupportedException.class,
        org.springframework.web.HttpMediaTypeNotSupportedException.class})
    ResponseEntity<?> http(org.springframework.web.ErrorResponse e) {
        return ResponseEntity.status(e.getStatusCode()).body(Map.of("detail",org.springframework.http.HttpStatus.valueOf(e.getStatusCode().value()).getReasonPhrase()));
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<?> unreadable(HttpMessageNotReadableException e) {
        for(Throwable cause=e;cause!=null;cause=cause.getCause()) if(cause instanceof RequestSizeFilter.LimitExceeded)
            return ResponseEntity.status(413).body(Map.of("detail","Maximum request size is 1 MB"));
        return ResponseEntity.unprocessableEntity().body(Map.of("detail","Invalid request fields"));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<?> validation(MethodArgumentNotValidException e) {
        var fields=new java.util.TreeMap<String,String>();
        for(var error:e.getBindingResult().getFieldErrors())
            fields.putIfAbsent(error.getField(),error.getDefaultMessage()==null?"Invalid value":error.getDefaultMessage());
        String detail=fields.entrySet().stream().map(f->f.getKey()+": "+f.getValue()).collect(java.util.stream.Collectors.joining("; "));
        return ResponseEntity.unprocessableEntity().body(Map.of("detail",detail.isEmpty()?"Invalid request fields":detail,"fields",fields));
    }
    @ExceptionHandler(org.springframework.web.bind.MissingServletRequestParameterException.class)
    ResponseEntity<?> missingParameter(org.springframework.web.bind.MissingServletRequestParameterException e) {
        return ResponseEntity.unprocessableEntity().body(Map.of("detail","Required parameter: "+e.getParameterName()));
    }
    @ExceptionHandler({org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
        org.springframework.web.bind.MissingRequestHeaderException.class})
    ResponseEntity<?> invalid() { return ResponseEntity.unprocessableEntity().body(Map.of("detail","Invalid request fields")); }
}

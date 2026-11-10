package dev.coreplatform;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.*;
import static org.junit.jupiter.api.Assertions.*;

class RequestSizeFilterTest {
    @Test void chunkedBodyCannotBypassStreamingLimit() throws Exception {
        var filter=new RequestSizeFilter();
        var request=new MockHttpServletRequest("POST","/api/v1/users") {
            @Override public long getContentLengthLong() { return -1; }
            @Override public int getContentLength() { return -1; }
        };
        request.setContent(new byte[RequestSizeFilter.LIMIT+1]);
        assertThrows(RequestSizeFilter.LimitExceeded.class,()->filter.doFilter(request,new MockHttpServletResponse(),(req,res)->req.getInputStream().readAllBytes()));
    }
}

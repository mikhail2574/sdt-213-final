package dev.coreplatform;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.*;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Cap API bodies even when a client uses chunked transfer without Content-Length. */
@Component
@Order(org.springframework.core.Ordered.HIGHEST_PRECEDENCE+10)
public class RequestSizeFilter extends OncePerRequestFilter {
    static final int LIMIT=1048576;
    static class LimitExceeded extends IOException {}
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        if(!request.getRequestURI().startsWith("/api/v1/")) { chain.doFilter(request,response); return; }
        if(request.getContentLengthLong()>LIMIT) {
            response.setStatus(413); response.setContentType("application/json"); response.getWriter().write("{\"detail\":\"Maximum request size is 1 MB\"}"); return;
        }
        var input=request.getInputStream();
        var bounded=new ServletInputStream() {
            long count;
            private void add(int size) throws LimitExceeded { if(size>0 && (count+=size)>LIMIT) throw new LimitExceeded(); }
            @Override public int read() throws IOException { int value=input.read(); if(value!=-1) add(1); return value; }
            @Override public int read(byte[] bytes,int offset,int length) throws IOException { int size=input.read(bytes,offset,(int)Math.min(length,LIMIT-count+1)); add(size); return size; }
            @Override public boolean isFinished() { return input.isFinished(); }
            @Override public boolean isReady() { return input.isReady(); }
            @Override public void setReadListener(ReadListener listener) { input.setReadListener(listener); }
        };
        chain.doFilter(new HttpServletRequestWrapper(request) {
            @Override public ServletInputStream getInputStream() { return bounded; }
            @Override public BufferedReader getReader() { return new BufferedReader(new InputStreamReader(bounded,java.nio.charset.StandardCharsets.UTF_8)); }
        },response);
    }
}

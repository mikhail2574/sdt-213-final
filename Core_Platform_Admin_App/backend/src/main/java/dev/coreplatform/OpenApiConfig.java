package dev.coreplatform;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.*;
import java.util.List;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.*;

@Configuration
public class OpenApiConfig {
    @Bean OpenAPI platformOpenApi() {
        return new OpenAPI().info(new Info().title("Core Platform API").version("v1"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth",new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT"))
                .addSecuritySchemes("moduleKey",new SecurityScheme().type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.HEADER).name("X-Module-Key")));
    }
    @Bean OpenApiCustomizer endpointSecurity() {
        return api->api.getPaths().forEach((path,item)->item.readOperationsMap().forEach((method,operation)->{
            if(path.equals("/api/v1/health") || List.of("/api/v1/auth/login","/api/v1/auth/register","/api/v1/auth/forgot-password","/api/v1/auth/email-link").contains(path)) operation.setSecurity(List.of());
            else if((method==io.swagger.v3.oas.models.PathItem.HttpMethod.POST && List.of("/api/v1/users","/api/v1/notifications").contains(path)) || path.equals("/api/v1/roles"))
                operation.setSecurity(List.of(new SecurityRequirement().addList("bearerAuth"),new SecurityRequirement().addList("moduleKey")));
            else operation.setSecurity(List.of(new SecurityRequirement().addList("bearerAuth")));
        }));
    }
}

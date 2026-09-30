package com.bako.backend.config;

import com.bako.backend.security.CustomUserDetailsService;
import com.bako.backend.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final CustomUserDetailsService customUserDetailsService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // JWT-based API → نیازی به CSRF نیست
                .csrf(AbstractHttpConfigurer::disable)

                // REST API → session رو نگه ندار
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                // ⭐️ مدیریت خطاها:
                //   - کاربر لاگین نیست → 401 (Unauthorized)
                //   - کاربر لاگین هست ولی اجازه نداره → 403 (Forbidden)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write(
                                    "{\"error\":\"احراز هویت لازم است. لطفاً وارد شوید.\",\"status\":401}"
                            );
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.setCharacterEncoding("UTF-8");
                            response.getWriter().write(
                                    "{\"error\":\"شما به این بخش دسترسی ندارید.\",\"status\":403}"
                            );
                        })
                )

                .authorizeHttpRequests(auth -> auth

                        // ============================================================
                        //  1. عمومی — بدون نیاز به توکن
                        // ============================================================
                        .requestMatchers(
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/select-role"
                        ).permitAll()

                        .requestMatchers(
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/swagger-resources/**",
                                "/webjars/**"
                        ).permitAll()

                        // دیدن نانوایی‌ها و محصولات — حتی قبل از لاگین
                        .requestMatchers(HttpMethod.GET,
                                "/api/bakeries/**",
                                "/api/public/bakeries/**"
                        ).permitAll()

                        .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()

                        // ============================================================
                        //  2. SUPER_ADMIN — بالاترین سطح
                        // ============================================================
                        .requestMatchers("/api/super-admin/**").hasRole("SUPER_ADMIN")
                        .requestMatchers("/api/users/**").hasRole("SUPER_ADMIN")
                        .requestMatchers("/api/admin/tenants/**").hasRole("SUPER_ADMIN")
                        .requestMatchers("/actuator/**").hasRole("SUPER_ADMIN")

                        // ============================================================
                        //  3. MONITOR — نظارتی
                        // ============================================================
                        .requestMatchers(HttpMethod.GET, "/api/monitoring/**")
                        .hasAnyRole("MONITOR", "SUPER_ADMIN")

                        // ============================================================
                        //  4. BAKERY_OWNER + STAFF
                        // ============================================================
                        .requestMatchers("/api/couriers/**")
                        .hasAnyRole("BAKERY_OWNER", "STAFF")

                        // ⚠️ استثنا: payment-config نانوایی
                        .requestMatchers(
                                "/api/admin/tenants/*/payment-config",
                                "/api/admin/tenants/*/payment-config/test"
                        ).hasRole("BAKERY_OWNER")

                        // ============================================================
                        //  5. CUSTOMER — بخش مشتری
                        // ============================================================
                        .requestMatchers("/api/cart/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/addresses/**").hasRole("CUSTOMER")

                        // ============================================================
                        //  6. مشترک — فقط لاگین شده
                        // ============================================================
                        .requestMatchers("/api/auth/my-roles").authenticated()
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers("/api/orders/**")
                        .hasAnyRole("CUSTOMER", "BAKERY_OWNER", "STAFF")

                        // ============================================================
                        //  7. باقی — هر کاربر لاگین‌شده
                        // ============================================================
                        .anyRequest().authenticated()
                )

                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(customUserDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }
}
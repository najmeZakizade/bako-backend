package com.bako.backend.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "users")
public class User implements UserDetails {

    @Id
    private String id;

    private String tenantId;

    @NotBlank(message = "نام کاربری الزامی است.")
    @Size(min = 3, max = 50, message = "نام کاربری باید بین ۳ تا ۵۰ کاراکتر باشد.")
    private String username;

    @NotBlank(message = "رمز عبور الزامی است.")
    @Size(min = 6, message = "رمز عبور باید حداقل ۶ کاراکتر باشد.")
    private String password;

    @NotBlank(message = "نقش کاربری الزامی است.")
    private String role;

    // ============================================================
    //  لیست نقش‌های قابل دسترسی برای این کاربر
    // ============================================================
    private List<String> availableRoles = new ArrayList<>();

    private String fullName;
    private String phone;
    private String email;
    private boolean enabled = true;

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return enabled;
    }
}
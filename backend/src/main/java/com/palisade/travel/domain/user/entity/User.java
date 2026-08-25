package com.palisade.travel.domain.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

import java.time.LocalDateTime;

@Entity
@Getter
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "login_id", nullable = false, unique = true, length = 100)
    private String loginId;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(name = "phone_number", length = 20)
    private String phoneNumber;

    @Column(name = "parent_number", length = 20)
    private String parentNumber;

    @Column(nullable = false)
    private boolean enabled;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    protected User() {
    }

    public User(Long id, String loginId, String passwordHash, String email, String name, UserRole role,
                String phoneNumber, String parentNumber, boolean enabled, LocalDateTime createdAt) {
        this.id = id;
        this.loginId = loginId;
        this.passwordHash = passwordHash;
        this.email = email;
        this.name = name;
        this.role = role;
        this.phoneNumber = phoneNumber;
        this.parentNumber = parentNumber;
        this.enabled = enabled;
        this.createdAt = createdAt;
    }
}

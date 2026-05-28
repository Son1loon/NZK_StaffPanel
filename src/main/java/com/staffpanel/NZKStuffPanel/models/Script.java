package com.staffpanel.NZKStuffPanel.models;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "scripts")
public class Script {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private String googleDocUrl;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "script_assignees",
            joinColumns = @JoinColumn(name = "script_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> assignees = new HashSet<>();

    @Column(name = "created_by")
    private String createdBy;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private String status = "ACTIVE";

    public Script() {
        this.createdAt = LocalDateTime.now();
    }

    // Геттеры и сеттеры
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getGoogleDocUrl() { return googleDocUrl; }
    public void setGoogleDocUrl(String googleDocUrl) { this.googleDocUrl = googleDocUrl; }

    public Set<User> getAssignees() { return assignees; }
    public void setAssignees(Set<User> assignees) { this.assignees = assignees; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
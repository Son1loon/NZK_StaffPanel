package com.staffpanel.NZKStuffPanel.repository;

import com.staffpanel.NZKStuffPanel.models.Idea;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface IdeaRepository extends JpaRepository<Idea, Long> {
    List<Idea> findByStatus(String status);
    long countByTypeAndStatus(String type, String status);
    long countByStatus(String status);
    Page<Idea> findByStatus(String status, Pageable pageable);
    List<Idea> findByStatusAndCreatedAtBefore(String status, LocalDateTime date);
}
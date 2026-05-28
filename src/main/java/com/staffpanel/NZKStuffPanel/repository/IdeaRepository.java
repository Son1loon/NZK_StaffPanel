package com.staffpanel.NZKStuffPanel.repository;

import com.staffpanel.NZKStuffPanel.models.Idea;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface IdeaRepository extends JpaRepository<Idea, Long> {
    List<Idea> findByStatus(String status);
    long countByTypeAndStatus(String type, String status);
    long countByStatus(String status);
}
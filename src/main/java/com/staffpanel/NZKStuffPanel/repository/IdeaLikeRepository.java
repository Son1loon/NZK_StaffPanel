package com.staffpanel.NZKStuffPanel.repository;

import com.staffpanel.NZKStuffPanel.models.IdeaLike;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

@Repository
public interface IdeaLikeRepository extends JpaRepository<IdeaLike, Long> {
    boolean existsByIdeaIdAndUserId(Long ideaId, Long userId);
    // В IdeaLikeRepository.java добавь:
    @Modifying
    @Transactional
    void deleteByIdeaIdAndUserId(Long ideaId, Long userId);

    @Modifying
    @Transactional
    void deleteByIdeaId(Long ideaId);
}
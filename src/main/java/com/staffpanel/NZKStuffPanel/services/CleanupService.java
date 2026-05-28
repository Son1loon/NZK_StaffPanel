package com.staffpanel.NZKStuffPanel.services;

import com.staffpanel.NZKStuffPanel.models.Idea;
import com.staffpanel.NZKStuffPanel.repository.IdeaLikeRepository;
import com.staffpanel.NZKStuffPanel.repository.IdeaRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class CleanupService {

    @Autowired
    private IdeaRepository ideaRepository;

    @Autowired
    private IdeaLikeRepository ideaLikeRepository;

    // Каждый день в 3 часа ночи
    @Scheduled(cron = "0 0 3 * * ?")
    @Transactional
    public void cleanupOldRejectedIdeas() {
        LocalDateTime thirtyDaysAgo = LocalDateTime.now().minusDays(30);
        List<Idea> oldRejected = ideaRepository.findByStatusAndCreatedAtBefore("REJECTED", thirtyDaysAgo);

        for (Idea idea : oldRejected) {
            ideaLikeRepository.deleteByIdeaId(idea.getId());
            ideaRepository.delete(idea);
        }

        System.out.println("Очищено старых идей: " + oldRejected.size());
    }
}
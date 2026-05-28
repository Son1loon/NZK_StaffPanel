package com.staffpanel.NZKStuffPanel.services;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MemoryOptimizer {

    @Scheduled(fixedRate = 300000) // каждые 5 минут
    public void optimizeMemory() {
        System.gc();
        System.out.println("🧹 GC вызван, свободно памяти: " +
                (Runtime.getRuntime().freeMemory() / 1024 / 1024) + " MB");
    }
}
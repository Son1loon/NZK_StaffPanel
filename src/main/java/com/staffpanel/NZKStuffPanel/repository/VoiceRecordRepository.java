package com.staffpanel.NZKStuffPanel.repository;

import com.staffpanel.NZKStuffPanel.models.VoiceRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface VoiceRecordRepository extends JpaRepository<VoiceRecord, Long> {
    List<VoiceRecord> findByCharacterId(Long characterId);
    List<VoiceRecord> findByVoiceActor(String voiceActor);
}
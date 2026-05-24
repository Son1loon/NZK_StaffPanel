package com.staffpanel.NZKStuffPanel.repository;

import com.staffpanel.NZKStuffPanel.models.RegistrationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RegistrationRequestRepository extends JpaRepository<RegistrationRequest, Long> {
    List<RegistrationRequest> findByStatus(String status);
    boolean existsByUsernameAndStatus(String username, String status);
}
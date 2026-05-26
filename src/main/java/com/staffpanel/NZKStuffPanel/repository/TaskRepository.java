package com.staffpanel.NZKStuffPanel.repository;

import com.staffpanel.NZKStuffPanel.models.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByAssignee(String assignee);
    List<Task> findByAssigneeAndStatus(String assignee, String status);
    long countByAssigneeAndStatus(String assignee, String status);
}
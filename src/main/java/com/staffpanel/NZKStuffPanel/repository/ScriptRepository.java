package com.staffpanel.NZKStuffPanel.repository;

import com.staffpanel.NZKStuffPanel.models.Script;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ScriptRepository extends JpaRepository<Script, Long> {

    @Query("SELECT s FROM Script s JOIN s.assignees a WHERE a.username = :username")
    List<Script> findByAssigneeUsername(@Param("username") String username);

    List<Script> findByStatus(String status);
}
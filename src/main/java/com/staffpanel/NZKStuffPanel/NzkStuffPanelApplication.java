package com.staffpanel.NZKStuffPanel;

import com.staffpanel.NZKStuffPanel.models.Role;
import com.staffpanel.NZKStuffPanel.models.User;
import com.staffpanel.NZKStuffPanel.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Set;

@SpringBootApplication
@EnableScheduling
public class NzkStuffPanelApplication {

	public static void main(String[] args) {
		SpringApplication.run(NzkStuffPanelApplication.class, args);
	}

	@Bean
	public CommandLineRunner initData(UserRepository userRepository, PasswordEncoder passwordEncoder) {
		return args -> {
			if (userRepository.findByUsername("FoxyClaus").isEmpty()) {
				User admin = new User();
				admin.setUsername("FoxyClaus");
				admin.setPassword(passwordEncoder.encode("0962241408@Aa"));
				admin.setRoles(Set.of(Role.ROLE_ADMIN, Role.ROLE_USER));
				userRepository.save(admin);
			}

			if (userRepository.findByUsername("KevinNZK").isEmpty()) {
				User admin = new User();
				admin.setUsername("KevinNZK");
				admin.setPassword(passwordEncoder.encode("cinematic1238"));
				admin.setRoles(Set.of(Role.ROLE_ADMIN, Role.ROLE_USER));
				userRepository.save(admin);
			}
		};
	}
}
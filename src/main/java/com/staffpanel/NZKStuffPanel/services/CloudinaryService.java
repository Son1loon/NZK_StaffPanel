package com.staffpanel.NZKStuffPanel.services;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@Service
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public CloudinaryService(
            @Value("${cloudinary.cloud-name}") String cloudName,
            @Value("${cloudinary.api-key}") String apiKey,
            @Value("${cloudinary.api-secret}") String apiSecret) {
        this.cloudinary = new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName,
                "api_key", apiKey,
                "api_secret", apiSecret
        ));
    }

    // Загрузка аватара пользователя
    public String uploadAvatar(MultipartFile file, Long userId) throws IOException {
        byte[] bytes = file.getBytes(); // забираем в память
        try {
            Map<String, Object> params = ObjectUtils.asMap(
                    "public_id", "user_" + userId,
                    "folder", "nzk_staff/avatars",
                    "overwrite", true
            );
            Map result = cloudinary.uploader().upload(bytes, params);
            return result.get("secure_url").toString();
        } finally {
            bytes = null;
            System.gc();
        }
    }

    // Загрузка аудиофайла
    public String uploadAudio(MultipartFile file, Long characterId) throws IOException {
        Map<String, Object> uploadParams = new HashMap<>();
        uploadParams.put("folder", "nzk_staff/voice_records");
        uploadParams.put("public_id", "character_" + characterId + "_" + System.currentTimeMillis());
        uploadParams.put("resource_type", "video");

        Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), uploadParams);
        return (String) uploadResult.get("secure_url");
    }

    // Загрузка изображения для персонажа
    public String uploadCharacterImage(MultipartFile file) throws IOException {
        Map<String, Object> uploadParams = new HashMap<>();
        uploadParams.put("folder", "nzk_staff/characters");
        uploadParams.put("public_id", "character_" + System.currentTimeMillis());

        Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), uploadParams);
        return (String) uploadResult.get("secure_url");
    }

    // ========== УДАЛЕНИЕ ФАЙЛОВ ==========

    // Удаление файла по URL (автоматически определяет тип)
    public void deleteFileByUrl(String url) {
        if (url == null || url.isEmpty()) return;

        String publicId = extractPublicIdFromUrl(url);
        if (publicId != null) {
            deleteFileByPublicId(publicId, url);
        }
    }

    // Удаление файла по publicId с определением типа
    private void deleteFileByPublicId(String publicId, String originalUrl) {
        if (publicId == null || publicId.isEmpty()) return;

        // Определяем тип файла по URL
        boolean isAudioOrVideo = originalUrl.contains("/video/") ||
                originalUrl.endsWith(".mp3") ||
                originalUrl.endsWith(".wav") ||
                originalUrl.endsWith(".ogg");

        try {
            Map<String, Object> params = new HashMap<>();
            if (isAudioOrVideo) {
                params.put("resource_type", "video");
                System.out.println("Удаляем аудио/видео файл: " + publicId);
            } else {
                System.out.println("Удаляем изображение: " + publicId);
            }

            cloudinary.uploader().destroy(publicId, params);
            System.out.println("✅ Файл успешно удалён: " + publicId);

        } catch (Exception e) {
            System.err.println("❌ Ошибка удаления файла " + publicId + ": " + e.getMessage());
        }
    }

    // Извлечение publicId из URL Cloudinary
    public String extractPublicIdFromUrl(String url) {
        if (url == null || url.isEmpty()) return null;

        try {
            // Ищем "/upload/"
            int uploadIndex = url.indexOf("/upload/");
            if (uploadIndex == -1) return null;

            String afterUpload = url.substring(uploadIndex + 8);

            // Убираем версию (v1234567890/)
            if (afterUpload.startsWith("v")) {
                int slashIndex = afterUpload.indexOf("/");
                if (slashIndex > 0) {
                    afterUpload = afterUpload.substring(slashIndex + 1);
                }
            }

            // Убираем расширение файла
            int dotIndex = afterUpload.lastIndexOf(".");
            if (dotIndex > 0) {
                afterUpload = afterUpload.substring(0, dotIndex);
            }

            return afterUpload;
        } catch (Exception e) {
            System.err.println("Ошибка извлечения publicId: " + e.getMessage());
            return null;
        }
    }

    // Для совместимости со старым кодом
    public String getPublicIdFromUrl(String url) {
        return extractPublicIdFromUrl(url);
    }

}
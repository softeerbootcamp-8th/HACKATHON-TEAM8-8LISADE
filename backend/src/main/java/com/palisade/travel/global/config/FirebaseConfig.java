package com.palisade.travel.global.config;

import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.DefaultResourceLoader;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;

@Component
public class FirebaseConfig {

    private static final Logger log = LoggerFactory.getLogger(FirebaseConfig.class);

    private final String credentialsPath;
    private final ResourceLoader resourceLoader = new DefaultResourceLoader();

    public FirebaseConfig(@Value("${firebase.credentials-path:}") String credentialsPath) {
        this.credentialsPath = credentialsPath;
    }

    @PostConstruct
    public void initialize() {
        if (credentialsPath == null || credentialsPath.isBlank()) {
            log.warn("firebase.credentials-path is not set; FCM push sending is disabled.");
            return;
        }
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }
        Resource resource = resourceLoader.getResource(credentialsPath);
        try (InputStream serviceAccount = resource.getInputStream()) {
            // Apache HttpClient is on the classpath (via other deps), and google-http-client's
            // auto-detected ApacheHttpTransport double-decodes gzip responses, corrupting them.
            // Forcing NetHttpTransport avoids that.
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .setHttpTransport(new NetHttpTransport())
                    .build();
            FirebaseApp.initializeApp(options);
            log.info("Firebase Admin initialized from credentials-path={}", credentialsPath);
        } catch (IOException e) {
            log.warn("Failed to initialize Firebase from credentials-path={}; FCM push sending is disabled.",
                    credentialsPath, e);
        }
    }
}

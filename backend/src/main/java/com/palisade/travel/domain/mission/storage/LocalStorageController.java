package com.palisade.travel.domain.mission.storage;

import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Profile({"local", "test"})
public class LocalStorageController {

    @PutMapping("/mock-storage/{*objectKey}")
    public ResponseEntity<Void> upload() {
        return ResponseEntity.noContent().build();
    }
}

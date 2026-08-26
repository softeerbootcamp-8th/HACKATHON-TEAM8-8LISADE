package com.palisade.travel.domain.mission.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.Test;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PhotoUploadPrepareRequestTest {

    private final Validator validator;

    PhotoUploadPrepareRequestTest() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        this.validator = factory.getValidator();
    }

    @Test
    void acceptsJpeg() {
        assertThat(validator.validate(new PhotoUploadPrepareRequest("image/jpeg"))).isEmpty();
    }

    @Test
    void acceptsPng() {
        assertThat(validator.validate(new PhotoUploadPrepareRequest("image/png"))).isEmpty();
    }

    @Test
    void rejectsAnUnsupportedContentType() {
        Set<ConstraintViolation<PhotoUploadPrepareRequest>> violations = validator.validate(new PhotoUploadPrepareRequest("image/webp"));
        assertThat(violations).isNotEmpty();
    }

    @Test
    void rejectsABlankContentType() {
        Set<ConstraintViolation<PhotoUploadPrepareRequest>> violations = validator.validate(new PhotoUploadPrepareRequest(""));
        assertThat(violations).isNotEmpty();
    }
}

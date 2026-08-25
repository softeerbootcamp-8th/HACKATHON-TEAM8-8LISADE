package com.palisade.travel.domain.trip.service;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.SecureRandom;
import java.time.Clock;

@Configuration
public class TripConfiguration {
    private static final char[] LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".toCharArray();
    private final SecureRandom random = new SecureRandom();

    @Bean
    Clock clock() {
        return Clock.systemDefaultZone();
    }

    @Bean
    InviteCodeGenerator inviteCodeGenerator() {
        return () -> "" + LETTERS[random.nextInt(LETTERS.length)] + LETTERS[random.nextInt(LETTERS.length)]
                + String.format("%04d", random.nextInt(10_000));
    }
}

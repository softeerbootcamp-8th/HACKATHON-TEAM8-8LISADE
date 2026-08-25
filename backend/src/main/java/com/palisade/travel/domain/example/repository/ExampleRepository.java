package com.palisade.travel.domain.example.repository;

import com.palisade.travel.domain.example.entity.Example;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExampleRepository extends JpaRepository<Example, Long> {
}

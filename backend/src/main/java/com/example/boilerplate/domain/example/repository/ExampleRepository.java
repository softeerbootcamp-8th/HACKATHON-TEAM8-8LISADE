package com.example.boilerplate.domain.example.repository;

import com.example.boilerplate.domain.example.domain.Example;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExampleRepository extends JpaRepository<Example, Long> {
}

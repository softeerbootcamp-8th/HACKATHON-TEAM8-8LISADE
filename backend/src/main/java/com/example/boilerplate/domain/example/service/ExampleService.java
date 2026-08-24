package com.example.boilerplate.domain.example.service;

import com.example.boilerplate.domain.example.domain.Example;
import com.example.boilerplate.domain.example.domain.exception.ExampleNotFoundException;
import com.example.boilerplate.domain.example.dto.ExampleCreateCommand;
import com.example.boilerplate.domain.example.dto.ExampleResponse;
import com.example.boilerplate.domain.example.dto.ExampleUpdateCommand;
import com.example.boilerplate.domain.example.repository.ExampleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class ExampleService {

    private final ExampleRepository exampleRepository;

    public ExampleService(ExampleRepository exampleRepository) {
        this.exampleRepository = exampleRepository;
    }

    @Transactional
    public ExampleResponse create(ExampleCreateCommand command) {
        Example example = exampleRepository.save(Example.create(command.name()));
        return ExampleResponse.from(example);
    }

    public ExampleResponse get(Long id) {
        return ExampleResponse.from(findById(id));
    }

    public List<ExampleResponse> getAll() {
        return exampleRepository.findAll().stream()
                .map(ExampleResponse::from)
                .toList();
    }

    @Transactional
    public ExampleResponse update(Long id, ExampleUpdateCommand command) {
        Example example = findById(id);
        example.changeName(command.name());
        return ExampleResponse.from(example);
    }

    @Transactional
    public void delete(Long id) {
        exampleRepository.delete(findById(id));
    }

    private Example findById(Long id) {
        return exampleRepository.findById(id)
                .orElseThrow(ExampleNotFoundException::new);
    }
}

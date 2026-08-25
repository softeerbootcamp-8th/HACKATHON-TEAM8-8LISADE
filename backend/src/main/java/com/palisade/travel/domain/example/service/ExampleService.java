package com.palisade.travel.domain.example.service;

import com.palisade.travel.domain.example.entity.Example;
import com.palisade.travel.domain.example.exception.ExampleNotFoundException;
import com.palisade.travel.domain.example.dto.ExampleCreateRequest;
import com.palisade.travel.domain.example.dto.ExampleResponse;
import com.palisade.travel.domain.example.dto.ExampleUpdateRequest;
import com.palisade.travel.domain.example.repository.ExampleRepository;
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
    public ExampleResponse create(ExampleCreateRequest request) {
        Example example = exampleRepository.save(Example.create(request.name()));
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
    public ExampleResponse update(Long id, ExampleUpdateRequest request) {
        Example example = findById(id);
        example.changeName(request.name());
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

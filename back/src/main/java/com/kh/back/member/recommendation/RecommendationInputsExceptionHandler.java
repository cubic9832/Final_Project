package com.kh.back.member.recommendation;

import java.util.Map;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = RecommendationInputsController.class)
public class RecommendationInputsExceptionHandler {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemDetail> status(ResponseStatusException error) {
        return ResponseEntity.status(error.getStatusCode()).body(ProblemDetail.forStatusAndDetail(
                error.getStatusCode(), error.getReason() == null ? "요청을 처리할 수 없습니다." : error.getReason()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> fields(MethodArgumentNotValidException error) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "입력 항목을 확인해 주세요.");
        problem.setProperty("errors", error.getBindingResult().getFieldErrors().stream()
                .map(field -> Map.of("field", field.getField(), "message",
                        field.getDefaultMessage() == null ? "값을 확인해 주세요." : field.getDefaultMessage()))
                .toList());
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> unreadable(HttpMessageNotReadableException error) {
        return ResponseEntity.badRequest().body(ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "요청 형식을 확인해 주세요."));
    }
}

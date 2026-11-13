package com.kh.back.admin.controller;

import com.kh.back.admin.service.AdminPermissionService;
import com.kh.back.common.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.net.URI;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminPermissionController {
    private final AdminPermissionService service;
    @ExceptionHandler(com.kh.back.common.exception.ApiException.class)
    public ResponseEntity<org.springframework.http.ProblemDetail> permissionFailure(com.kh.back.common.exception.ApiException failure) {
        var problem=org.springframework.http.ProblemDetail.forStatusAndDetail(failure.getStatus(),failure.getMessage());
        problem.setProperty("code",failure.getCode());
        return ResponseEntity.status(failure.getStatus()).body(problem);
    }
    @ExceptionHandler(org.springframework.web.bind.MethodArgumentNotValidException.class)
    public ResponseEntity<org.springframework.http.ProblemDetail> invalidInput(org.springframework.web.bind.MethodArgumentNotValidException failure) {
        var problem=org.springframework.http.ProblemDetail.forStatusAndDetail(org.springframework.http.HttpStatus.BAD_REQUEST,"입력값의 필수 항목과 길이를 확인해 주세요.");
        problem.setProperty("errors",failure.getBindingResult().getFieldErrors().stream().map(error -> java.util.Map.of("field",error.getField(),"message",String.valueOf(error.getDefaultMessage()))).toList());
        return ResponseEntity.badRequest().body(problem);
    }
    public record RoleRequest(@NotBlank @Size(max=50) String name,@NotNull @Size(max=200) String description,
        @NotNull @PositiveOrZero Long version,@NotNull @Size(max=8) List<@NotBlank String> screens) {}
    public record AccountRolesRequest(@NotNull @Size(max=20) List<@NotNull @Positive Long> roleIds,
        @NotNull @Size(max=20) List<@NotNull @Positive Long> expectedRoleIds) {}
    @GetMapping("/access-profile") public ApiResponse<?> access(@AuthenticationPrincipal Long actor) { return ApiResponse.ok(service.access(actor)); }
    @GetMapping("/permission-roles") public ApiResponse<?> roles(@AuthenticationPrincipal Long actor) { return ApiResponse.ok(service.catalog(actor)); }
    @GetMapping("/permission-accounts") public ApiResponse<?> accounts(@AuthenticationPrincipal Long actor) { return ApiResponse.ok(service.accounts(actor)); }
    @PostMapping("/permission-roles") public ResponseEntity<?> create(@AuthenticationPrincipal Long actor,@Valid @RequestBody RoleRequest input) {
        var role=service.saveRole(actor,null,input.version(),input.name(),input.description(),input.screens());
        return ResponseEntity.created(URI.create("/api/v1/admin/permission-roles/"+role.id())).body(ApiResponse.ok(role));
    }
    @PutMapping("/permission-roles/{id}") public ApiResponse<?> update(@AuthenticationPrincipal Long actor,@PathVariable long id,@Valid @RequestBody RoleRequest input) {
        return ApiResponse.ok(service.saveRole(actor,id,input.version(),input.name(),input.description(),input.screens()));
    }
    @DeleteMapping("/permission-roles/{id}") public ResponseEntity<Void> delete(@AuthenticationPrincipal Long actor,@PathVariable long id,@RequestParam long version) {
        service.deleteRole(actor,id,version); return ResponseEntity.noContent().build();
    }
    @PutMapping("/permission-accounts/{userId}/roles") public ResponseEntity<Void> assign(@AuthenticationPrincipal Long actor,@PathVariable long userId,@Valid @RequestBody AccountRolesRequest input) {
        service.assign(actor,userId,input.roleIds(),input.expectedRoleIds()); return ResponseEntity.noContent().build();
    }
}

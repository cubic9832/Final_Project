package com.kh.back.admin.service;

import com.kh.back.common.exception.ApiException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * 모델 관리: 학습 결과 폴더(<모델 위치>/<계열>/<폴더>) 찾기. 비교 표 · 상세 · 추천 서버 켜기가 같은 규칙을 쓴다.
 * runId = "계열/폴더". 모델 위치 밖을 가리키거나 학습 결과 파일이 없는 폴더는 404.
 * 서버를 프로젝트 맨 위에서 켜도, back 폴더에서 켜도 찾게 두 곳을 본다 (dev.sh 는 back 에서 켬)
 */
@Slf4j
@Component
public class ModelRunLocator {

    static final String SCENARIO_REPORT = "training_report.json";
    static final String PREFERENCE_REPORT = "report.json";
    private static final Pattern RUN_ID = Pattern.compile("^[A-Za-z0-9._-]+/[A-Za-z0-9._-]+$");

    private final String modelRoot;

    public ModelRunLocator(@Value("${admin.model-root}") String modelRoot) {
        this.modelRoot = modelRoot;
    }

    public Path root() {
        for (Path candidate : List.of(Path.of(modelRoot), Path.of("..").resolve(modelRoot))) {
            if (Files.isDirectory(candidate)) {
                return candidate.toAbsolutePath().normalize();
            }
        }
        return null;
    }

    // 학습 결과 파일이 있는 폴더 전체 (계열 · 폴더 이름순)
    public List<Path> runDirs() {
        Path root = root();
        if (root == null) {
            return List.of();
        }
        List<Path> dirs = new ArrayList<>();
        try (Stream<Path> families = Files.list(root)) {
            for (Path family : families.filter(Files::isDirectory).sorted().toList()) {
                try (Stream<Path> runs = Files.list(family)) {
                    runs.filter(ModelRunLocator::isRunDir).sorted().forEach(dirs::add);
                }
            }
        } catch (IOException e) {
            log.warn("model runs: cannot list {}: {}", root, e.getMessage());
        }
        return dirs;
    }

    public Path resolve(String runId) {
        Path root = root();
        if (root == null || runId == null || !RUN_ID.matcher(runId).matches()) {
            throw notFound();
        }
        Path dir = root.resolve(runId).normalize();
        if (!dir.startsWith(root) || !isRunDir(dir)) {
            throw notFound();
        }
        return dir;
    }

    // 추천 서버 코드가 있는 ml 폴더 (모델 위치에서 위로 올라가며 vehicle_matching 을 찾는다)
    public Path mlDir() {
        for (Path dir = root(); dir != null; dir = dir.getParent()) {
            if (Files.isDirectory(dir.resolve("vehicle_matching"))) {
                return dir;
            }
        }
        throw new ApiException(HttpStatus.CONFLICT, "ML_ENV_MISSING", "추천 서버 코드(ml/vehicle_matching)를 찾지 못했습니다.");
    }

    public String runId(Path dir) {
        return root().relativize(dir).toString().replace('\\', '/');
    }

    public static boolean isRunDir(Path dir) {
        return Files.isDirectory(dir) && Files.exists(dir.resolve("metadata.json"))
                && (Files.exists(dir.resolve(SCENARIO_REPORT)) || Files.exists(dir.resolve(PREFERENCE_REPORT)));
    }

    private static ApiException notFound() {
        return new ApiException(HttpStatus.NOT_FOUND, "MODEL_RUN_NOT_FOUND", "학습 결과 폴더를 찾지 못했습니다.");
    }
}

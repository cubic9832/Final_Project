package com.kh.back.common.config;

import java.io.IOException;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;

import org.apache.commons.logging.Log;
import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.logging.DeferredLogFactory;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

/**
 * 프로젝트 루트의 .env.local (git 제외) 에 적은 외부 서비스 키를 서버 설정에 넣는다.
 * 키 이름은 환경변수 이름 그대로 (GEMINI_API_KEY, MAIL_PASSWORD …) 쓰고, 같은 키가 있으면 환경변수보다 이 파일이 우선한다.
 * 값이 빈 줄은 건너뛴다 (.env.example 을 복사해 일부만 채워도 기존 환경변수를 빈 값으로 덮지 않게).
 * 관리자 계정(ADMIN_SEED_*)은 기존대로 back/admin-seed.local.properties · 환경변수로만 정하므로 읽지 않는다.
 * 파일이 없으면 (배포 서버 등) 아무것도 하지 않는다. 등록: META-INF/spring.factories
 */
public class LocalKeyFileEnvironmentPostProcessor implements EnvironmentPostProcessor {

    static final String PROPERTY_SOURCE_NAME = "localKeyFile";
    static final String FILE_NAME = ".env.local";
    private static final String ADMIN_SEED_PREFIX = "ADMIN_SEED_";

    private final Log log;

    public LocalKeyFileEnvironmentPostProcessor(DeferredLogFactory logFactory) {
        this.log = logFactory.getLog(LocalKeyFileEnvironmentPostProcessor.class);
    }

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Path keyFile = findKeyFile(Path.of("").toAbsolutePath());
        if (keyFile != null) apply(environment, keyFile);
    }

    void apply(ConfigurableEnvironment environment, Path keyFile) {
        if (!Files.isRegularFile(keyFile)) return;
        Map<String, Object> keys = new LinkedHashMap<>();
        boolean skippedAdminSeed = false;
        for (Map.Entry<Object, Object> entry : read(keyFile).entrySet()) {
            String name = entry.getKey().toString().strip();
            String value = entry.getValue().toString().strip();
            if (name.startsWith(ADMIN_SEED_PREFIX)) skippedAdminSeed = true;
            else if (!value.isEmpty()) keys.put(name, value);
        }
        if (skippedAdminSeed) log.warn("key file: ADMIN_SEED_* ignored, use back/admin-seed.local.properties");
        if (keys.isEmpty()) return;
        // SystemEnvironment 형식이라 진짜 환경변수처럼 GEMINI_API_KEY 가 ${GEMINI_API_KEY:} 등에 그대로 연결된다
        environment.getPropertySources().addFirst(new SystemEnvironmentPropertySource(PROPERTY_SOURCE_NAME, keys));
        log.info("key file applied: " + keyFile + " (" + keys.size() + " keys)");
    }

    /** gradle bootRun 은 back 폴더, IntelliJ 는 프로젝트 루트에서 실행될 수 있어 두 경우 모두 루트의 파일을 찾는다 */
    static Path findKeyFile(Path workingDirectory) {
        if (Files.isRegularFile(workingDirectory.resolve("back/build.gradle"))) return workingDirectory.resolve(FILE_NAME);
        if (Files.isRegularFile(workingDirectory.resolve("build.gradle")) && workingDirectory.getParent() != null)
            return workingDirectory.getParent().resolve(FILE_NAME);
        return null;
    }

    private static Properties read(Path keyFile) {
        Properties properties = new Properties();
        try (Reader reader = Files.newBufferedReader(keyFile, StandardCharsets.UTF_8)) {
            properties.load(reader);
        } catch (IOException error) {
            throw new UncheckedIOException("key file read failed: " + keyFile, error);
        }
        return properties;
    }
}

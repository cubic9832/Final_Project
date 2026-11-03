package com.kh.back.common.config;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;

class LocalKeyFileEnvironmentPostProcessorTests {

    @TempDir Path root;
    private final LocalKeyFileEnvironmentPostProcessor processor = new LocalKeyFileEnvironmentPostProcessor(Supplier::get);
    private final StandardEnvironment environment = new StandardEnvironment();

    @BeforeEach
    void existingEnvironmentVariables() {
        environment.getPropertySources().replace(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                new MapPropertySource(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                        Map.of("GEMINI_API_KEY", "from-env", "MAIL_PASSWORD", "env-mail")));
    }

    @Test
    void keyFileWinsOverEnvironmentVariable() throws IOException {
        processor.apply(environment, keyFile("GEMINI_API_KEY=from-file\n"));

        assertThat(environment.resolvePlaceholders("${GEMINI_API_KEY:}")).isEqualTo("from-file");
        assertThat(environment.getProperty("MAIL_PASSWORD")).isEqualTo("env-mail");
    }

    @Test
    void blankValueKeepsEnvironmentVariable() throws IOException {
        processor.apply(environment, keyFile("# copied from .env.example\nGEMINI_API_KEY=\nMAIL_PASSWORD=   \n"));

        assertThat(environment.getProperty("GEMINI_API_KEY")).isEqualTo("from-env");
        assertThat(environment.getProperty("MAIL_PASSWORD")).isEqualTo("env-mail");
        assertThat(environment.getPropertySources().contains(LocalKeyFileEnvironmentPostProcessor.PROPERTY_SOURCE_NAME)).isFalse();
    }

    @Test
    void adminSeedKeysAreIgnored() throws IOException {
        processor.apply(environment, keyFile("ADMIN_SEED_EMAIL=admin@test.com\nADMIN_SEED_PASSWORD=Admin123!\n"));

        assertThat(environment.getProperty("admin.seed.email")).isNull();
        assertThat(environment.getProperty("ADMIN_SEED_PASSWORD")).isNull();
    }

    @Test
    void missingFileChangesNothing() {
        processor.apply(environment, root.resolve(LocalKeyFileEnvironmentPostProcessor.FILE_NAME));

        assertThat(environment.getPropertySources().contains(LocalKeyFileEnvironmentPostProcessor.PROPERTY_SOURCE_NAME)).isFalse();
    }

    @Test
    void findsRootFileFromProjectRootOrBackFolder() throws IOException {
        Path back = Files.createDirectories(root.resolve("back"));
        Files.writeString(back.resolve("build.gradle"), "");
        Path expected = root.resolve(LocalKeyFileEnvironmentPostProcessor.FILE_NAME);

        assertThat(LocalKeyFileEnvironmentPostProcessor.findKeyFile(root)).isEqualTo(expected);
        assertThat(LocalKeyFileEnvironmentPostProcessor.findKeyFile(back)).isEqualTo(expected);
        assertThat(LocalKeyFileEnvironmentPostProcessor.findKeyFile(Files.createDirectories(root.resolve("elsewhere")))).isNull();
    }

    private Path keyFile(String content) throws IOException {
        return Files.writeString(root.resolve(LocalKeyFileEnvironmentPostProcessor.FILE_NAME), content);
    }
}

package com.kh.back.recommendation;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.kh.back.common.exception.ApiException;
import com.kh.back.recommendation.RecommendationServerLauncher.Server;
import com.kh.back.recommendation.RecommendationServerLauncher.State;
import com.kh.back.recommendation.RecommendationUpstreamRegistry.Upstream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

// 모델 관리: 관리자 화면에서 추천 서버 켜기 · 끄기 — 빈 포트 고르기, 실패 사유, 고정 서버 보호
class RecommendationServerLauncherTests {

    @TempDir
    Path temp;

    private final RecommendationUpstreamRegistry registry = mock(RecommendationUpstreamRegistry.class);
    private final List<List<String>> commands = new ArrayList<>();
    private final List<FakeProcess> processes = new ArrayList<>();
    private Set<Integer> busyPorts = Set.of();
    private Path mlDir;
    private Path python;

    @BeforeEach
    void setUp() throws Exception {
        mlDir = Files.createDirectories(temp.resolve("ml"));
        python = Files.createFile(temp.resolve("python"));
        python.toFile().setExecutable(true);
        when(registry.poolPorts()).thenReturn(List.of(8003, 8004, 8005));
        when(registry.upstreams()).thenReturn(List.of());
        when(registry.refresh()).thenReturn(List.of());
    }

    private RecommendationServerLauncher launcher(boolean enabled) {
        ProcessStarter starter = (command, environment, log) -> {
            commands.add(command);
            Files.writeString(log, "INFO: Waiting for application startup.\n");
            FakeProcess process = new FakeProcess(log);
            processes.add(process);
            return process;
        };
        return new RecommendationServerLauncher(enabled, python.toString(), registry, starter,
                port -> busyPorts.contains(port), temp.resolve("logs"));
    }

    private Path run(String name) throws Exception {
        return Files.createDirectories(temp.resolve("models").resolve(name));
    }

    @Test
    void 이미_쓰는_포트는_건너뛰고_빈_포트에_켠다() throws Exception {
        busyPorts = Set.of(8003); // 다른 프로그램이 쓰는 포트
        RecommendationServerLauncher launcher = launcher(true);

        Server first = launcher.start(run("model-a"), mlDir);
        Server second = launcher.start(run("model-b"), mlDir);

        assertThat(first.port()).isEqualTo(8004);
        assertThat(second.port()).isEqualTo(8005);
        assertThat(first.state()).isEqualTo(State.STARTING);
        assertThat(commands.get(0)).containsSubsequence("--port", "8004").contains("vehicle_matching.api:app");
    }

    @Test
    void 같은_모델을_두_번_켜거나_빈_포트가_없으면_거절한다() throws Exception {
        RecommendationServerLauncher launcher = launcher(true);
        launcher.start(run("model-a"), mlDir);

        assertCode(() -> launcher.start(temp.resolve("models/model-a"), mlDir), "MODEL_ALREADY_SERVING");
        launcher.start(run("model-b"), mlDir);
        launcher.start(run("model-c"), mlDir);
        assertCode(() -> launcher.start(run("model-d"), mlDir), "NO_FREE_PORT");
    }

    @Test
    void 켜다가_꺼진_서버는_FAILED_와_로그의_오류_줄을_보여_준다() throws Exception {
        RecommendationServerLauncher launcher = launcher(true);
        Server server = launcher.start(run("model-a"), mlDir);
        FakeProcess process = processes.get(0);
        Files.writeString(process.log, """
                Traceback (most recent call last):
                  File "api.py", line 134, in lifespan
                ValueError: UI model checksum mismatch: catalog.json

                ERROR:    Application startup failed. Exiting.
                """);
        process.alive = false;

        Server failed = launcher.servers().stream().filter(s -> s.port() == server.port()).findFirst().orElseThrow();
        assertThat(failed.state()).isEqualTo(State.FAILED);
        assertThat(failed.error()).isEqualTo("ValueError: UI model checksum mismatch: catalog.json");

        // 실패한 포트는 다시 쓸 수 있다
        assertThat(launcher.start(run("model-b"), mlDir).port()).isEqualTo(server.port());
    }

    @Test
    void 응답하기_시작하면_RUNNING_끄면_프로세스를_끝낸다() throws Exception {
        RecommendationServerLauncher launcher = launcher(true);
        Server server = launcher.start(run("model-a"), mlDir);
        when(registry.upstreams()).thenReturn(List.of(
                new Upstream("http://127.0.0.1:" + server.port(), true, "model-a", "ui-scenario-ranker-v1", true, 281, 80)));
        when(registry.isPoolUrl("http://127.0.0.1:" + server.port())).thenReturn(true);

        assertThat(launcher.servers()).containsExactly(new Server(server.port(), "model-a", State.RUNNING, null));
        assertThat(launcher.stop(server.port())).isEqualTo("model-a");
        assertThat(processes.get(0).alive).isFalse();
    }

    @Test
    void 켜는_포트가_아닌_고정_서버는_끌_수_없고_꺼진_설정이면_막는다() throws Exception {
        assertCode(() -> launcher(true).stop(8002), "SERVER_NOT_MANAGED");
        assertCode(() -> launcher(false).start(run("model-a"), mlDir), "LAUNCHER_DISABLED");
    }

    @Test
    void 실행_환경이_없으면_거절한다() throws Exception {
        Files.delete(python);
        assertCode(() -> launcher(true).start(run("model-a"), mlDir), "ML_ENV_MISSING");
    }

    private static void assertCode(org.assertj.core.api.ThrowableAssert.ThrowingCallable call, String code) {
        assertThatThrownBy(call).isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", code);
    }

    // 실제 python 을 띄우지 않는 가짜 프로세스
    private static final class FakeProcess extends Process {
        private final Path log;
        private volatile boolean alive = true;

        FakeProcess(Path log) {
            this.log = log;
        }

        @Override public boolean isAlive() { return alive; }
        @Override public void destroy() { alive = false; }
        @Override public int exitValue() { if (alive) throw new IllegalThreadStateException(); return 1; }
        @Override public int waitFor() { return 1; }
        @Override public OutputStream getOutputStream() { return OutputStream.nullOutputStream(); }
        @Override public InputStream getInputStream() { return InputStream.nullInputStream(); }
        @Override public InputStream getErrorStream() { return InputStream.nullInputStream(); }
    }
}

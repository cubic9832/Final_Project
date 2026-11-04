package com.kh.back.recommendation;

import com.kh.back.common.exception.ApiException;
import com.kh.back.recommendation.RecommendationUpstreamRegistry.Upstream;
import java.io.File;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.IntPredicate;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * 모델 관리: 관리자 화면에서 고른 학습 결과 폴더로 추천 서버(FastAPI)를 켜고 끈다. 개발 · 시연용 (Spring 과 ML 이 같은 PC).
 * ml/serve-candidates.sh 와 같은 명령을 recommendation.launcher.ports 의 빈 포트에 띄우고, 출력은 임시 폴더의 compass-ml/<포트>.log.
 *
 * devtools 재시작은 JVM 을 끝내지 않아 켠 추천 서버가 살아 남는다 → 포트를 다시 확인해 "EXTERNAL" 로 찾고, 끌 때는 명령줄로 프로세스를 찾는다.
 * JVM 이 끝날 때는 이 클래스가 켠 추천 서버를 함께 끈다.
 * recommendation.launcher.enabled = false 면 켜기 · 끄기를 막는다 (배포 서버).
 */
@Slf4j
@Component
public class RecommendationServerLauncher {

    public enum State { STARTING, RUNNING, FAILED, EXTERNAL }

    /**
     * @param port    포트
     * @param runName 학습 결과 폴더 이름 (= 추천 서버 modelBundle). EXTERNAL 이면 추천 서버 응답의 modelBundle
     * @param state   켜는 중 · 켜짐 · 실패 · (재시작 전에 켠) 켜짐
     * @param error   실패 사유 (로그의 마지막 오류 줄)
     */
    public record Server(int port, String runName, State state, String error) {
    }

    private record Launched(int port, String runName, Process process, Path log, Instant startedAt) {
    }

    private static final String APP = "vehicle_matching.api:app";
    // JVM 이 끝날 때 끌 프로세스 (devtools 재시작마다 이 클래스가 새로 올라와도 한 번만 등록)
    private static final Set<Process> SPAWNED = ConcurrentHashMap.newKeySet();

    static {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> SPAWNED.forEach(RecommendationServerLauncher::destroyTree)));
    }

    private final boolean enabled;
    private final String pythonSetting;
    private final RecommendationUpstreamRegistry registry;
    private final ProcessStarter starter;
    private final IntPredicate portInUse;
    private final Path logDir;
    private final Map<Integer, Launched> launched = new ConcurrentHashMap<>();

    @Autowired
    public RecommendationServerLauncher(@Value("${recommendation.launcher.enabled}") boolean enabled,
                                        @Value("${recommendation.launcher.python:}") String python,
                                        RecommendationUpstreamRegistry registry) {
        this(enabled, python, registry, ProcessStarter.SYSTEM, RecommendationServerLauncher::isListening,
                Path.of(System.getProperty("java.io.tmpdir"), "compass-ml"));
    }

    RecommendationServerLauncher(boolean enabled, String python, RecommendationUpstreamRegistry registry,
                                 ProcessStarter starter, IntPredicate portInUse, Path logDir) {
        this.enabled = enabled;
        this.pythonSetting = python == null ? "" : python.strip();
        this.registry = registry;
        this.starter = starter;
        this.portInUse = portInUse;
        this.logDir = logDir;
    }

    public boolean enabled() {
        return enabled;
    }

    /**
     * @param runDir 학습 결과 폴더 (ModelRunLocator 로 검증한 경로)
     * @param mlDir  ml 폴더 (vehicle_matching 이 있는 곳)
     */
    public synchronized Server start(Path runDir, Path mlDir) {
        if (!enabled) {
            throw new ApiException(HttpStatus.CONFLICT, "LAUNCHER_DISABLED", "이 서버에서는 관리자 화면으로 추천 서버를 켤 수 없습니다.");
        }
        String runName = runDir.getFileName().toString();
        if (launched.values().stream().anyMatch(l -> l.runName().equals(runName) && l.process().isAlive())) {
            throw new ApiException(HttpStatus.CONFLICT, "MODEL_ALREADY_SERVING", runName + " 모델은 이미 켜는 중이거나 켜져 있습니다.");
        }
        Path python = python(mlDir);
        if (!Files.isExecutable(python)) {
            throw new ApiException(HttpStatus.CONFLICT, "ML_ENV_MISSING",
                    "추천 서버 실행 환경(ml/.venv)이 없습니다. ml/README.md 의 설치 방법을 확인해 주세요.");
        }
        int port = registry.poolPorts().stream()
                .filter(p -> !(launched.containsKey(p) && launched.get(p).process().isAlive()))
                .filter(p -> !portInUse.test(p))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "NO_FREE_PORT",
                        "추천 서버를 더 켤 빈 포트가 없습니다. 쓰지 않는 모델을 먼저 꺼 주세요."));
        Path root = mlDir.getParent() == null ? mlDir : mlDir.getParent();
        List<String> command = List.of(python.toString(), "-m", "uvicorn", APP, "--app-dir", mlDir.toString(),
                "--host", "127.0.0.1", "--port", String.valueOf(port));
        Map<String, String> environment = Map.of(
                "ML_CANDIDATE_RUN", runDir.toString(),
                "PYTHONPATH", mlDir + File.pathSeparator + root);
        try {
            Files.createDirectories(logDir);
            Path logFile = logDir.resolve(port + ".log");
            Process process = starter.start(command, environment, logFile);
            SPAWNED.add(process);
            launched.put(port, new Launched(port, runName, process, logFile, Instant.now()));
            log.info("recommendation server {} starting on {} (log {})", runName, port, logFile);
            return new Server(port, runName, State.STARTING, null);
        } catch (IOException e) {
            throw new ApiException(HttpStatus.CONFLICT, "LAUNCH_FAILED", "추천 서버를 켜지 못했습니다: " + e.getMessage());
        }
    }

    // 켠 추천 서버와 (재시작 전에 켜 둔) 켜는 포트의 추천 서버 상태
    public List<Server> servers() {
        if (launched.values().stream().anyMatch(l -> l.process().isAlive())) {
            registry.refresh(); // 켜는 중인 서버가 응답하기 시작했는지 바로 본다
        }
        List<Upstream> upstreams = registry.upstreams();
        List<Server> servers = new ArrayList<>();
        for (Launched l : launched.values()) {
            String baseUrl = RecommendationUpstreamRegistry.poolBaseUrl(l.port());
            boolean up = upstreams.stream().anyMatch(u -> u.up() && baseUrl.equals(u.baseUrl()));
            if (l.process().isAlive()) {
                servers.add(new Server(l.port(), l.runName(), up ? State.RUNNING : State.STARTING, null));
            } else {
                servers.add(new Server(l.port(), l.runName(), State.FAILED, lastError(l.log())));
            }
        }
        for (Upstream u : upstreams) {
            if (u.up() && registry.isPoolUrl(u.baseUrl())) {
                int port = Integer.parseInt(u.baseUrl().substring(u.baseUrl().lastIndexOf(':') + 1));
                if (!launched.containsKey(port) || !launched.get(port).process().isAlive()) {
                    servers.removeIf(s -> s.port() == port);
                    servers.add(new Server(port, u.modelBundle(), State.EXTERNAL, null));
                }
            }
        }
        servers.sort((a, b) -> Integer.compare(a.port(), b.port()));
        return servers;
    }

    // 끈 서버의 모델 이름. 켜는 포트가 아니면 400 (dev.sh 로 켠 고정 서버는 여기서 끄지 않는다)
    public synchronized String stop(int port) {
        if (!enabled) {
            throw new ApiException(HttpStatus.CONFLICT, "LAUNCHER_DISABLED", "이 서버에서는 관리자 화면으로 추천 서버를 끌 수 없습니다.");
        }
        if (!registry.poolPorts().contains(port)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SERVER_NOT_MANAGED", port + " 포트의 추천 서버는 관리자 화면에서 끌 수 없습니다.");
        }
        Launched mine = launched.remove(port);
        String runName;
        if (mine != null && mine.process().isAlive()) {
            destroyTree(mine.process());
            SPAWNED.remove(mine.process());
            runName = mine.runName();
        } else {
            Optional<ProcessHandle> external = ProcessHandle.allProcesses()
                    .filter(handle -> handle.info().commandLine()
                            .map(line -> line.contains(APP) && line.matches(".*--port\\s+" + port + "(\\s.*|$)"))
                            .orElse(false))
                    .findFirst();
            String served = registry.upstreams().stream()
                    .filter(u -> u.up() && RecommendationUpstreamRegistry.poolBaseUrl(port).equals(u.baseUrl()))
                    .map(Upstream::modelBundle).findFirst().orElse(null);
            if (external.isEmpty()) {
                if (mine != null) {
                    return mine.runName(); // 이미 실패해 꺼진 서버 → 목록에서만 지운다
                }
                throw new ApiException(HttpStatus.NOT_FOUND, "SERVER_NOT_FOUND", port + " 포트에 켜진 추천 서버가 없습니다.");
            }
            external.get().descendants().forEach(ProcessHandle::destroy);
            external.get().destroy();
            runName = served;
        }
        registry.refresh();
        return runName;
    }

    // 지금 켜는 포트에서 응답하는 서버의 모델 이름
    public Optional<String> servedOn(int port) {
        String baseUrl = RecommendationUpstreamRegistry.poolBaseUrl(port);
        Launched mine = launched.get(port);
        Optional<String> up = registry.upstreams().stream()
                .filter(u -> u.up() && baseUrl.equals(u.baseUrl())).map(Upstream::modelBundle).findFirst();
        return up.isPresent() ? up : Optional.ofNullable(mine).map(Launched::runName);
    }

    private Path python(Path mlDir) {
        if (!pythonSetting.isEmpty()) {
            return Path.of(pythonSetting);
        }
        Path unix = mlDir.resolve(".venv/bin/python");
        return Files.exists(unix) ? unix : mlDir.resolve(".venv/Scripts/python.exe");
    }

    // 로그에서 마지막 "...Error: 내용" 줄 (예: ValueError: UI model checksum mismatch: catalog.json)
    static String lastError(Path log) {
        try {
            List<String> lines = Files.readAllLines(log, StandardCharsets.UTF_8);
            Collections.reverse(lines);
            return lines.stream().map(String::strip)
                    .filter(line -> line.matches("^[A-Za-z_.]*(Error|Exception)\\b.*:.*"))
                    .findFirst()
                    .or(() -> lines.stream().map(String::strip).filter(line -> !line.isEmpty()).findFirst())
                    .map(line -> line.length() > 200 ? line.substring(0, 199) + "…" : line)
                    .orElse("추천 서버가 시작 중에 종료되었습니다.");
        } catch (IOException e) {
            return "추천 서버가 시작 중에 종료되었습니다.";
        }
    }

    private static void destroyTree(Process process) {
        try {
            process.descendants().forEach(ProcessHandle::destroy);
        } catch (UnsupportedOperationException ignored) {
            // 자식 프로세스를 알 수 없는 경우 (테스트용 가짜 프로세스 등) → 본 프로세스만 끈다
        }
        process.destroy();
    }

    private static boolean isListening(int port) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress("127.0.0.1", port), 200);
            return true;
        } catch (IOException e) {
            return false;
        }
    }
}

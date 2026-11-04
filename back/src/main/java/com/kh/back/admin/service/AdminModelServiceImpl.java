package com.kh.back.admin.service;

import com.kh.back.admin.dto.AdminCandidate;
import com.kh.back.admin.dto.AdminModelComparison;
import com.kh.back.admin.dto.AdminModelComparison.ModelRow;
import com.kh.back.admin.dto.AdminModelReport;
import com.kh.back.admin.dto.AdminModelReport.Epoch;
import com.kh.back.admin.dto.AdminModelReport.Metric;
import com.kh.back.admin.dto.AdminModelReport.SplitProfiles;
import com.kh.back.admin.dto.AdminModelReport.Version;
import com.kh.back.admin.dto.ModelVersionRow;
import com.kh.back.admin.mapper.AdminModelMapper;
import com.kh.back.recommendation.RecommendationServerLauncher;
import com.kh.back.recommendation.RecommendationServerLauncher.Server;
import com.kh.back.recommendation.RecommendationServerLauncher.State;
import com.kh.back.recommendation.RecommendationTrafficMapper;
import com.kh.back.recommendation.RecommendationUpstreamRegistry;
import com.kh.back.recommendation.RecommendationUpstreamRegistry.Upstream;
import com.kh.back.recommendation.TrafficRow;
import com.kh.back.recommendation.UsageRow;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 학습 결과 파일은 조원(ML)이 git 에 올린 ml/outputs/models/... 를 읽기만 한다 (고치지 않음).
 * 폴더는 추천 서버(ml/serve-candidates.ps1 · .sh)가 쓰는 기본 폴더와 같게 두고, 바뀌면 환경변수 ML_MODEL_RUN_DIR 로 바꾼다.
 * (ML_MODEL_RUN_DIR 가 없으면 추천 서버와 같은 ML_CANDIDATE_RUN 을 쓴다)
 */
@Slf4j
@Service
public class AdminModelServiceImpl implements AdminModelService {

    // 화면에 보일 지표 이름 (옛 형식 report.json comparison.metrics 의 키 → 이름)
    private static final List<String[]> METRICS = List.of(
            new String[] {"standalone_ndcg_at_3", "단독 NDCG@3"},
            new String[] {"final_ndcg_at_3", "최종 NDCG@3"},
            new String[] {"fuel_match_at_3", "연료 일치@3"});

    // 학습 결과 파일 이름: 새 형식(scenario-choices) · 옛 형식(candidate-preferences)
    private static final String SCENARIO_REPORT = ModelRunLocator.SCENARIO_REPORT;
    private static final String PREFERENCE_REPORT = ModelRunLocator.PREFERENCE_REPORT;

    // 추천 서버(ml/vehicle_matching/api.py)가 scenarioSupported = true 로 응답하는 입력 구조 = 지금 재무 진단 화면과 맞는 모델
    static final Set<String> SCENARIO_SCHEMAS = Set.of("scenario-ranker-v1", "ui-scenario-ranker-v1", "ui-scenario-height-ranker-v2");
    private static final int USAGE_DAYS = 7;

    private final AdminModelMapper adminModelMapper;
    private final RecommendationTrafficMapper trafficMapper;
    private final RecommendationUpstreamRegistry registry;
    private final ObjectMapper objectMapper;
    private final ModelRunLocator locator;
    private final RecommendationServerLauncher launcher;
    private final String runDir;

    public AdminModelServiceImpl(AdminModelMapper adminModelMapper, RecommendationTrafficMapper trafficMapper,
                                 RecommendationUpstreamRegistry registry, ModelRunLocator locator,
                                 RecommendationServerLauncher launcher, ObjectMapper objectMapper,
                                 @Value("${admin.model-run-dir}") String runDir) {
        this.adminModelMapper = adminModelMapper;
        this.trafficMapper = trafficMapper;
        this.registry = registry;
        this.locator = locator;
        this.launcher = launcher;
        this.objectMapper = objectMapper;
        this.runDir = runDir;
    }

    // 비교 표 한 줄의 학습 · 평가 값. 계열마다 파일 모양이 달라 summarize 가 맞춰 읽는다
    private record Summary(String schema, LocalDateTime trainedAt, Long profiles, Long comparisons, String metricKind,
                           Double testAccuracy, Double testLogLoss, String baselineLabel, Double baselineAccuracy) {
    }

    @Override
    public AdminModelReport getReport() {
        return report(findRunDir());
    }

    // runId = "계열/폴더" (비교 표의 한 줄). 모델 위치 밖을 가리키거나 없는 폴더면 404 (ModelRunLocator)
    @Override
    public AdminModelReport getReport(String runId) {
        if (runId == null || runId.isBlank()) {
            return getReport();
        }
        return report(locator.resolve(runId));
    }

    @Override
    public AdminModelComparison getComparison() {
        List<Server> launched = launcher.servers(); // 켜는 중인 서버가 있으면 추천 서버 상태도 바로 다시 확인한다
        List<Upstream> upstreams = registry.upstreams();
        Map<String, Integer> weights = new HashMap<>();
        for (TrafficRow row : trafficMapper.findAllocations()) {
            weights.put(row.getModelBundle(), row.getWeightPercent());
        }
        Map<String, Long> requests = new HashMap<>();
        for (UsageRow row : trafficMapper.sumUsage(USAGE_DAYS)) {
            requests.put(row.getModelBundle(), row.getRequests());
        }
        List<ModelVersionRow> versionRows = adminModelMapper.findVersions();
        Map<String, Integer> diagnoses = new HashMap<>();
        for (ModelVersionRow row : versionRows) {
            diagnoses.merge(row.getVersionLabel(), row.getDiagnoses(), Integer::sum);
        }
        Map<String, ServerInfo> servers = serverInfo(launched, upstreams);

        List<ModelRow> rows = new ArrayList<>();
        Set<String> listed = new HashSet<>();
        for (Path dir : locator.runDirs()) {
            String runName = dir.getFileName().toString();
            listed.add(runName);
            Summary summary = summarize(dir);
            ServerInfo server = servers.getOrDefault(runName, ServerInfo.OFF);
            rows.add(new ModelRow(locator.runId(dir), runName,
                    dir.getParent().getFileName().toString(), summary.schema(), summary.trainedAt(), summary.profiles(),
                    summary.comparisons(), summary.metricKind(), summary.testAccuracy(), summary.testLogLoss(),
                    summary.baselineLabel(), summary.baselineAccuracy(), SCENARIO_SCHEMAS.contains(summary.schema()),
                    server.running(), weights.getOrDefault(runName, 0), requests.getOrDefault(runName, 0L),
                    diagnoses.getOrDefault(runName, 0), server.state(), server.port(), server.error(), server.stoppable()));
        }
        // 추천 서버가 쓰지만 학습 결과 폴더를 찾지 못한 모델도 비율을 정할 수 있게 보여 준다
        for (Upstream upstream : upstreams) {
            if (upstream.up() && listed.add(upstream.modelBundle())) {
                String bundle = upstream.modelBundle();
                ServerInfo server = servers.getOrDefault(bundle, ServerInfo.OFF);
                rows.add(new ModelRow(null, bundle, null, upstream.rankerSchema(), null, null, null, null, null, null,
                        null, null, upstream.scenarioSupported(), true, weights.getOrDefault(bundle, 0),
                        requests.getOrDefault(bundle, 0L), diagnoses.getOrDefault(bundle, 0), server.state(),
                        server.port(), server.error(), server.stoppable()));
            }
        }
        rows.sort(Comparator.comparing(ModelRow::trainedAt, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(ModelRow::runName));

        List<AdminModelComparison.Upstream> upstreamRows = upstreams.stream()
                .map(u -> new AdminModelComparison.Upstream(u.baseUrl(), u.up(), u.modelBundle(), u.rankerSchema(),
                        u.catalogCount(), u.modelNames()))
                .toList();
        List<Version> versions = versionRows.stream()
                .map(row -> new Version(row.getVersionLabel(), row.getExecutionType(), row.getCreatedAt(), row.getDiagnoses()))
                .toList();
        return new AdminModelComparison(rows, upstreamRows, !weights.isEmpty(), launcher.enabled(), versions);
    }

    // 모델 이름별 추천 서버 상태. 관리자 화면에서 켠 서버(켜는 중 · 실패 포함)가 고정 서버보다 먼저
    private record ServerInfo(String state, Integer port, String error, boolean stoppable) {
        static final ServerInfo OFF = new ServerInfo("OFF", null, null, false);

        boolean running() {
            return "RUNNING".equals(state);
        }
    }

    private Map<String, ServerInfo> serverInfo(List<Server> launched, List<Upstream> upstreams) {
        Map<String, ServerInfo> info = new HashMap<>();
        for (Upstream upstream : upstreams) {
            if (upstream.up() && !registry.isPoolUrl(upstream.baseUrl())) {
                info.putIfAbsent(upstream.modelBundle(), new ServerInfo("RUNNING", port(upstream.baseUrl()), null, false));
            }
        }
        for (Server server : launched) {
            if (server.runName() == null) {
                continue;
            }
            String state = server.state() == State.EXTERNAL ? "RUNNING" : server.state().name();
            ServerInfo current = info.get(server.runName());
            // 같은 모델이 고정 서버로 이미 켜져 있으면 그 상태를 우선 (실패한 추가 켜기 때문에 꺼진 것처럼 보이지 않게)
            if (current == null || !current.running()) {
                info.put(server.runName(), new ServerInfo(state, server.port(), server.error(), true));
            }
        }
        return info;
    }

    private static Integer port(String baseUrl) {
        try {
            return Integer.valueOf(baseUrl.substring(baseUrl.lastIndexOf(':') + 1));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private AdminModelReport report(Path dir) {
        List<Version> versions = adminModelMapper.findVersions().stream()
                .map(row -> new Version(row.getVersionLabel(), row.getExecutionType(), row.getCreatedAt(), row.getDiagnoses()))
                .toList();
        if (dir == null) {
            return new AdminModelReport(false, null, null, null, null, null, null, null, null, null, null, null,
                    List.of(), List.of(), versions);
        }
        try {
            JsonNode metadata = read(dir.resolve("metadata.json"));
            String schema = metadata.path("schema").asString(null);
            LocalDateTime trainedAt = Files.exists(dir.resolve("model.pt"))
                    ? LocalDateTime.ofInstant(Files.getLastModifiedTime(dir.resolve("model.pt")).toInstant(), ZoneId.systemDefault())
                    : null;
            String runName = dir.getFileName().toString();
            return Files.exists(dir.resolve(SCENARIO_REPORT))
                    ? scenarioReport(read(dir.resolve(SCENARIO_REPORT)), runName, schema, trainedAt, versions)
                    : preferenceReport(dir, runName, schema, trainedAt, versions);
        } catch (Exception e) {
            // 파일 형식이 바뀌었거나 읽을 수 없음 → 화면에는 "학습 결과를 읽지 못함" (모델 버전 기록은 보여 준다)
            log.warn("admin model report: cannot read {}: {}", dir, e.getMessage());
            return new AdminModelReport(false, dir.getFileName().toString(), null, null, null, null, null, null, null, null,
                    null, null, List.of(), List.of(), versions);
        }
    }

    // 옛 형식 (candidate-preferences/...): report.json + holdout_report.json
    private AdminModelReport preferenceReport(Path dir, String runName, String schema, LocalDateTime trainedAt,
                                              List<Version> versions) throws Exception {
        JsonNode report = read(dir.resolve(PREFERENCE_REPORT));
        JsonNode holdout = Files.exists(dir.resolve("holdout_report.json")) ? read(dir.resolve("holdout_report.json")) : null;
        JsonNode generation = report.path("generation");
        JsonNode counts = generation.path("counts");

        List<Metric> metrics = new ArrayList<>();
        JsonNode compared = report.path("comparison").path("metrics");
        for (String[] metric : METRICS) {
            JsonNode current = compared.path("new").path(metric[0]);
            JsonNode previous = compared.path("old").path(metric[0]);
            if (current.isNumber() && previous.isNumber()) {
                metrics.add(new Metric(metric[1], previous.asDouble(), current.asDouble()));
            }
        }
        List<Epoch> history = new ArrayList<>();
        for (JsonNode epoch : report.path("history")) {
            history.add(new Epoch(epoch.path("epoch").asInt(), epoch.path("loss").asDouble(),
                    epoch.path("validation_pair_accuracy").asDouble()));
        }
        return new AdminModelReport(true, runName, schema, trainedAt,
                longOrNull(generation.path("profiles")), longOrNull(generation.path("candidate_rows")),
                longOrNull(generation.path("preference_pairs")),
                new SplitProfiles(counts.path("train_profiles").asLong(), counts.path("validation_profiles").asLong(),
                        counts.path("test_profiles").asLong()),
                generation.path("held_out_models").size(),
                holdout == null ? null : holdout.path("test_pair_accuracy").asDouble(),
                holdout == null ? null : holdout.path("financial_violations").asInt(),
                holdout == null ? null : holdout.path("meaning").asString(null),
                metrics, history, versions);
    }

    // 새 형식 (scenario-choices/...): training_report.json 하나. 이전 모델 비교 · 처음 보는 차종 · 재무 위반 값은 없어 null
    private AdminModelReport scenarioReport(JsonNode report, String runName, String schema, LocalDateTime trainedAt,
                                            List<Version> versions) {
        JsonNode partitions = report.path("partitions");
        List<Epoch> history = new ArrayList<>();
        for (JsonNode epoch : report.path("history")) {
            history.add(new Epoch(epoch.path("epoch").asInt(), epoch.path("training_log_loss").asDouble(),
                    epoch.path("validation").path("accuracy").asDouble()));
        }
        JsonNode testAccuracy = report.path("results").path("mlp").path("accuracy");
        return new AdminModelReport(true, runName, schema, trainedAt,
                longOrNull(report.path("validation").path("profiles")), null,
                longOrNull(report.path("validation").path("comparisons")),
                new SplitProfiles(partitions.path("train").path("profiles").asLong(),
                        partitions.path("validation").path("profiles").asLong(),
                        partitions.path("test").path("profiles").asLong()),
                null, testAccuracy.isNumber() ? testAccuracy.asDouble() : null, null,
                report.path("limitation").asString(null), List.of(), history, versions);
    }

    @Override
    public List<AdminCandidate> getCandidates() {
        Path dir = findRunDir();
        if (dir == null || !Files.exists(dir.resolve("catalog.json"))) {
            return List.of();
        }
        try {
            List<AdminCandidate> candidates = new ArrayList<>();
            for (JsonNode v : read(dir.resolve("catalog.json"))) {
                candidates.add(new AdminCandidate(v.path("id").asString(null), v.path("brand").asString(null),
                        v.path("model").asString(null), v.path("trim").asString(null), v.path("year").asString(null),
                        longOrNull(v.path("price")), v.path("fuel").asString(null),
                        v.path("efficiency").isNumber() ? v.path("efficiency").asDouble() : null,
                        v.path("length_mm").isNumber() ? v.path("length_mm").asInt() : null,
                        v.path("seats_label").asString(null), v.path("seats_status").asString(null),
                        v.path("seats_note").asString(null), v.path("source_url").asString(null),
                        v.path("checked_on").asString(null), v.path("quality").asString(null)));
            }
            return candidates;
        } catch (Exception e) {
            log.warn("admin candidates: cannot read {}: {}", dir, e.getMessage());
            return List.of();
        }
    }

    // 서버를 프로젝트 맨 위에서 켜도, back 폴더에서 켜도 찾게 두 곳을 본다 (dev.sh 는 back 에서 켬)
    private Path findRunDir() {
        for (Path candidate : List.of(Path.of(runDir), Path.of("..").resolve(runDir))) {
            if (Files.isDirectory(candidate)
                    && (Files.exists(candidate.resolve(SCENARIO_REPORT)) || Files.exists(candidate.resolve(PREFERENCE_REPORT)))) {
                return candidate.toAbsolutePath().normalize();
            }
        }
        return null;
    }

    /*
     * 계열별 학습 결과 파일 모양:
     *  - 화면 시나리오(ui-scenario-*): training_report.json results.mlp · results.linear, validation.profiles
     *  - 시나리오 v1: training_report.json test.mlp · test.linear, data_validation.profiles
     *  - 쌍 비교(새): training_report.json holdout.new · holdout.old (이전 모델)
     *  - 쌍 비교(옛): report.json generation + holdout_report.json test_pair_accuracy
     * 읽지 못한 값은 null (화면 "-")
     */
    private Summary summarize(Path dir) {
        String schema = null;
        LocalDateTime trainedAt = null;
        try {
            schema = read(dir.resolve("metadata.json")).path("schema").asString(null);
            if (Files.exists(dir.resolve("model.pt"))) {
                trainedAt = LocalDateTime.ofInstant(Files.getLastModifiedTime(dir.resolve("model.pt")).toInstant(), ZoneId.systemDefault());
            }
            if (Files.exists(dir.resolve(SCENARIO_REPORT))) {
                JsonNode report = read(dir.resolve(SCENARIO_REPORT));
                JsonNode results = report.path("results").path("mlp").isObject() ? report.path("results") : report.path("test");
                if (results.path("mlp").isObject()) {
                    JsonNode counts = report.path("validation").isObject() ? report.path("validation") : report.path("data_validation");
                    return new Summary(schema, trainedAt, longOrNull(counts.path("profiles")), longOrNull(counts.path("comparisons")),
                            "시나리오 선택 정확도", doubleOrNull(results.path("mlp").path("accuracy")),
                            doubleOrNull(results.path("mlp").path("log_loss")), "선형 기준선",
                            doubleOrNull(results.path("linear").path("accuracy")));
                }
                JsonNode holdout = report.path("holdout");
                long profiles = 0;
                for (JsonNode split : report.path("data").path("split_counts")) {
                    profiles += split.path("profiles").asLong();
                }
                return new Summary(schema, trainedAt, profiles > 0 ? profiles : null, longOrNull(holdout.path("new").path("pairs")),
                        "쌍 비교 정확도", doubleOrNull(holdout.path("new").path("accuracy")), null, "이전 모델",
                        doubleOrNull(holdout.path("old").path("accuracy")));
            }
            JsonNode generation = read(dir.resolve(PREFERENCE_REPORT)).path("generation");
            Double accuracy = Files.exists(dir.resolve("holdout_report.json"))
                    ? doubleOrNull(read(dir.resolve("holdout_report.json")).path("test_pair_accuracy"))
                    : null;
            return new Summary(schema, trainedAt, longOrNull(generation.path("profiles")),
                    longOrNull(generation.path("preference_pairs")), "쌍 비교 정확도", accuracy, null, null, null);
        } catch (Exception e) {
            log.warn("admin model comparison: cannot read {}: {}", dir, e.getMessage());
            return new Summary(schema, trainedAt, null, null, null, null, null, null, null);
        }
    }

    private static Double doubleOrNull(JsonNode node) {
        return node.isNumber() ? node.asDouble() : null;
    }

    private JsonNode read(Path file) throws Exception {
        return objectMapper.readTree(Files.readString(file));
    }

    private static Long longOrNull(JsonNode node) {
        return node.isNumber() ? node.asLong() : null;
    }
}

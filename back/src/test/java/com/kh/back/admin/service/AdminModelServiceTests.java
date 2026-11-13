package com.kh.back.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.kh.back.admin.dto.AdminModelComparison;
import com.kh.back.admin.dto.AdminModelComparison.ModelRow;
import com.kh.back.admin.dto.AdminModelReport;
import com.kh.back.admin.dto.AdminModelReport.Epoch;
import com.kh.back.admin.dto.AdminModelReport.SplitProfiles;
import com.kh.back.admin.dto.ModelVersionRow;
import com.kh.back.admin.mapper.AdminModelMapper;
import com.kh.back.common.exception.ApiException;
import com.kh.back.recommendation.RecommendationServerLauncher;
import com.kh.back.recommendation.RecommendationTrafficMapper;
import com.kh.back.recommendation.RecommendationUpstreamRegistry;
import com.kh.back.recommendation.RecommendationUpstreamRegistry.Upstream;
import com.kh.back.recommendation.TrafficRow;
import com.kh.back.recommendation.UsageRow;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.json.JsonMapper;

// 7단계: 모델 관리 — 추천 서버와 같은 학습 결과 폴더를 읽는다. 새 형식(training_report.json) · 옛 형식(report.json) 모두
class AdminModelServiceTests {

    private final AdminModelMapper adminModelMapper = mock(AdminModelMapper.class);
    private final RecommendationTrafficMapper trafficMapper = mock(RecommendationTrafficMapper.class);
    private final RecommendationUpstreamRegistry registry = mock(RecommendationUpstreamRegistry.class);
    private final RecommendationServerLauncher launcher = mock(RecommendationServerLauncher.class);

    @TempDir
    Path runDir;

    @TempDir
    Path modelRoot;

    private AdminModelService service() {
        when(adminModelMapper.findVersions()).thenReturn(List.of());
        return new AdminModelServiceImpl(adminModelMapper, trafficMapper, registry, new ModelRunLocator(modelRoot.toString()),
                launcher, JsonMapper.builder().build(), runDir.toString());
    }

    private Path run(String family, String name, String schema, String reportFile, String report) throws Exception {
        Path dir = Files.createDirectories(modelRoot.resolve(family).resolve(name));
        Files.writeString(dir.resolve("metadata.json"), "{\"schema\": \"" + schema + "\"}");
        Files.writeString(dir.resolve(reportFile), report);
        return dir;
    }

    @Test
    void 후보는_학습_파일이_아닌_실행_서버에서_조회한다() throws Exception {
        var upstream=new Upstream("http://runtime.test",true,"model-a","test",true,1,1);
        when(registry.upstreams()).thenReturn(List.of(upstream));
        when(registry.candidates(upstream)).thenReturn(JsonMapper.builder().build().readTree("[{\"id\":\"runtime\",\"brand\":\"runtime brand\",\"price\":23980000}]"));
        var result = service().getCandidates();
        assertThat(result.candidates()).extracting(com.kh.back.admin.dto.AdminCandidate::id).containsExactly("runtime");
        assertThat(result.warnings()).isEmpty();
    }

    @Test
    void 카탈로그가_다른_서버가_있어도_기준_서버_값으로_보여_주고_경고한다() throws Exception {
        var base=new Upstream("http://base.test",true,"model-a","test",true,2,2);
        var other=new Upstream("http://other.test",true,"model-b","test",true,2,2);
        var json=JsonMapper.builder().build();
        when(registry.upstreams()).thenReturn(List.of(base, other));
        when(registry.candidates(base)).thenReturn(json.readTree("[{\"id\":\"car-1\",\"price\":23980000},{\"id\":\"car-2\",\"price\":30000000}]"));
        when(registry.candidates(other)).thenReturn(json.readTree("[{\"id\":\"car-1\",\"price\":25000000},{\"id\":\"car-3\",\"price\":40000000}]"));

        var result = service().getCandidates();

        assertThat(result.candidates()).extracting(com.kh.back.admin.dto.AdminCandidate::id, com.kh.back.admin.dto.AdminCandidate::price)
                .containsExactly(org.assertj.core.groups.Tuple.tuple("car-1", 23980000L), org.assertj.core.groups.Tuple.tuple("car-2", 30000000L),
                        org.assertj.core.groups.Tuple.tuple("car-3", 40000000L));
        assertThat(result.warnings()).containsExactly("model-b 서버의 차량 1건이 기준 서버(model-a)와 다릅니다. 목록은 기준 서버 값으로 보여 줍니다.");
    }

    @Test
    void 일부_서버_조회가_실패해도_나머지로_목록을_보여_준다() throws Exception {
        var base=new Upstream("http://base.test",true,"model-a","test",true,1,1);
        var broken=new Upstream("http://broken.test",true,"model-b","test",true,1,1);
        when(registry.upstreams()).thenReturn(List.of(base, broken));
        when(registry.candidates(base)).thenReturn(JsonMapper.builder().build().readTree("[{\"id\":\"car-1\",\"price\":23980000}]"));
        when(registry.candidates(broken)).thenThrow(new IllegalStateException("Invalid runtime catalog"));

        var result = service().getCandidates();

        assertThat(result.candidates()).extracting(com.kh.back.admin.dto.AdminCandidate::id).containsExactly("car-1");
        assertThat(result.warnings()).containsExactly("model-b 서버의 후보를 불러오지 못해 목록에서 제외했습니다.");
    }

    @Test
    void 모든_서버_조회가_실패하면_빈_목록_대신_503을_낸다() {
        var broken=new Upstream("http://broken.test",true,"model-b","test",true,1,1);
        when(registry.upstreams()).thenReturn(List.of(broken));
        when(registry.candidates(broken)).thenThrow(new IllegalStateException("Invalid runtime catalog"));
        assertThatThrownBy(() -> service().getCandidates()).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    @Test
    void 실행_후보_조회_실패를_빈_목록으로_숨기지_않는다() {
        when(registry.upstreams()).thenReturn(List.of());
        assertThatThrownBy(() -> service().getCandidates()).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }

    // 비교 표: 계열마다 다른 파일 모양을 같은 열로 맞추고, 추천 서버 · 비율 · 사용량 · 진단 수를 모델 이름으로 이어 붙인다
    @Test
    void 비교_표는_모든_학습_결과_폴더와_서빙_비율_사용량을_합친다() throws Exception {
        run("scenario-choices", "model-a", "ui-scenario-height-ranker-v2", "training_report.json", """
                {"validation": {"profiles": 1000, "comparisons": 5000},
                 "results": {"mlp": {"accuracy": 0.69, "log_loss": 0.55}, "linear": {"accuracy": 0.68}}}
                """);
        run("scenario-choices", "model-v1", "scenario-ranker-v1", "training_report.json", """
                {"data_validation": {"profiles": 10000, "comparisons": 100000},
                 "test": {"mlp": {"accuracy": 0.74, "log_loss": 0.47}, "linear": {"accuracy": 0.73}}}
                """);
        run("candidate-preferences", "model-pair", "candidate-preferences-v3", "training_report.json", """
                {"data": {"split_counts": {"train": {"profiles": 100}, "validation": {"profiles": 20}, "test": {"profiles": 30}}},
                 "holdout": {"new": {"pairs": 900, "accuracy": 0.97}, "old": {"accuracy": 0.91}}}
                """);
        when(registry.upstreams()).thenReturn(List.of(
                new Upstream("http://127.0.0.1:8002", true, "model-a", "ui-scenario-height-ranker-v2", true, 281, 80),
                new Upstream("http://127.0.0.1:8003", true, "model-elsewhere", "ui-scenario-ranker-v1", true, 281, 80),
                new Upstream("http://127.0.0.1:8004", false, null, null, false, null, null)));
        TrafficRow weight = new TrafficRow();
        weight.setModelBundle("model-a");
        weight.setWeightPercent(100);
        when(trafficMapper.findAllocations()).thenReturn(List.of(weight));
        UsageRow usage = new UsageRow();
        usage.setModelBundle("model-a");
        usage.setRequests(42);
        when(trafficMapper.sumUsage(7)).thenReturn(List.of(usage));
        AdminModelService service = service();
        ModelVersionRow version = new ModelVersionRow();
        version.setVersionLabel("model-a");
        version.setDiagnoses(5);
        when(adminModelMapper.findVersions()).thenReturn(List.of(version));

        AdminModelComparison comparison = service.getComparison();

        assertThat(comparison.trafficConfigured()).isTrue();
        assertThat(comparison.upstreams()).hasSize(3);
        assertThat(comparison.models()).extracting(ModelRow::runName)
                .containsExactlyInAnyOrder("model-a", "model-v1", "model-pair", "model-elsewhere");
        ModelRow a = row(comparison, "model-a");
        assertThat(a.runId()).isEqualTo("scenario-choices/model-a");
        assertThat(a.testAccuracy()).isEqualTo(0.69);
        assertThat(a.testLogLoss()).isEqualTo(0.55);
        assertThat(a.baselineAccuracy()).isEqualTo(0.68);
        assertThat(a.profiles()).isEqualTo(1000L);
        assertThat(a.servable()).isTrue();
        assertThat(a.compatible()).isTrue();
        assertThat(a.weightPercent()).isEqualTo(100);
        assertThat(a.requests7Days()).isEqualTo(42);
        assertThat(a.diagnoses()).isEqualTo(5);
        ModelRow v1 = row(comparison, "model-v1");
        assertThat(v1.testAccuracy()).isEqualTo(0.74);
        assertThat(v1.profiles()).isEqualTo(10000L);
        assertThat(v1.servable()).isFalse();
        ModelRow pair = row(comparison, "model-pair");
        assertThat(pair.testAccuracy()).isEqualTo(0.97);
        assertThat(pair.baselineLabel()).isEqualTo("이전 모델");
        assertThat(pair.profiles()).isEqualTo(150L);
        assertThat(pair.compatible()).isFalse(); // 지금 화면 입력과 다른 구조 → 비율을 줄 수 없다
        ModelRow elsewhere = row(comparison, "model-elsewhere");
        assertThat(elsewhere.runId()).isNull();
        assertThat(elsewhere.servable()).isTrue();
    }

    @Test
    void 고른_폴더의_상세를_읽고_모델_위치_밖은_404() throws Exception {
        run("scenario-choices", "model-a", "ui-scenario-height-ranker-v2", "training_report.json", "{\"history\": []}");
        AdminModelService service = service();

        assertThat(service.getReport("scenario-choices/model-a").runName()).isEqualTo("model-a");
        assertThatThrownBy(() -> service.getReport("scenario-choices/nothing"))
                .isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", "MODEL_RUN_NOT_FOUND");
        assertThatThrownBy(() -> service.getReport("../etc"))
                .isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", "MODEL_RUN_NOT_FOUND");
        assertThatThrownBy(() -> service.getReport("../" + runDir.getFileName()))
                .isInstanceOf(ApiException.class).hasFieldOrPropertyWithValue("code", "MODEL_RUN_NOT_FOUND");
    }

    private static ModelRow row(AdminModelComparison comparison, String runName) {
        return comparison.models().stream().filter(r -> r.runName().equals(runName)).findFirst().orElseThrow();
    }

    @Test
    void 새_형식_학습_결과는_training_report_에서_읽는다() throws Exception {
        Files.writeString(runDir.resolve("metadata.json"), "{\"schema\": \"ui-scenario-height-ranker-v2\"}");
        Files.writeString(runDir.resolve("training_report.json"), """
                {"validation": {"profiles": 396746, "comparisons": 3000000},
                 "partitions": {"train": {"profiles": 277729}, "validation": {"profiles": 59461}, "test": {"profiles": 59556}},
                 "results": {"mlp": {"accuracy": 0.6931}},
                 "history": [{"epoch": 1, "training_log_loss": 0.5596, "validation": {"accuracy": 0.6915}}],
                 "limitation": "Synthetic generated choices"}
                """);

        AdminModelReport report = service().getReport();

        assertThat(report.available()).isTrue();
        assertThat(report.schema()).isEqualTo("ui-scenario-height-ranker-v2");
        assertThat(report.profiles()).isEqualTo(396746L);
        assertThat(report.preferencePairs()).isEqualTo(3000000L);
        assertThat(report.splitProfiles()).isEqualTo(new SplitProfiles(277729, 59461, 59556));
        assertThat(report.testPairAccuracy()).isEqualTo(0.6931);
        assertThat(report.history()).containsExactly(new Epoch(1, 0.5596, 0.6915));
        assertThat(report.meaning()).isEqualTo("Synthetic generated choices");
        assertThat(report.heldOutModels()).isNull();
        assertThat(report.metrics()).isEmpty();
    }

    @Test
    void 옛_형식_학습_결과는_report_에서_읽는다() throws Exception {
        Files.writeString(runDir.resolve("metadata.json"), "{\"schema\": \"candidate-v2\"}");
        Files.writeString(runDir.resolve("report.json"), """
                {"generation": {"profiles": 100000, "held_out_models": ["A", "B"],
                                "counts": {"train_profiles": 70000, "validation_profiles": 15000, "test_profiles": 15000}},
                 "history": [{"epoch": 1, "loss": 0.4, "validation_pair_accuracy": 0.8}],
                 "comparison": {"metrics": {"old": {"final_ndcg_at_3": 0.5}, "new": {"final_ndcg_at_3": 0.6}}}}
                """);

        AdminModelReport report = service().getReport();

        assertThat(report.available()).isTrue();
        assertThat(report.profiles()).isEqualTo(100000L);
        assertThat(report.heldOutModels()).isEqualTo(2);
        assertThat(report.history()).containsExactly(new Epoch(1, 0.4, 0.8));
        assertThat(report.metrics()).hasSize(1);
    }

    @Test
    void 학습_결과_파일이_없으면_available_은_false() {
        assertThat(service().getReport().available()).isFalse();
    }
}

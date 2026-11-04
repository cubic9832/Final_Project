package com.kh.back.admin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.kh.back.admin.dto.AdminModelReport;
import com.kh.back.admin.dto.AdminModelReport.Epoch;
import com.kh.back.admin.dto.AdminModelReport.SplitProfiles;
import com.kh.back.admin.mapper.AdminModelMapper;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.json.JsonMapper;

// 7단계: 모델 관리 — 추천 서버와 같은 학습 결과 폴더를 읽는다. 새 형식(training_report.json) · 옛 형식(report.json) 모두
class AdminModelServiceTests {

    private final AdminModelMapper adminModelMapper = mock(AdminModelMapper.class);

    @TempDir
    Path runDir;

    private AdminModelService service() {
        when(adminModelMapper.findVersions()).thenReturn(List.of());
        return new AdminModelServiceImpl(adminModelMapper, JsonMapper.builder().build(), runDir.toString());
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

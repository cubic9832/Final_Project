package com.kh.back.diagnosis.mapper;

import com.kh.back.diagnosis.dto.DiagnosisLoan;
import com.kh.back.diagnosis.dto.DiagnosisRow;
import com.kh.back.diagnosis.dto.DiagnosisSummary;
import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

// 재무 진단 기록 — V1 의 input_snapshots · financial_profiles · analysis_runs · model_versions 를 쓴다
@Mapper
public interface DiagnosisMapper {

    Long findModelVersionId(@Param("modelName") String modelName, @Param("versionLabel") String versionLabel);

    // 같은 이름 · 버전이 이미 있으면 아무것도 안 함 (UNIQUE uq_model_version)
    void insertModelVersion(@Param("modelName") String modelName, @Param("versionLabel") String versionLabel);

    Long lockMember(@Param("userId") Long userId);
    Long findByRequestId(@Param("userId") Long userId, @Param("requestId") String requestId);
    void insertSnapshot(DiagnosisRow row);

    void insertFinancialProfile(DiagnosisRow row);

    void insertAnalysisRun(DiagnosisRow row);

    // 기존 대출 여러 건 (loan_inputs, 11-04)
    void insertLoans(@Param("snapshotId") Long snapshotId, @Param("loans") List<DiagnosisLoan> loans);

    // 회원의 최근 진단 (최신 순)
    List<DiagnosisSummary> findRecent(@Param("userId") Long userId, @Param("size") int size);

    // 진단 한 건 자세히 — 본인 기록이 아니면 null (11-04)
    DiagnosisSummary findDetail(@Param("userId") Long userId, @Param("analysisId") Long analysisId);

    List<DiagnosisLoan> findLoans(@Param("snapshotId") Long snapshotId);
}

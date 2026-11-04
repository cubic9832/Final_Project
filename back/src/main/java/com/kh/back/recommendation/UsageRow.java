package com.kh.back.recommendation;

import lombok.Getter;
import lombok.Setter;

// 모델별 추천 요청 수 합계 (SQL 결과)
@Getter
@Setter
public class UsageRow {
    private String modelBundle;
    private long requests;
}

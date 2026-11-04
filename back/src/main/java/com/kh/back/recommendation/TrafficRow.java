package com.kh.back.recommendation;

import lombok.Getter;
import lombok.Setter;

// recommendation_model_traffic 한 줄 (SQL 결과)
@Getter
@Setter
public class TrafficRow {
    private String modelBundle;
    private int weightPercent;
}

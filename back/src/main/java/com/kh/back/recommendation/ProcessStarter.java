package com.kh.back.recommendation;

import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

// 추천 서버 프로세스를 띄우는 경계 (테스트에서는 가짜로 바꾼다). 출력은 log 파일로
@FunctionalInterface
public interface ProcessStarter {

    Process start(List<String> command, Map<String, String> environment, Path log) throws IOException;

    ProcessStarter SYSTEM = (command, environment, log) -> {
        ProcessBuilder builder = new ProcessBuilder(command).redirectErrorStream(true).redirectOutput(log.toFile());
        builder.environment().putAll(environment);
        return builder.start();
    };
}

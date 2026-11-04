package com.kh.back.chatbot.service;

import com.kh.back.chatbot.repository.ChatPromptRepository;
import java.util.List;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ChatPrompt {
    private final ChatPromptRepository prompts;
    public record Built(long versionId, String instruction) {}

    public Built build(String personal, List<ChatKnowledge.Chunk> context) {
        var version = prompts.active();
        String documents = context.stream().map(chunk -> chunk.title() + "\n" + chunk.text()).collect(Collectors.joining("\n\n"));
        return new Built(version.id(), version.content() + "\n[사용자 정보]\n" + personal + "\n\n[검색 자료]\n" + documents);
    }
}

package com.kh.back.chatbot.service;

import com.kh.back.chatbot.dto.*;
import com.kh.back.chatbot.util.PiiMasker;
import com.kh.back.chatbot.repository.ChatHistoryRepository;
import com.kh.back.common.exception.ApiException;
import java.time.LocalDate;
import java.time.Clock;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.locks.ReentrantLock;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ChatServiceImpl implements ChatService {
    private record Usage(LocalDate date, int count) {}
    private final Map<Long, Usage> usage = new ConcurrentHashMap<>();
    private final ReentrantLock[] locks = new ReentrantLock[64];
    private final Semaphore capacity = new Semaphore(4);
    private final ChatMemory memory;
    private final ChatKnowledge knowledge;
    private final ChatPrompt prompt;
    private final GeminiClient gemini;
    private final OpenAiClient openai;
    private final UserContextProvider userContext;
    private final String provider;
    private final Clock clock;
    private final ChatHistoryRepository history;
    private final String geminiModel;
    private final String openaiModel;

    public ChatServiceImpl(ChatMemory memory, ChatKnowledge knowledge, ChatPrompt prompt, GeminiClient gemini,
                           OpenAiClient openai, UserContextProvider userContext,
                           @Value("${chatbot.provider:gemini}") String provider, Clock clock,
                           ChatHistoryRepository history,
                           @Value("${chatbot.gemini.model:gemini-3.5-flash-lite}") String geminiModel,
                           @Value("${spring.ai.openai.chat.options.model:gpt-5.6-luna}") String openaiModel) {
        this.memory = memory; this.knowledge = knowledge; this.prompt = prompt; this.gemini = gemini;
        this.openai = openai; this.userContext = userContext; this.provider = provider;
        this.clock = clock;
        this.history = history; this.geminiModel = geminiModel; this.openaiModel = openaiModel;
        if (!Set.of("gemini", "openai").contains(provider)) throw new IllegalArgumentException("CHATBOT_PROVIDER must be gemini or openai");
        Arrays.setAll(locks, index -> new ReentrantLock());
    }

    @Override
    public ChatResponse reply(Long memberId, ChatRequest request) {
        requireMember(memberId);
        String question = request.message() == null ? "" : request.message().strip();
        if (question.isBlank() || question.length() > 500) throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_INVALID", "질문은 1~500자로 입력해 주세요.");
        if (provider.equals("openai") ? !openai.enabled() : !gemini.enabled())
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "CHAT_NOT_CONFIGURED", "챗봇 API 키가 설정되지 않은 서버입니다.");
        var lock = lock(memberId);
        if (!lock.tryLock()) throw busy();
        boolean acquired = false;
        try {
            if (!(acquired = capacity.tryAcquire())) throw busy();
            LocalDate today = today();
            usage.entrySet().removeIf(entry -> !entry.getValue().date().equals(today));
            int used = usage.getOrDefault(memberId, new Usage(today, 0)).count();
            if (used >= 30) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "CHAT_DAILY_LIMIT", "오늘 질문 횟수(30회)를 모두 사용했습니다. 내일 다시 이용해 주세요.");
            usage.put(memberId, new Usage(today, used + 1));
            String masked = PiiMasker.mask(question);
            // Durable history is separate from the ten messages supplied to the model.
            var stored = history.history(memberId, null, 10).messages().stream()
                .<Message>map(item -> item.role().equals("user") ? new UserMessage(item.text()) : new AssistantMessage(item.text())).toList();
            memory.clear(id(memberId));
            if (!stored.isEmpty()) memory.add(id(memberId), stored);
            List<Message> previous = List.copyOf(memory.get(id(memberId)));
            String lastQuestion = previous.stream().filter(item -> item instanceof UserMessage).reduce((first, second) -> second).map(Message::getText).orElse("");
            var context = knowledge.search(lastQuestion + " " + masked);
            // Free Gemini receives public guidance only, never automatic private financial context.
            String personal = provider.equals("openai") ? userContext.build(memberId) : "개인 결과는 제공되지 않음. 마이페이지에서 확인하도록 안내하세요.";
            String instruction = prompt.build(personal, context);
            String answer = PiiMasker.mask(provider.equals("openai")
                    ? openai.generate(instruction, masked, previous)
                    : gemini.generate(masked, previous.stream().map(item -> new ChatRequest.Turn(item instanceof UserMessage ? "user" : "model", item.getText())).toList(), instruction));
            var pair = history.savePair(memberId, masked, answer, "DIRECT_INPUT", null, "AI", provider,
                provider.equals("openai") ? openaiModel : geminiModel);
            // Store complete masked pairs only after success, keeping failed calls out of memory.
            memory.add(id(memberId), List.of(new UserMessage(masked), new AssistantMessage(answer)));
            return new ChatResponse(answer, masked, 29 - used, context.stream()
                    .map(chunk -> new ChatResponse.Source(chunk.id(), chunk.title(), chunk.text())).toList(), pair.questionId(), pair.answerId());
        } finally {
            if (acquired) capacity.release();
            lock.unlock();
        }
    }

    @Override
    public ChatResponse guideReply(Long memberId, ChatGuideRequest request) {
        requireMember(memberId);
        if (request.guideId() == null || request.guideId().isBlank() || request.guideId().length() > 80)
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_INVALID", "안내 항목을 선택해 주세요.");
        var guide = ChatGuideAnswers.find(request.guideId());
        String source = request.source() == null ? "QUICK_QUESTION" : request.source();
        if (!Set.of("QUICK_QUESTION", "TERM_CLICK").contains(source))
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_INVALID", "올바른 질문 종류를 선택해 주세요.");
        var lock = lock(memberId);
        if (!lock.tryLock()) throw busy();
        try {
            var pair = history.savePair(memberId, guide.question(), guide.answer(), source, request.guideId(), "FIXED", null, null);
            memory.add(id(memberId), List.of(new UserMessage(guide.question()), new AssistantMessage(guide.answer())));
            return new ChatResponse(guide.answer(), guide.question(), remaining(memberId), List.of(), pair.questionId(), pair.answerId());
        } finally { lock.unlock(); }
    }

    private int remaining(Long memberId) {
        Usage current = usage.get(memberId);
        return current == null || !current.date().equals(today()) ? 30 : Math.max(0, 30 - current.count());
    }

    @Override
    public ChatHistoryResponse history(Long memberId) {
        return history(memberId, null);
    }

    @Override
    public ChatHistoryResponse history(Long memberId, Long beforeId) {
        requireMember(memberId);
        if (beforeId != null && beforeId <= 0)
            throw new ApiException(HttpStatus.BAD_REQUEST, "CHAT_INVALID", "올바른 대화 번호를 입력해 주세요.");
        var lock = lock(memberId);
        if (!lock.tryLock()) throw busy();
        try {
            var page = history.history(memberId, beforeId, 20);
            return new ChatHistoryResponse(page.messages(), remaining(memberId), page.hasMore());
        } finally { lock.unlock(); }
    }

    @Override
    public void clear(Long memberId) {
        requireMember(memberId);
        var lock = lock(memberId);
        if (!lock.tryLock()) throw busy();
        try {
            history.startNewConversation(memberId);
            memory.clear(id(memberId));
        } finally { lock.unlock(); }
    }

    private LocalDate today() { return LocalDate.now(clock); }
    private static String id(Long memberId) { return "member-" + memberId; }
    private ReentrantLock lock(Long memberId) { return locks[Math.floorMod(memberId.hashCode(), locks.length)]; }
    private static void requireMember(Long memberId) {
        if (memberId == null) throw new ApiException(HttpStatus.UNAUTHORIZED, "AUTH_REQUIRED", "로그인이 필요합니다.");
    }
    private static ApiException busy() { return new ApiException(HttpStatus.TOO_MANY_REQUESTS, "CHAT_BUSY", "현재 답변을 처리 중입니다. 잠시 후 다시 시도해 주세요."); }
}

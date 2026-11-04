package com.kh.back.notification;

import com.kh.back.common.jwt.JwtProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@AutoConfigureMockMvc
class NotificationControllerTests {
    @Autowired MockMvc mvc;
    @Autowired JwtProvider jwt;
    @Autowired NotificationStream stream;
    // 합성 회원은 실제 DB에 만들지 않으며 알림도 기록하지 않는다.
    @MockitoBean SavingsNotificationRepository repository;

    @Test void guestsCannotReadOrSubscribe() throws Exception {
        mvc.perform(get("/api/v1/notifications")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/notifications/stream")).andExpect(status().isUnauthorized());
    }

    @Test void streamDeliversOnlyTheAuthenticatedMembersEvents() throws Exception {
        var result = mvc.perform(get("/api/v1/notifications/stream")
                .header("Authorization","Bearer " + jwt.createAccessToken(987654L,"USER")))
                .andExpect(status().isOk()).andExpect(request().asyncStarted()).andReturn();
        String initial = result.getResponse().getContentAsString();
        assertTrue(initial.contains("event:ready"));
        stream.changed(987655L);
        assertEquals(initial,result.getResponse().getContentAsString());
        stream.changed(987654L);
        assertTrue(result.getResponse().getContentAsString().contains("event:changed"));
    }

    @Test void invalidEventsAreRejectedAndReadRequestsAreScopedToPrincipal() throws Exception {
        String token = "Bearer " + jwt.createAccessToken(987654L,"USER");
        mvc.perform(post("/api/v1/notifications/savings-events").header("Authorization",token)
                .contentType("application/json").content("{\"eventKey\":\"x\",\"type\":\"RECURRING_RECORDED\",\"amount\":-1}"))
                .andExpect(status().isBadRequest());
        mvc.perform(patch("/api/v1/notifications/9").header("Authorization",token))
                .andExpect(status().isNotFound());
        verify(repository).markRead(987654L,9L);
    }
}

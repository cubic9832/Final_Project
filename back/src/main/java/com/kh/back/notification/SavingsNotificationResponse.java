package com.kh.back.notification;

import java.time.LocalDateTime;

public record SavingsNotificationResponse(long id, long memberId, String title, String message,
                                          boolean read, LocalDateTime createdAt, String href, String type) {}

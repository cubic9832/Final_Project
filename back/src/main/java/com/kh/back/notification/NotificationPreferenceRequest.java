package com.kh.back.notification;

import jakarta.validation.constraints.NotNull;

public record NotificationPreferenceRequest(@NotNull Boolean enabled) {}

package com.kh.back.member.recommendation;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.json.JsonMapper;

class RecommendationInputsTests {
    private final JsonMapper json = JsonMapper.builder().build();
    private RecommendationInputsRequest request(String body) {
        return json.readValue(body, RecommendationInputsRequest.class);
    }

    @Test
    void emptyZeroAndCalculatedLoanPaymentRemainDistinct() {
        var input = request("""
            {"version":0,"financialInputs":{"values":{"income":"","monthlyExpenses":"0"},
            "loanDetails":[{"payment":"1.2345","balance":"123.45","rate":"6","months":"36"}]},
            "vehiclePreferences":{"exteriorAngularity":null,"accelerationPreference":"0.5"}}
            """);
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertThat(factory.getValidator().validate(input)).isEmpty();
        }
        assertThat(input.financialInputs().values().income()).isEmpty();
        assertThat(input.financialInputs().values().monthlyExpenses()).isEqualTo("0");
        assertThat(input.financialInputs().loanDetails().get(0).payment()).isEqualTo("1.2345");
        assertThat(input.vehiclePreferences().exteriorAngularity()).isNull();
    }

    @Test
    void negativeMoneyInvalidPreferencesAndMissingVersionAreRejected() {
        var input = request("""
            {"financialInputs":{"values":{"income":"-1"}},"vehiclePreferences":{"fuel":"unknown"}}
            """);
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertThat(factory.getValidator().validate(input)).hasSize(3);
        }
    }

    @Test
    void staleVersionAndConcurrentCreationCannotOverwriteSavedInput() {
        var repository = mock(RecommendationInputsRepository.class);
        var service = new RecommendationInputsService(repository);
        var input = request("{\"version\":3,\"financialInputs\":{\"values\":{\"income\":\"300\"}}}");
        assertThatThrownBy(() -> service.save(7L, input)).isInstanceOfSatisfying(ResponseStatusException.class,
                error -> assertThat(error.getStatusCode().value()).isEqualTo(409));
        verify(repository, never()).insert(anyLong(), any());
        var first = request("{\"version\":0,\"vehiclePreferences\":{\"fuel\":\"전기\"}}");
        doThrow(new DuplicateKeyException("already saved")).when(repository).insert(7L, first);
        assertThatThrownBy(() -> service.save(7L, first)).isInstanceOfSatisfying(ResponseStatusException.class,
                error -> assertThat(error.getStatusCode().value()).isEqualTo(409));
    }

    @Test
    void successfulUpdateReturnsLatestVersionAndAnonymousCannotRead() {
        var repository = mock(RecommendationInputsRepository.class);
        var service = new RecommendationInputsService(repository);
        var input = request("{\"version\":1,\"vehiclePreferences\":{\"fuel\":null}}");
        when(repository.update(7L, input)).thenReturn(1);
        when(repository.find(7L)).thenReturn(new RecommendationInputsRepository.Saved(null, null, 1, 2));
        assertThat(service.save(7L, input).version()).isEqualTo(2);
        verify(repository).requireMember(7L, true);
        assertThatThrownBy(() -> service.get(null)).isInstanceOfSatisfying(ResponseStatusException.class,
                error -> assertThat(error.getStatusCode().value()).isEqualTo(401));
    }
}

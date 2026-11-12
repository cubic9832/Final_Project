package com.kh.back.member.recommendation;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;

/** Amount strings are in 만 원. Empty and zero are distinct. */
public record RecommendationInputsRequest(
 @NotNull @Min(0) Long version,
 @Valid FinancialInputs financialInputs,
 @Valid VehiclePreferences vehiclePreferences) {
 public record Money(@Pattern(regexp="^$|[0-9]{1,10}(\\.[0-9]{1,2})?") String income,
 @Pattern(regexp="^$|[0-9]{1,10}(\\.[0-9]{1,2})?") String monthlyExpenses) {}
 public record Assets(@Pattern(regexp="^$|[0-9]{1,10}(\\.[0-9]{1,2})?") String deposit) {}
 public record Expenses(@Pattern(regexp="^$|[0-9]{1,10}(\\.[0-9]{1,2})?") String housing, @Pattern(regexp="^$|[0-9]{1,10}(\\.[0-9]{1,2})?") String fixed, @Pattern(regexp="^$|[0-9]{1,10}(\\.[0-9]{1,2})?") String living, @Pattern(regexp="^$|[0-9]{1,10}(\\.[0-9]{1,2})?") String transport, @Pattern(regexp="^$|[0-9]{1,10}(\\.[0-9]{1,2})?") String phone) {}
 public record Loan(@Size(max=64) String id, @Size(max=40) String type,
 @Pattern(regexp="^$|[0-9]{1,10}(\\.[0-9]{1,2})?") String balance,
 @Pattern(regexp="^$|[0-9]{1,3}(\\.[0-9]{1,4})?") String rate,
 @Pattern(regexp="^$|[0-9]{1,4}") String months,
 @Pattern(regexp="^$|[0-9]{1,10}(\\.[0-9]{1,4})?") String payment) {}
 public record FinancialInputs(@Valid Money values, @Valid Assets assets,
 @Size(max=100) List<@Valid Loan> loans, @Size(max=100) List<@Valid Loan> loanDetails,
 @Pattern(regexp="^$|[0-9]{1,10}(\\.[0-9]{1,4})?") String loanPayment,
 Boolean detailedLoans, Boolean detailed, @Valid Expenses expenseBreakdown) {}
 public record VehiclePreferences(
@Pattern(regexp="0|2|3|4|5|6|7|8|9") String minimumSeats,
@Pattern(regexp="0|5|10|15|20|25|30|35|40") String incomeRatio,
@Pattern(regexp="0|6|12|18|24|36|48|60|72") String paymentMonths,
@Pattern(regexp="1|3|5") String costImportance,
@Pattern(regexp="1|3|5") String assetRetentionImportance,
@Pattern(regexp="1|3|5") String runningCostImportance,
@Pattern(regexp="1|3|5") String designImportance,
@Pattern(regexp="1|3|5") String performanceImportance,
@Pattern(regexp="1|3|5") String fuelImportance,
@Pattern(regexp="1|3|5") String spaceImportance,
@Pattern(regexp="1|3|5") String lifestylePurposeImportance,
@Pattern(regexp="any|0|0\\.5|1") String exteriorAngularity,
@Pattern(regexp="any|0|0\\.5|1") String accelerationPreference,
@Pattern(regexp="상관없음|가솔린|하이브리드|디젤|전기|LPG") String fuel,
@Pattern(regexp="any|small|medium|large") String preferredSize,
@Pattern(regexp="any|low|medium|high") String preferredHeight,
@Pattern(regexp="any|commute|family|weekend-drive") String lifestylePurpose, Boolean chargingAvailable) {}
}

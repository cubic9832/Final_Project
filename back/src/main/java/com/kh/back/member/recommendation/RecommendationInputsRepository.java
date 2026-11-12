package com.kh.back.member.recommendation;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import lombok.RequiredArgsConstructor;
import tools.jackson.databind.ObjectMapper;

@Repository
@RequiredArgsConstructor
public class RecommendationInputsRepository {
 private final JdbcTemplate jdbc;
 private final ObjectMapper json;
 public void requireMember(long id, boolean lock) {
  var roles = jdbc.query("SELECT role FROM users WHERE id=?" + (lock ? " FOR UPDATE" : ""), (rs,n)->rs.getString(1), id);
  if (roles.isEmpty() || "WITHDRAWN".equals(roles.get(0))) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED,"유효한 회원이 아닙니다.");
 }
 public record Saved(Object financialInputs, Object vehiclePreferences, int schemaVersion, long version) {}
 public Saved find(long userId) {
  return jdbc.query("SELECT financial_inputs, vehicle_preferences, schema_version, version FROM user_recommendation_inputs WHERE user_id=?",
   (rs,n)->new Saved(decode(rs.getString(1)),decode(rs.getString(2)),rs.getInt(3),rs.getLong(4)), userId).stream().findFirst().orElse(null);
 }
 private Object decode(String value) { return value==null?null:json.readTree(value); }
 public int update(long id, RecommendationInputsRequest request) {
  return jdbc.update("UPDATE user_recommendation_inputs SET financial_inputs=COALESCE(?,financial_inputs), vehicle_preferences=COALESCE(?,vehicle_preferences),version=version+1 WHERE user_id=? AND version=?",
   encode(request.financialInputs()),encode(request.vehiclePreferences()),id,request.version());
 }
 public void insert(long id, RecommendationInputsRequest request) {
  jdbc.update("INSERT INTO user_recommendation_inputs(user_id,financial_inputs,vehicle_preferences) VALUES(?,?,?)",id,encode(request.financialInputs()),encode(request.vehiclePreferences()));
 }
 private String encode(Object value) { return value==null?null:json.writeValueAsString(value); }
}

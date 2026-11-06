-- V26의 가상 회원 40명을 보완하고 가상 회원 묶음을 100명으로 확장한다.
-- 실제 회원 및 로컬 전용 계정(user1~5, @compa.test 등)은 변경하지 않는다.
-- @demo.compa.local 표식은 실제 메일 발송 방지와 기존 데모 통계 구분을 위해 유지한다.
-- BCrypt 해시는 개별 난수 비밀번호에서 생성했으며 원문을 보관하지 않는다. 공용 로그인 비밀번호가 아니다.
-- GOOGLE 전용 계정의 SOCIAL_ONLY는 실제 서비스에서도 사용하는 구분값이므로 유지한다.
-- 이미 적용된 V26/V39는 수정하지 않는다. 기존 가상 회원의 ID와 상담·진단·대화 이력을 보존한다.

CREATE TEMPORARY TABLE seed_member_v40 (
    n INT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    nick_name VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    birth_date DATE NOT NULL,
    gender VARCHAR(10) NOT NULL,
    user_id BIGINT NULL
);
INSERT INTO seed_member_v40 (n,email,nick_name,password_hash,birth_date,gender) VALUES
(1, 'doyun.kim@demo.compa.local', '민지운영', '$2a$10$ucKAgc5TIPhRdO1NuoIFYO.TuEq2fiHAOfHiWNsLRGdX9QsSRyucC', '1971-02-02', 'MALE'),
(2, 'seoyeon.kim@demo.compa.local', '준호상담', '$2a$10$iBCZE6c6NSNJC3rlv6qNv.zR.1t7fuJeoylsRRyfTeQggioXzf8.y', '1972-03-03', 'FEMALE'),
(3, 'jiho.kim@demo.compa.local', '김지호', '$2a$10$E0HklREc4Hi.1iI3Bxseru77bSJTtuzyahb/vCHj3XyJsOjzDtPRa', '1973-04-04', 'MALE'),
(4, 'haeun.kim@demo.compa.local', '김하은', '$2a$10$1Rp9y7fy0ff60vPm71TE..PSbGt/zcCj986NgGucesMjCLcHSnk4C', '1974-05-05', 'FEMALE'),
(5, 'minjun.kim@demo.compa.local', '김민준', '$2a$10$SQnzmOlTTZcD.xp6MKzk8OQUdhc0Qx6Lv.NZksvnnZsUZXlNKxM86', '1975-06-06', 'MALE'),
(6, 'subin.kim@demo.compa.local', '김수빈', '$2a$10$eNGxzCXHbWwx7DnZavujtuMVrJ5L9DCbH2rm46oqX7i1UTwjMip.e', '1976-07-07', 'FEMALE'),
(7, 'hyunwoo.kim@demo.compa.local', '김현우', '$2a$10$vg2NGGInrYAI0NOM5dwsce6yWlELYhTIVV0tNC1pscQCyhZC50tFW', '1977-08-08', 'MALE'),
(8, 'jiwoo.kim@demo.compa.local', '김지우', '$2a$10$YHMwBD/tA1uILt8.NNAdDOqNcndH41AhC/Bb3O8Ur8iVsIkgjxzny', '1978-09-09', 'FEMALE'),
(9, 'yujin.kim@demo.compa.local', '김유진', '$2a$10$s/Ie8P7pSXL1AsxuGo9Z4O85Nsz6rjVkSUP4kemX/s6GhpyEugGjK', '1979-10-10', 'MALE'),
(10, 'sion.kim@demo.compa.local', '김시온', '$2a$10$NTS006L/Tcvj2unFodLV/e2STxS5UE8NV/1mQfb/IC1WZigT.flLS', '1980-11-11', 'FEMALE'),
(11, 'doyun.lee@demo.compa.local', '이도윤', '$2a$10$XBhu3lwOhrvopNCB.RtoROOfE1PFYuMjeVwnc66ZtSLx8P/JChBn.', '1981-12-12', 'MALE'),
(12, 'seoyeon.lee@demo.compa.local', '이서연', '$2a$10$PVKLZmmFebFp.VsrjwVYmuhtlh5gLAorXaNfMO8lgKZBcgcLvZqlO', '1982-01-13', 'FEMALE'),
(13, 'jiho.lee@demo.compa.local', '이지호', '$2a$10$3zFg8MecwuCw7YvtPwk1s.CWPJj5Sp9Z/V12VNxv5kz7IxcL70KOu', '1983-02-14', 'NONE'),
(14, 'haeun.lee@demo.compa.local', '이하은', '$2a$10$Q59YLwciYEl2VWtfdMsb7OlqE2/gHfnKCbdSSrEfFOw0ajEcbua7W', '1984-03-15', 'FEMALE'),
(15, 'minjun.lee@demo.compa.local', '이민준', '$2a$10$DsvK.TeSfuOWUsbSYp0nku37IyS2tHiT2PdDRKaFiTIaMVB8qOwnC', '1985-04-16', 'MALE'),
(16, 'subin.lee@demo.compa.local', '이수빈', '$2a$10$rH8MdklIwUMWLhQ06P5xDOAjzXCSHN5AINz0bEDa7UVj5LArbHLhO', '1986-05-17', 'FEMALE'),
(17, 'hyunwoo.lee@demo.compa.local', '이현우', '$2a$10$UtSYEQ2ggZoRiePk1SBVmuZf8d8jwyNPJEu9bZSErXJuMXmy/ucQO', '1987-06-18', 'MALE'),
(18, 'jiwoo.lee@demo.compa.local', '이지우', '$2a$10$6jZqNR/2sAhFRqTu3JkbueylruDuRSTFiXPaArfBe4zAcMsXeY7ku', '1988-07-19', 'FEMALE'),
(19, 'yujin.lee@demo.compa.local', '이유진', '$2a$10$z85SpiDe2HEP1kjUldKH6uCTbL6wbCZMVb3YaD9Abg0p.1FNw7SaG', '1989-08-20', 'MALE'),
(20, 'sion.lee@demo.compa.local', '이시온', '$2a$10$7JpsWaChdTQEDBlOJc/MWOOnak16lp5HOIOHHt18VhHEjJjMjmuRa', '1990-09-21', 'FEMALE'),
(21, 'doyun.park@demo.compa.local', '박도윤', '$2a$10$UDGILXUdqFobD86zrv0KMu/EAe22z7DV1Gxiy6hApCVsfoESZo8EO', '1991-10-22', 'MALE'),
(22, 'seoyeon.park@demo.compa.local', '박서연', '$2a$10$RqobnFrdQh4xC5AcKmlNXeqhlStpvzVJfmtcrHoRFV15.gIHfYxU.', '1992-11-23', 'FEMALE'),
(23, 'jiho.park@demo.compa.local', '박지호', '$2a$10$b.7pZDQcsMxWEdPAAh7N0OilZ/tCJ/1yZo4GbT/kBYF9rTnDGzLzm', '1993-12-24', 'MALE'),
(24, 'haeun.park@demo.compa.local', '박하은', '$2a$10$Z2W/geG6GzDBgV3euLTGauZFHfLBqgpCA51GcYwKYxBKkKWPdZHE6', '1994-01-25', 'FEMALE'),
(25, 'minjun.park@demo.compa.local', '박민준', '$2a$10$GXYkvF2bHxvU5Wg1u0TptO/dlz1cUKNUxR6n9dKOcNwZ67owHmm1q', '1995-02-26', 'MALE'),
(26, 'subin.park@demo.compa.local', '박수빈', '$2a$10$F5erbpf9YdFkdxx6Hs99gu9uuxh0Hatk6LuHcDi4ZFSVpqfh6HWj.', '1996-03-27', 'NONE'),
(27, 'hyunwoo.park@demo.compa.local', '박현우', '$2a$10$.z1c9F0IamAON4URYlPHXunjgZmrk/G9jpyaruYzjdsrPEm3ItFr6', '1997-04-01', 'MALE'),
(28, 'jiwoo.park@demo.compa.local', '박지우', '$2a$10$rQYfPPZgWLis9lCRd8ATLeT8OL4IZHHiksoG6UCAA7Ye6cJqXC/Dq', '1998-05-02', 'FEMALE'),
(29, 'yujin.park@demo.compa.local', '박유진', '$2a$10$SQFFR/n36A3gatT62JFoWeaBMCmKY6/YsCBDkj1vHLnB.LzSB0uXO', '1999-06-03', 'MALE'),
(30, 'sion.park@demo.compa.local', '박시온', '$2a$10$qn3Na9BZqxrJex6FigSfM.RYRRksmDPsdxcP2WOawX4lnd9fmOcki', '2000-07-04', 'FEMALE'),
(31, 'doyun.choi@demo.compa.local', '최도윤', '$2a$10$t7sBX.IVg2iZeu.tRzun.OnT4IQ.eBZwhqQ9TEWSE2XHn5XxS5i12', '2001-08-05', 'MALE'),
(32, 'seoyeon.choi@demo.compa.local', '최서연', '$2a$10$MbqEd//.bwB31957rzQqn.Z8Mxff51EOoHVOGTLFc8AT5yiGcyw/W', '2002-09-06', 'FEMALE'),
(33, 'jiho.choi@demo.compa.local', '최지호', '$2a$10$fQihJVhr9NeuFwUaraVdGebwidE79uk6TcNE5bK.oLUYSmvcvWsPu', '2003-10-07', 'MALE'),
(34, 'haeun.choi@demo.compa.local', '최하은', '$2a$10$LRFZY6Ctyg/29RjFh2dtQO9kRzHVrWGzUeAtfBDsO2Knbj3DGpfYG', '2004-11-08', 'FEMALE'),
(35, 'minjun.choi@demo.compa.local', '최민준', '$2a$10$bQpcq7fjBkAuS2wtTW4Ske/ynAj5MqiDTXlKpc4OID/yENpQ75dke', '1970-12-09', 'MALE'),
(36, 'subin.choi@demo.compa.local', '최수빈', '$2a$10$iOyjKZTLPhzq6onpTWzgaemMpyTNvnRk2vXCpu.UlRkpyQ/7KUNpi', '1971-01-10', 'FEMALE'),
(37, 'hyunwoo.choi@demo.compa.local', '최현우', '$2a$10$g3fr/BpWaej9PwPI1aLe5.6qGweEYD3C0mlTIW8x/pjemzpnoGm92', '1972-02-11', 'MALE'),
(38, 'jiwoo.choi@demo.compa.local', '최지우', '$2a$10$RaqEmh/D4YogawFrKXUk0.hPtOcPQXliO0PZzEUi1dNtW5SBcOaea', '1973-03-12', 'FEMALE'),
(39, 'yujin.choi@demo.compa.local', '최유진', '$2a$10$W.RNQqdml6v7M44WzHVHneWSycycBXgZpeIkNGtqL67946E8Psmg6', '1974-04-13', 'NONE'),
(40, 'sion.choi@demo.compa.local', '최시온', '$2a$10$6076ISghJjwulYXo.qnn9ef2x0KFvaBRhvAqqDOuC2dC67AlQQzk.', '1975-05-14', 'FEMALE'),
(41, 'doyun.jung@demo.compa.local', '정도윤', '$2a$10$tckoboBpoywWDoB8ucOIbOoMiLUK1BGVHisLBXex2Qv6We1H9xs2K', '1976-06-15', 'MALE'),
(42, 'seoyeon.jung@demo.compa.local', '정서연', '$2a$10$OQlE6/DuVxTDk.ncZHO7z.uWMf0YVkhis/KQfGuZs82cIV91Y.ypK', '1977-07-16', 'FEMALE'),
(43, 'jiho.jung@demo.compa.local', '정지호', '$2a$10$pTdcDPZU37yO9YgKYb05YOCVdFboQBRKtfxEZw.Zu23HB7uR.HMty', '1978-08-17', 'MALE'),
(44, 'haeun.jung@demo.compa.local', '정하은', '$2a$10$aXPZYkKX9V4s1shMSnJ9SOIeUGG.UFthj5G0fJ3bQ6cO94TtNhJPC', '1979-09-18', 'FEMALE'),
(45, 'minjun.jung@demo.compa.local', '정민준', 'SOCIAL_ONLY', '1980-10-19', 'MALE'),
(46, 'subin.jung@demo.compa.local', '정수빈', '$2a$10$c6waHVau6asO1H6oZu.AvOFabo6RYLsDgtm23C5SKYj9W5iGCBSNq', '1981-11-20', 'FEMALE'),
(47, 'hyunwoo.jung@demo.compa.local', '정현우', '$2a$10$iojq.zrpFsxL1xK93N4AmuiRILRx27wDw72KFel.guXuNWCTeoQJi', '1982-12-21', 'MALE'),
(48, 'jiwoo.jung@demo.compa.local', '정지우', '$2a$10$JTgzpXuwtAUDRmemkVwPjOmdARl7xmpFTv6IY9hbSOtpeV4B663rG', '1983-01-22', 'FEMALE'),
(49, 'yujin.jung@demo.compa.local', '정유진', '$2a$10$bljziIpkUCcv065bNsSTFOdrLkt/I4MnxtMLP/1qyC5Y34G0RbzZ.', '1984-02-23', 'MALE'),
(50, 'sion.jung@demo.compa.local', '정시온', 'SOCIAL_ONLY', '1985-03-24', 'FEMALE'),
(51, 'doyun.kang@demo.compa.local', '강도윤', '$2a$10$zYuUaU1r1bdbXFxCau9JSe8lh0AizbZHVruoluAhi3UluZVxzSFNq', '1986-04-25', 'MALE'),
(52, 'seoyeon.kang@demo.compa.local', '강서연', '$2a$10$.PiQPobCo5q8dfqGKfWdnuoetCHdr6lYwqEX16s0KzSGkLlJj/o0W', '1987-05-26', 'NONE'),
(53, 'jiho.kang@demo.compa.local', '강지호', '$2a$10$2rg4Miq6RPtKN/Me18s7..pRk.oF3FwoMhWNRuC5a/FJBSwS801dq', '1988-06-27', 'MALE'),
(54, 'haeun.kang@demo.compa.local', '강하은', '$2a$10$fy9MGefQT8TSJMO.PTL5WefBIIgqcLSwUgTvIYVzIxXQO96dJkoHy', '1989-07-01', 'FEMALE'),
(55, 'minjun.kang@demo.compa.local', '강민준', 'SOCIAL_ONLY', '1990-08-02', 'MALE'),
(56, 'subin.kang@demo.compa.local', '강수빈', '$2a$10$sXKkB8cnI3agF2M/k.Bm8OtfTxFsioqIVMtXof/IYzcN4zpSnfzJu', '1991-09-03', 'FEMALE'),
(57, 'hyunwoo.kang@demo.compa.local', '강현우', '$2a$10$hgecTVGvhwvqCirgLKv/c.B1MhNN93SepZYjBj1aoKengJ.QAc95u', '1992-10-04', 'MALE'),
(58, 'jiwoo.kang@demo.compa.local', '강지우', '$2a$10$0MJ7D7fGYvPDAETKZU3R8.YVIFs5liUOLbtiylkYifd1GUfecsQEK', '1993-11-05', 'FEMALE'),
(59, 'yujin.kang@demo.compa.local', '강유진', '$2a$10$rUuGw/SaUHSBpFVfpx6DSehha5IgShrzxEw2rcXtzSNACdzTQdNK2', '1994-12-06', 'MALE'),
(60, 'sion.kang@demo.compa.local', '강시온', 'SOCIAL_ONLY', '1995-01-07', 'FEMALE'),
(61, 'doyun.cho@demo.compa.local', '조도윤', '$2a$10$NSAt7XRROMw.EZW7hddj6O1vonb1TrPCuwzy2GpB2bPA2hwbed/Qy', '1996-02-08', 'MALE'),
(62, 'seoyeon.cho@demo.compa.local', '조서연', '$2a$10$rRHrkfWRx/3kCLEpkgTStOjPW4Co6YELto6U2DYQdmwddcKyDqpG6', '1997-03-09', 'FEMALE'),
(63, 'jiho.cho@demo.compa.local', '조지호', '$2a$10$5cdiozv7xvUJr1UiEmWNe.u.HWgn3qgxBcDn83wfQf/NZ9RbeCxGu', '1998-04-10', 'MALE'),
(64, 'haeun.cho@demo.compa.local', '조하은', '$2a$10$qmH/BWGSkdbgd/Rk3ZvHP.ahhk0MLcaMOT8pmBi4S8.A5yuydU.gW', '1999-05-11', 'FEMALE'),
(65, 'minjun.cho@demo.compa.local', '조민준', 'SOCIAL_ONLY', '2000-06-12', 'NONE'),
(66, 'subin.cho@demo.compa.local', '조수빈', '$2a$10$pBPo.l0GUo3WyyiuRpvyy.AUAwtpLwIpZNRdapOyC9SK6RAWHdEkO', '2001-07-13', 'FEMALE'),
(67, 'hyunwoo.cho@demo.compa.local', '조현우', '$2a$10$cVs.lc87FNRmQDO.bvB0GOrlEbBJagOodr09nYmwqPLXpXmynTqO2', '2002-08-14', 'MALE'),
(68, 'jiwoo.cho@demo.compa.local', '조지우', '$2a$10$AQTzWkt0GhOTveRi62/XRefDwo2Pzzv3YFubViedXFeSi7po0qH.6', '2003-09-15', 'FEMALE'),
(69, 'yujin.cho@demo.compa.local', '조유진', '$2a$10$tqVYbxnqSCl6iecu54EKjOJgrvFJsMIE4yNU9k3JBLeojeigPeIE.', '2004-10-16', 'MALE'),
(70, 'sion.cho@demo.compa.local', '조시온', 'SOCIAL_ONLY', '1970-11-17', 'FEMALE'),
(71, 'doyun.yoon@demo.compa.local', '윤도윤', '$2a$10$fq6wQgeJ2aeucoD/d5rMb.JVZVw3GfvJO25dTst5tjfUzkXU84mH6', '1971-12-18', 'MALE'),
(72, 'seoyeon.yoon@demo.compa.local', '윤서연', '$2a$10$2ERqfzeuMjnuhtQQW3wCt.KSiL2TOaZWz1MkXQT0VHwcOt/QfSJR2', '1972-01-19', 'FEMALE'),
(73, 'jiho.yoon@demo.compa.local', '윤지호', '$2a$10$ljzfSl68yTJULfHOqh6W2uURxBmJD35V0r5SYbEMl.mdysPgtpwG2', '1973-02-20', 'MALE'),
(74, 'haeun.yoon@demo.compa.local', '윤하은', '$2a$10$JSo0ECSzyv.avFc6p5PaM.rVCTfg.w7Ui0CDDlAb9eFRyMRQtjNey', '1974-03-21', 'FEMALE'),
(75, 'minjun.yoon@demo.compa.local', '윤민준', 'SOCIAL_ONLY', '1975-04-22', 'MALE'),
(76, 'subin.yoon@demo.compa.local', '윤수빈', '$2a$10$Y1oeYQHE38HysKQ706yIwOaYG2XMg6Hp8HYNLTd4vJkMNb1SW8D0K', '1976-05-23', 'FEMALE'),
(77, 'hyunwoo.yoon@demo.compa.local', '윤현우', '$2a$10$paX5K7S1kjBTe2yxy/7t2eWhuoW5jl7jcZ2pc.uGdHUW98VwxswEK', '1977-06-24', 'MALE'),
(78, 'jiwoo.yoon@demo.compa.local', '윤지우', '$2a$10$1KNlpe363F2GihynQVCLxO458cnKiMkS04gur641OTJqibm7oopGC', '1978-07-25', 'NONE'),
(79, 'yujin.yoon@demo.compa.local', '윤유진', '$2a$10$09xgoydvmF72KT7SJdnvA.CYirj/VpYjUjvBd/vic2ECo/Fmt1YSy', '1979-08-26', 'MALE'),
(80, 'sion.yoon@demo.compa.local', '윤시온', 'SOCIAL_ONLY', '1980-09-27', 'FEMALE'),
(81, 'doyun.jang@demo.compa.local', '장도윤', '$2a$10$g7YzmHY42mu2GZ86U4QTMOA/yy/9QU9E54YXrMEZa92LnLkXgmNTG', '1981-10-01', 'MALE'),
(82, 'seoyeon.jang@demo.compa.local', '장서연', '$2a$10$xDUmBSan4Y1mTrL2zAsVzOZU2YtS77Pcv2atv4jJDFJHoSUAVnCdu', '1982-11-02', 'FEMALE'),
(83, 'jiho.jang@demo.compa.local', '장지호', '$2a$10$4G6teI5Hr60Pch12eN71HOOtP5cLiUc0z9hjd6KKwyvj1rjCNKuVy', '1983-12-03', 'MALE'),
(84, 'haeun.jang@demo.compa.local', '장하은', '$2a$10$E65VBA8gdkpJXY/rCHcR/.8U03JUywV9KPAwMwQQFEoF/3Px3hH1K', '1984-01-04', 'FEMALE'),
(85, 'minjun.jang@demo.compa.local', '장민준', 'SOCIAL_ONLY', '1985-02-05', 'MALE'),
(86, 'subin.jang@demo.compa.local', '장수빈', '$2a$10$MBGLmDVguGNs3R6OhFDDzu/Z1W.GWXcllhivoRahIPotS1VQmyk6.', '1986-03-06', 'FEMALE'),
(87, 'hyunwoo.jang@demo.compa.local', '장현우', '$2a$10$CVfFIu8SPdZA0EVN6NGBs.RVuCiRJUdXhfZ6ZCwctCQiL41ptfxdm', '1987-04-07', 'MALE'),
(88, 'jiwoo.jang@demo.compa.local', '장지우', '$2a$10$jsBmp5MYYan4CCClkse4Iut98Ryvo3L1qh/gwP4AyQC5CMw7/aBVC', '1988-05-08', 'FEMALE'),
(89, 'yujin.jang@demo.compa.local', '장유진', '$2a$10$DVi.fHHGEalVI2uZCBX8j.SnXQ0VReOTN/UT0OFyD.kgcjzMeGm8G', '1989-06-09', 'MALE'),
(90, 'sion.jang@demo.compa.local', '장시온', 'SOCIAL_ONLY', '1990-07-10', 'FEMALE'),
(91, 'doyun.lim@demo.compa.local', '임도윤', '$2a$10$3MBr6/DLRcZ98VplPo40t.HnSirym162A1cDWQ0hRdfP58uqtGugW', '1991-08-11', 'NONE'),
(92, 'seoyeon.lim@demo.compa.local', '임서연', '$2a$10$D70H/dWMWrmyj0uot9s0KOCcdEHVSQjDLMVdr5MfhTqdDEcEuS9N6', '1992-09-12', 'FEMALE'),
(93, 'jiho.lim@demo.compa.local', '임지호', '$2a$10$clDMAkTY.2AXStPHWfFiJu1QB/tu8iSPvnAxi6/e68SmAhZASeBXi', '1993-10-13', 'MALE'),
(94, 'haeun.lim@demo.compa.local', '임하은', '$2a$10$Byvyuk.lLDl6HLdgCJShAe/j7RhXTIfWNNVmCyFetbKCETqBQjQEW', '1994-11-14', 'FEMALE'),
(95, 'minjun.lim@demo.compa.local', '임민준', 'SOCIAL_ONLY', '1995-12-15', 'MALE'),
(96, 'subin.lim@demo.compa.local', '임수빈', '$2a$10$jCKFIvzCYvUsbzz.qdi3uePCVfU73b27Nh7bjj2B8siL/MaMsEfMK', '1996-01-16', 'FEMALE'),
(97, 'hyunwoo.lim@demo.compa.local', '임현우', '$2a$10$39GDUbnCkwzS7URyO0k9vu55KTMRIYCNyr/qxFXIaIP5l6GfZTzq2', '1997-02-17', 'MALE'),
(98, 'jiwoo.lim@demo.compa.local', '임지우', '$2a$10$j8AMWYgHzrsrtUyliadGJuamrS7Oy9z1Wo/fzo5I9CyrXWFrCLkPq', '1998-03-18', 'FEMALE'),
(99, 'yujin.lim@demo.compa.local', '임유진', '$2a$10$.3Fn6/MySuGFHkxDVFfv0.y/WtptklIrE9pY0jdqsfZbrDAi4Iu7C', '1999-04-19', 'MALE'),
(100, 'sion.lim@demo.compa.local', '임시온', 'SOCIAL_ONLY', '2000-05-20', 'FEMALE');

-- 원래 V26 이메일 또는 이미 정리된 이메일만 대상으로 연결한다.
UPDATE seed_member_v40 s JOIN users u
  ON BINARY u.email = BINARY s.email
  OR (s.n <= 40 AND BINARY u.email = BINARY CONCAT('demo',LPAD(s.n,2,'0'),'@demo.compa.local'))
SET s.user_id = u.id;

UPDATE users u JOIN seed_member_v40 s ON s.user_id = u.id
SET u.email = s.email,
    u.nick_name = CASE WHEN s.n=1 AND u.nick_name='데모관리자민지' THEN '민지운영'
                       WHEN s.n=2 AND u.nick_name='데모관리자준호' THEN '준호상담'
                       ELSE u.nick_name END,
    u.password_hash = IF(u.password_hash='DEMO-ACCOUNT-NO-LOGIN',s.password_hash,u.password_hash),
    u.updated_at = CURRENT_TIMESTAMP
WHERE s.n <= 40;

UPDATE social_accounts a JOIN seed_member_v40 s ON s.user_id=a.user_id
SET a.email=s.email
WHERE s.n<=40 AND a.provider='GOOGLE' AND a.provider_user_id LIKE 'demo-google-%';

-- 추가 회원의 가입일은 기존 가상 회원의 마지막 가입일 이후로 분산한다.
-- 번호가 증가할수록 가입 시각도 증가하게 하며, 미래 일자는 만들지 않는다.
SET @seed_v40_end = CURRENT_TIMESTAMP;
SET @seed_v40_start = (SELECT LEAST(COALESCE(MAX(u.created_at), @seed_v40_end), @seed_v40_end)
                      FROM users u JOIN seed_member_v40 s ON s.user_id=u.id WHERE s.n<=40);
INSERT INTO users(email,password_hash,nick_name,role,created_at,updated_at)
SELECT s.email,s.password_hash,s.nick_name,'USER',
       TIMESTAMPADD(SECOND,FLOOR(TIMESTAMPDIFF(SECOND,@seed_v40_start,@seed_v40_end)*(s.n-40)/60),@seed_v40_start),
       @seed_v40_end
FROM seed_member_v40 s WHERE s.n>40 AND s.user_id IS NULL ORDER BY s.n;

UPDATE seed_member_v40 s JOIN users u ON BINARY u.email=BINARY s.email SET s.user_id=u.id;

INSERT INTO user_profiles(user_id,birth_date,gender,driving_experience,purchase_timing,created_at,updated_at)
SELECT s.user_id,s.birth_date,s.gender,
       ELT(s.n MOD 4+1,'NONE','UNDER_1Y','YEARS_1_3','OVER_3Y'),
       ELT(s.n MOD 4+1,'WITHIN_3M','WITHIN_6M','WITHIN_1Y','UNDECIDED'),u.created_at,u.created_at
FROM seed_member_v40 s JOIN users u ON u.id=s.user_id
WHERE s.n>40 AND NOT EXISTS(SELECT 1 FROM user_profiles p WHERE p.user_id=s.user_id);

INSERT INTO social_accounts(user_id,provider,provider_user_id,email,created_at)
SELECT s.user_id,'GOOGLE',CONCAT('demo-google-',s.n),s.email,u.created_at
FROM seed_member_v40 s JOIN users u ON u.id=s.user_id
WHERE s.n>40 AND (s.n MOD 5=0 OR s.n MOD 7=0)
  AND NOT EXISTS(SELECT 1 FROM social_accounts a WHERE a.user_id=s.user_id AND a.provider='GOOGLE');

INSERT INTO user_agreements(user_id,terms_agreed_at,privacy_agreed_at,email_notification,updates_agreed_at,updated_at)
SELECT s.user_id,u.created_at,u.created_at,ELT(s.n MOD 3+1,'IMPORTANT','ALL','NONE'),
       IF(s.n MOD 3=1,u.created_at,NULL),u.created_at
FROM seed_member_v40 s JOIN users u ON u.id=s.user_id
WHERE s.n>40 AND NOT EXISTS(SELECT 1 FROM user_agreements a WHERE a.user_id=s.user_id);

-- 기존 상담 이력의 담당자 2명과 추가 회원 8명에게 업무별 관리자 권한을 구성한다.
-- 총관리자는 만들지 않는다. 실제·로컬 계정 및 이미 지정한 비레거시 역할은 그대로 둔다.
INSERT INTO admin_accounts(user_id,role,created_at)
SELECT s.user_id,'ADMIN',u.created_at FROM seed_member_v40 s JOIN users u ON u.id=s.user_id
WHERE s.n IN (1,2,41,42,43,44,46,47,48,49)
  AND NOT EXISTS(SELECT 1 FROM admin_accounts a WHERE a.user_id=s.user_id);

DELETE ar FROM admin_account_roles ar
JOIN admin_roles r ON r.id=ar.role_id
JOIN seed_member_v40 s ON s.user_id=ar.user_id
WHERE s.n IN (1,2) AND r.code='LEGACY_ADMIN';

CREATE TEMPORARY TABLE seed_role_v40 (n INT PRIMARY KEY, role_code VARCHAR(50));
INSERT INTO seed_role_v40 VALUES (1,'SUPPORT_AGENT'),(2,'SUPPORT_AGENT'),
 (41,'OPERATOR'),(42,'OPERATOR'),(43,'VEHICLE_MANAGER'),(44,'VEHICLE_MANAGER'),
 (46,'SUPPORT_AGENT'),(47,'SUPPORT_AGENT'),(48,'AI_MANAGER'),(49,'AI_MANAGER');
INSERT INTO admin_account_roles(user_id,role_id)
SELECT s.user_id,r.id FROM seed_role_v40 m JOIN seed_member_v40 s ON s.n=m.n
JOIN admin_roles r ON BINARY r.code=BINARY m.role_code
JOIN admin_accounts a ON a.user_id=s.user_id AND a.role='ADMIN'
WHERE NOT EXISTS(SELECT 1 FROM admin_account_roles ar WHERE ar.user_id=s.user_id);

-- 복수 권한 표시를 확인할 수 있도록 추가 가상 관리자 한 명은 차량·AI 업무를 함께 담당한다.
INSERT INTO admin_account_roles(user_id,role_id)
SELECT s.user_id,r.id FROM seed_member_v40 s CROSS JOIN admin_roles r
JOIN admin_accounts a ON a.user_id=s.user_id AND a.role='ADMIN'
WHERE s.n=44 AND r.code='AI_MANAGER'
  AND NOT EXISTS(SELECT 1 FROM admin_account_roles ar WHERE ar.user_id=s.user_id AND ar.role_id=r.id);

DROP TEMPORARY TABLE seed_role_v40;
DROP TEMPORARY TABLE seed_member_v40;

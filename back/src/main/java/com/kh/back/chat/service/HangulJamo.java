package com.kh.back.chat.service;

/**
 * 보완 13: 금칙어 우회 표현을 글자로 되돌리는 도구 (ChatContentFilter 가 쓴다)
 *   - compose: 풀어 쓴 자모를 글자로 합친다 "ㅆㅣㅂㅏㄹ" → "씨발"
 *   - fromQwerty: 한글 자판 위치의 영문을 자모로 바꾼다 "tlqkf" → "ㅅㅣㅂㅏㄹ" (→ compose 하면 "시발")
 * 겹받침(ㄳ · ㄺ …)은 만들지 않는다 — 우회 표현에 거의 안 쓰여서 단순하게 둔다
 */
final class HangulJamo {

    private static final String CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
    private static final String JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
    private static final String JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ"; // 0번(공백) = 받침 없음

    // 두벌식 자판: a → ㅁ, b → ㅠ … z → ㅋ (소문자로 바꾼 뒤라 쌍자음 ㅃ · ㅉ · ㄸ · ㄲ · ㅆ 은 홑자음으로)
    private static final String QWERTY = "ㅁㅠㅊㅇㄷㄹㅎㅗㅑㅓㅏㅣㅡㅜㅐㅔㅂㄱㄴㅅㅕㅍㅈㅌㅛㅋ";

    private HangulJamo() {
    }

    static String fromQwerty(String text) {
        StringBuilder out = new StringBuilder(text.length());
        for (char c : text.toCharArray()) {
            out.append(c >= 'a' && c <= 'z' ? QWERTY.charAt(c - 'a') : c);
        }
        return out.toString();
    }

    // 자음 + 모음 (+ 뒤에 모음이 안 오는 자음 하나) 를 한 글자로. 이미 완성된 글자 · 홀로 있는 자모는 그대로
    static String compose(String text) {
        StringBuilder out = new StringBuilder(text.length());
        int i = 0;
        while (i < text.length()) {
            int cho = CHO.indexOf(text.charAt(i));
            if (cho < 0 || i + 1 >= text.length() || !isVowel(text.charAt(i + 1))) {
                out.append(text.charAt(i++));
                continue;
            }
            char vowel = text.charAt(i + 1);
            int next = i + 2;
            if (next < text.length()) { // ㅗ + ㅏ = ㅘ 처럼 모음 두 개가 하나로
                char joined = joinVowels(vowel, text.charAt(next));
                if (joined != 0) {
                    vowel = joined;
                    next++;
                }
            }
            int jong = 0;
            if (next < text.length() && JONG.indexOf(text.charAt(next)) > 0
                    && !(next + 1 < text.length() && isVowel(text.charAt(next + 1)))) {
                jong = JONG.indexOf(text.charAt(next));
                next++;
            }
            out.append((char) (0xAC00 + (cho * 21 + JUNG.indexOf(vowel)) * 28 + jong));
            i = next;
        }
        return out.toString();
    }

    private static boolean isVowel(char c) {
        return JUNG.indexOf(c) >= 0;
    }

    private static char joinVowels(char first, char second) {
        return switch ("" + first + second) {
            case "ㅗㅏ" -> 'ㅘ';
            case "ㅗㅐ" -> 'ㅙ';
            case "ㅗㅣ" -> 'ㅚ';
            case "ㅜㅓ" -> 'ㅝ';
            case "ㅜㅔ" -> 'ㅞ';
            case "ㅜㅣ" -> 'ㅟ';
            case "ㅡㅣ" -> 'ㅢ';
            default -> 0;
        };
    }
}

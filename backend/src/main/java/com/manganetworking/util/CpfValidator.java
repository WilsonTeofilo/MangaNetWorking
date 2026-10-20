package com.manganetworking.util;

/** Validação estrutural do CPF para não persistir dados fiscais sentinela ou inválidos. */
public final class CpfValidator {
    private CpfValidator() {}

    public static boolean isValid(String value) {
        if (value == null) return false;
        String digits = value.replaceAll("\\D", "");
        if (!digits.matches("[0-9]{11}") || digits.chars().distinct().count() == 1) return false;
        for (int position = 9; position < 11; position++) {
            int sum = 0;
            for (int index = 0; index < position; index++) sum += (digits.charAt(index) - '0') * (position + 1 - index);
            int digit = (sum * 10) % 11;
            if (digit == 10) digit = 0;
            if (digit != digits.charAt(position) - '0') return false;
        }
        return true;
    }
}

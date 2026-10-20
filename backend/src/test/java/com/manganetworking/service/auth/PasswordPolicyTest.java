package com.manganetworking.service.auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PasswordPolicyTest {

    @Test
    void acceptsEightSpacesAndUnicodeCodePointsUpToSixtyFour() {
        assertDoesNotThrow(() -> PasswordPolicy.validate("        "));
        assertDoesNotThrow(() -> PasswordPolicy.validate("🔒".repeat(64)));
        assertDoesNotThrow(() -> PasswordPolicy.validate("A senha! com acentuação é válida"));
    }

    @Test
    void rejectsPasswordsOutsideEightToSixtyFourCodePoints() {
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validate("1234567"));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validate("🔒".repeat(65)));
    }

    @Test
    void classifiesMediumAndStrongPasswordsAndRejectsWeakNewPasswords() {
        assertEquals(PasswordPolicy.Strength.MEDIUM, PasswordPolicy.strength("Mix de texto 42"));
        assertEquals(PasswordPolicy.Strength.STRONG, PasswordPolicy.strength("Café! Mangá 2026 seguro"));
        assertEquals(PasswordPolicy.Strength.WEAK, PasswordPolicy.strength("password1"));
        assertEquals(PasswordPolicy.Strength.WEAK, PasswordPolicy.strength("AAAAAAAA"));
        assertEquals(PasswordPolicy.Strength.WEAK, PasswordPolicy.strength("12345678"));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validateNewPassword("password1"));
        assertDoesNotThrow(() -> PasswordPolicy.validateNewPassword("Mix de texto 42"));
    }

    @Test
    void keepsLegacyLoginLengthValidationSeparateFromNewPasswordStrength() {
        assertDoesNotThrow(() -> PasswordPolicy.validate("        "));
        assertThrows(IllegalArgumentException.class, () -> PasswordPolicy.validateNewPassword("        "));
    }
}

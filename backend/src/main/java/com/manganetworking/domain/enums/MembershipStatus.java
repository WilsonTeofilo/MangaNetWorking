package com.manganetworking.domain.enums;

public enum MembershipStatus {
    ACTIVE,
    CANCELLED,
    EXPIRED;

    public boolean isActive() {
        return this == ACTIVE;
    }
}

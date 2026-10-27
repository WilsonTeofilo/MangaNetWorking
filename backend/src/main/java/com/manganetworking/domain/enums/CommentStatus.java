package com.manganetworking.domain.enums;

public enum CommentStatus {
    VISIBLE,
    DELETED,
    HIDDEN;

    public boolean isVisible() {
        return this == VISIBLE;
    }

    public boolean isDeleted() {
        return this == DELETED;
    }
}

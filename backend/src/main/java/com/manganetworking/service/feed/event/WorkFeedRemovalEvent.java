package com.manganetworking.service.feed.event;

import java.util.UUID;

/**
 * Publicado na suspensão cautelar por moderação pedindo a remoção da obra do feed (MongoDB) após o commit.
 *
 * @param workId obra a remover do feed
 */
public record WorkFeedRemovalEvent(UUID workId) {}

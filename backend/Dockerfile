# ==========================================
# STAGE 1: Build da Aplicação com Maven
# ==========================================
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder
WORKDIR /workspace

# Otimização de cache de dependências
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Compilação e empacotamento do JAR executável
COPY src ./src
RUN mvn clean package -DskipTests -B

# ==========================================
# STAGE 2: Imagem Final de Produção (Distroless / Minimal JRE)
# ==========================================
FROM eclipse-temurin:21-jre-alpine
LABEL maintainer="MangaNetWorking Team"

# Segurança: Criação de usuário não-root (princípio de menor privilégio)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Criação do diretório de uploads local com permissão correta
RUN mkdir -p /data/uploads && chown -R appuser:appgroup /data/uploads /app

# Copia o artefato compilado a partir do estágio builder
COPY --from=builder --chown=appuser:appgroup /workspace/target/*.jar /app/app.jar

USER appuser

# Tuning de JVM em container:
# - UseG1GC: Coletor de lixo balanceado para API de baixa latência
# - MaxRAMPercentage=75: Aloca até 75% da RAM do container sem estouro de OOM
# - java.security.egd: Entropia rápida para SecureRandom (2FA e tokens)
ENV JAVA_OPTS="-XX:+UseG1GC -XX:MaxRAMPercentage=75 -Djava.security.egd=file:/dev/./urandom"
ENV SPRING_PROFILES_ACTIVE="prod"

EXPOSE 8085

# Healthcheck do container
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8085/actuator/health/readiness || exit 1

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]

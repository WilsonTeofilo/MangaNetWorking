# TASK-004: Hardening de LGPD, sessão, cookie e rate limiting

**Responsável:** OpenCode Backend
**Origem:** achados da revisão extra do backend (A1, A2, A3, M1–M5, B1, B2, B4, B5)
**Escopo:** backend apenas. Zero alterações no frontend. **Não criar migração para rate limit** (decisão registrada: rate limit é in-memory e futuro Redis).

## Arquivos autorizados

1. `backend/src/main/java/com/manganetworking/service/session/SessionStore.java`
2. `backend/src/main/java/com/manganetworking/service/session/InMemorySessionStore.java`
3. `backend/src/main/java/com/manganetworking/service/session/SessionService.java`
4. `backend/src/main/java/com/manganetworking/service/user/UserProfileApplicationService.java`
5. `backend/src/main/java/com/manganetworking/config/properties/PlatformProperties.java`
6. `backend/src/main/java/com/manganetworking/config/security/RateLimitingFilter.java`
7. `backend/src/main/java/com/manganetworking/config/security/SecurityConfig.java`
8. `backend/src/main/resources/application.yml`
9. Testes correspondentes (session, user, security, properties).

## Critérios de aceite

- [ ] A1: exclusão LGPD revoga **todas** as sessões do usuário (`SessionStore.removeByUserId`).
- [ ] A2: exclusão LGPD anonimiza o perfil de criador (CPF/PIX/handle/bio/redes/avatar) e remove os arquivos de avatar do storage.
- [ ] A3: cookie de sessão define `SameSite=Lax` explicitamente e `Secure` configurável (`platform.security.cookie-secure`).
- [ ] M1: filtros não são registrados duas vezes (servlet container + SecurityFilterChain).
- [ ] M2: limite estrito de 15/min só em POST de login/registro/google e `/api/auth/2fa/**`; `/auth/me` e `/auth/logout` usam o bucket global.
- [ ] M3: `OPTIONS` e `GET /api/storage/**`/`/api/uploads/**` não consomem o bucket global.
- [ ] M4: intervalos de limpeza com fonte única (YAML + placeholder), sem default duplicado na anotação.
- [ ] M5: inconsistência financeira (taxa+repasse e split de anúncios) falha em `prod` e avisa fora dele.
- [ ] B1: `Retry-After` reflete os segundos reais restantes do bucket.
- [ ] B2: `X-Forwarded-For` usa o hop mais à direita e valida formato.
- [ ] B4: `X-XSS-Protection: 0` + HSTS.
- [ ] B5: `/api/dev/**` só acessível em perfis `dev`, `test` ou `local`.
- [ ] `mvn test` verde (incluindo os novos testes) e `git diff --check` limpo.

## Fora de escopo

- Store distribuído (Redis), offline mobile, migração SQL de rate limit, alterações de contrato no frontend.

**Assinado por:** OpenCode Tech Lead (Modo Plan)

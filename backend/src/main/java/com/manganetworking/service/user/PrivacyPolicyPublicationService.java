package com.manganetworking.service.user;

import com.manganetworking.service.user.dto.PrivacyPolicyDocumentDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

/**
 * Publicação controlada da Política de Privacidade.
 * <p>
 * O texto oficial NÃO é versionado no repositório por padrão: ele é instalado por um
 * procedimento controlado (aprovação legal → {@code ops/legal/publish-privacy-policy.ps1}
 * → registro de auditoria) e lido por este serviço. Sem documento aprovado, a API
 * responde {@code 404 POLICY_NOT_PUBLISHED}: a plataforma nunca exibe um texto
 * fictício como se fosse o documento oficial.
 * </p>
 * <p>
 * Ordem de resolução:
 * </p>
 * <ol>
 *   <li>{@code platform.privacy.policy-document}: caminho absoluto do arquivo aprovado;</li>
 *   <li>{@code platform.privacy.policy-classpath-dir}/{@code <versão>.md}: documento versionado
 *       no repositório após a aprovação (fluxo normal de publicação via commit).</li>
 * </ol>
 */
@Service
public class PrivacyPolicyPublicationService {

    private static final Logger log = LoggerFactory.getLogger(PrivacyPolicyPublicationService.class);

    /** Padrões de segredo que nunca podem estar no documento público de política. */
    private static final List<Pattern> FORBIDDEN_CONTENT = List.of(
            Pattern.compile("-----BEGIN [A-Z ]*PRIVATE KEY-----"),
            Pattern.compile("sk_live_[A-Za-z0-9]+"),
            Pattern.compile("AKIA[0-9A-Z]{16}"),
            Pattern.compile("(?i)\\b(password|senha|secret|senha_do_banco)\\s*[:=]\\s*\\S+")
    );

    /**
     * Campos obrigatórios do front matter. As chaves são comparadas em minúsculas porque o
     * front matter usa nomes camelCase ({@code effectiveDate}, {@code approvedBy},
     * {@code approvalReference}) e a normalização evita divergência de grafia.
     */
    private static final List<String> REQUIRED_FIELDS = List.of(
            "version", "effectivedate", "approvedby", "approvalreference");

    private final PrivacyComplianceService privacyComplianceService;
    private final ResourceLoader resourceLoader;
    private final String documentPath;
    private final String classpathDirectory;

    public PrivacyPolicyPublicationService(
            PrivacyComplianceService privacyComplianceService,
            ResourceLoader resourceLoader,
            @Value("${platform.privacy.policy-document:}") String documentPath,
            @Value("${platform.privacy.policy-classpath-dir:legal/privacy-policy}") String classpathDirectory
    ) {
        this.privacyComplianceService = privacyComplianceService;
        this.resourceLoader = resourceLoader;
        this.documentPath = documentPath == null ? "" : documentPath.trim();
        this.classpathDirectory = classpathDirectory == null || classpathDirectory.isBlank()
                ? "legal/privacy-policy"
                : classpathDirectory.trim();
    }

    /** Versão de política que o servidor exige no aceite de consentimento. */
    public String currentVersion() {
        return privacyComplianceService.currentPolicyVersion();
    }

    /**
     * Documento publicado, quando existe e é válido.
     *
     * @return documento publicado ou {@link Optional#empty()} se ainda não aprovado/instalado
     */
    public Optional<PrivacyPolicyDocumentDto> publishedDocument() {
        String version = currentVersion();
        LoadedDocument loaded = loadDocument(version);
        if (loaded == null) {
            return Optional.empty();
        }

        Map<String, String> frontMatter = parseFrontMatter(loaded.raw());
        for (String field : REQUIRED_FIELDS) {
            if (frontMatter.get(field) == null || frontMatter.get(field).isBlank()) {
                log.error("[PRIVACIDADE] Documento de política '{}' sem o campo obrigatório '{}'. Nada publicado.",
                        version, field);
                return Optional.empty();
            }
        }
        if (!version.equals(frontMatter.get("version"))) {
            log.error("[PRIVACIDADE] Documento de política com versão '{}' não corresponde à versão exigida '{}'. Nada publicado.",
                    frontMatter.get("version"), version);
            return Optional.empty();
        }
        String content = extractContent(loaded.raw());
        if (content.isBlank()) {
            log.error("[PRIVACIDADE] Documento de política '{}' sem conteúdo. Nada publicado.", version);
            return Optional.empty();
        }
        for (Pattern forbidden : FORBIDDEN_CONTENT) {
            if (forbidden.matcher(content).find()) {
                log.error("[PRIVACIDADE] Documento de política '{}' contém material sensível (padrão {}). Nada publicado.",
                        version, forbidden.pattern());
                return Optional.empty();
            }
        }

        return Optional.of(new PrivacyPolicyDocumentDto(
                version,
                frontMatter.get("effectivedate"),
                frontMatter.get("approvedby"),
                frontMatter.get("approvalreference"),
                sha256(loaded.raw()),
                content
        ));
    }

    private LoadedDocument loadDocument(String version) {
        if (!documentPath.isBlank()) {
            Path path = Path.of(documentPath);
            if (Files.isRegularFile(path)) {
                try {
                    return new LoadedDocument(Files.readString(path, StandardCharsets.UTF_8), path.toString());
                } catch (IOException e) {
                    log.error("[PRIVACIDADE] Falha ao ler o documento de política em '{}'.", path, e);
                    return null;
                }
            }
            log.warn("[PRIVACIDADE] Documento de política configurado em '{}' não existe.", path);
            return null;
        }

        String resourcePath = classpathDirectory + "/" + version + ".md";
        Resource resource = resourceLoader.getResource(resourcePath);
        if (!resource.exists()) {
            return null;
        }
        try {
            return new LoadedDocument(resource.getContentAsString(StandardCharsets.UTF_8), resourcePath);
        } catch (IOException e) {
            log.error("[PRIVACIDADE] Falha ao ler o documento de política em '{}'.", resourcePath, e);
            return null;
        }
    }

    /** Lê o front matter inicial no formato {@code chave: valor}. */
    private Map<String, String> parseFrontMatter(String raw) {
        String normalized = normalize(raw);
        if (!normalized.startsWith("---\n")) {
            return Map.of();
        }
        int end = normalized.indexOf("\n---", 3);
        if (end < 0) {
            return Map.of();
        }
        Map<String, String> fields = new java.util.LinkedHashMap<>();
        for (String line : normalized.substring(4, end).split("\n")) {
            if (line.isBlank() || line.strip().startsWith("#")) {
                continue;
            }
            int separator = line.indexOf(':');
            if (separator <= 0) {
                continue;
            }
            String key = line.substring(0, separator).trim().toLowerCase(Locale.ROOT);
            String value = line.substring(separator + 1).trim();
            fields.put(key, value);
        }
        return fields;
    }

    private String extractContent(String raw) {
        String normalized = normalize(raw);
        if (!normalized.startsWith("---\n")) {
            return normalized.trim();
        }
        int end = normalized.indexOf("\n---", 3);
        if (end < 0) {
            return normalized.trim();
        }
        int contentStart = normalized.indexOf('\n', end + 1);
        return contentStart < 0 ? "" : normalized.substring(contentStart + 1).trim();
    }

    /**
     * Normaliza quebras de linha e remove o BOM: arquivos gerados por ferramentas Windows
     * (PowerShell 5.1, Bloco de Notas) podem começar com {@code U+FEFF}, o que quebraria a
     * leitura do front matter.
     */
    private String normalize(String raw) {
        String normalized = raw.replace("\r\n", "\n");
        return normalized.startsWith("\uFEFF") ? normalized.substring(1) : normalized;
    }

    private String sha256(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível", e);
        }
    }

    private record LoadedDocument(String raw, String origin) {
    }
}

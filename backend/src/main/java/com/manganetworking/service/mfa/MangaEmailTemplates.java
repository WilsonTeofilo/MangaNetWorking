package com.manganetworking.service.mfa;

/**
 * Templates de e-mail do MangaNetWorking.
 *
 * <p>A apresentação fica fora do adaptador SMTP: o sender cuida do transporte (conexão,
 * autenticação, supressão) e esta classe cuida da marca. O visual segue a identidade
 * "Banca de Rua" (documenteada em {@code docs/IDENTIDADE_VISUAL.md}): ink, papel, amarelo,
 * bordas de 2px, selos e o rodapé de transparência.</p>
 *
 * <p>Sem cor solta fora dos tokens da marca e sem CSS de terceiros: o e-mail abre igual
 * em qualquer cliente.</p>
 */
public final class MangaEmailTemplates {

    /** Tokens da identidade visual (espelham o {@code tokens.css} do front). */
    private static final String INK = "#0B0B0C";
    private static final String INK_2 = "#151517";
    private static final String LINE = "#34343A";
    private static final String PAPER = "#F4EFE3";
    private static final String YELLOW = "#FFD400";
    private static final String MUTE = "#A9A59A";
    private static final String FOOT = "#6B6B6B";

    private static final String BASE_STYLE = """
            body { margin: 0; padding: 0; background-color: %1$s; color: %2$s;
                   font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            .wrap { padding: 24px 12px; }
            .card { max-width: 520px; margin: 0 auto; background-color: %3$s; border: 2px solid %4$s; border-top: 8px solid %5$s; }
            .head { background-color: %5$s; color: %1$s; padding: 18px 24px; display: flex; align-items: center; gap: 12px; }
            .mark { width: 40px; height: 40px; background-color: %1$s; color: %5$s; font-weight: 900; font-size: 18px;
                    display: flex; align-items: center; justify-content: center; border: 2px solid %1$s; letter-spacing: -1px; }
            .brand { font-weight: 900; font-size: 18px; letter-spacing: 1px; text-transform: uppercase; }
            .body { padding: 24px; }
            .lead { font-size: 15px; line-height: 1.6; margin: 0 0 18px; color: %2$s; }
            .note { font-size: 13px; line-height: 1.6; color: %6$s; margin: 0 0 8px; }
            .alert { border: 2px solid %4$s; background-color: %1$s; padding: 14px 16px; margin-top: 18px; }
            .alert p { font-size: 12px; line-height: 1.6; color: %6$s; margin: 0; }
            .alert strong { color: %5$s; }
            .foot { border-top: 2px solid %4$s; padding: 14px 24px; }
            .foot p { font-size: 11px; line-height: 1.6; color: %7$s; margin: 0; }
            """.formatted(INK, PAPER, INK_2, LINE, YELLOW, MUTE, FOOT);

    private static final String TRANSPARENCY_FOOTER = """
            <div class="foot">
              <p>A banca digital do mangá independente · 17% de taxa sobre membros e doações · 58% dos anúncios vão para o autor · sem intermediários.</p>
              <p>© 2026 MangaNetWorking. Obras originais protegidas.</p>
            </div>
            """;

    private MangaEmailTemplates() {
    }

    /**
     * E-mail do código de 2FA.
     *
     * @param otpCode         código de 6 dígitos
     * @param purposeDescription descrição do motivo ("entrar na sua conta", ...)
     * @return o HTML pronto
     */
    public static String otpEmail(String otpCode, String purposeDescription) {
        return """
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>MangaNetWorking — Código de Segurança</title>
                <style>%s
                .boxes { display: flex; gap: 8px; margin: 0 0 18px; }
                .box { width: 46px; height: 56px; background-color: %s; border: 2px solid %s; color: %s;
                       font-size: 30px; font-weight: 900; text-align: center; line-height: 52px; }
                </style>
                </head>
                <body>
                <div class="wrap">
                  <div class="card">
                    <div class="head">
                      <div class="mark">MN</div>
                      <div class="brand">MangaNetWorking</div>
                    </div>
                    <div class="body">
                      <p class="lead">Use este código para <strong>{{PROP}}</strong>:</p>
                      <div class="boxes">{{CODE}}</div>
                      <p class="note">O código expira em <strong style="color:%s">5 minutos</strong> e só pode ser usado uma vez.</p>
                      <div class="alert">
                        <p><strong>NÃO COMPARTILHE ESTE CÓDIGO.</strong> Se você não solicitou o acesso, ignore este e-mail com segurança — ninguém da MangaNetWorking pede esse código por telefone, chat ou mensagem.</p>
                      </div>
                    </div>
                    %s
                  </div>
                </div>
                </body>
                </html>
                """.formatted(BASE_STYLE, INK, YELLOW, YELLOW, PAPER, TRANSPARENCY_FOOTER)
                .replace("{{PROP}}", purposeDescription)
                .replace("{{CODE}}", codeBoxes(otpCode));
    }

    /**
     * E-mail de recuperação de senha.
     *
     * @param resetUrl        link de recuperação (já escapado pelo chamador)
     * @param expiresInMinutes validade do link em minutos
     * @return o HTML pronto
     */
    public static String passwordResetEmail(String resetUrl, long expiresInMinutes) {
        return """
                <!DOCTYPE html>
                <html lang="pt-BR">
                <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>MangaNetWorking — Recuperação de senha</title>
                <style>%s
                .cta { display: inline-block; background-color: %s; color: %s; text-decoration: none;
                       padding: 14px 20px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;
                       border: 2px solid %s; box-shadow: 4px 4px 0 %s; }
                </style>
                </head>
                <body>
                <div class="wrap">
                  <div class="card">
                    <div class="head">
                      <div class="mark">MN</div>
                      <div class="brand">MangaNetWorking</div>
                    </div>
                    <div class="body">
                      <p class="lead">Recebemos uma solicitação para redefinir a senha da sua conta. O link abaixo expira em <strong style="color:%s">%d minutos</strong> e só pode ser usado uma vez.</p>
                      <p><a class="cta" href="%s">Criar nova senha</a></p>
                      <div class="alert">
                        <p><strong>NÃO COMPARTILHE ESTE LINK.</strong> Se você não solicitou a alteração, ignore este e-mail — sua senha atual continua valendo.</p>
                      </div>
                    </div>
                    %s
                  </div>
                </div>
                </body>
                </html>
                """.formatted(BASE_STYLE, YELLOW, INK, INK, INK, PAPER, expiresInMinutes, resetUrl, TRANSPARENCY_FOOTER);
    }

    /** O código em caixas quadradas (mesma leitura do campo OTP do site). */
    private static String codeBoxes(String otpCode) {
        StringBuilder boxes = new StringBuilder();
        for (char digit : otpCode.toCharArray()) {
            boxes.append("<div class=\"box\">").append(digit).append("</div>");
        }
        return boxes.toString();
    }
}

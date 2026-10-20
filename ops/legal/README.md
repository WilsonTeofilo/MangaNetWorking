# Procedimento controlado de publicação da Política de Privacidade

> Item 48 do roadmap (`ROADMAP-FASES.md`). A publicação é um ato **jurídico**: o código
> apenas publica um texto que já tem aprovação declarada. Nada aqui substitui a aprovação legal.

## 1. Pré-requisitos (bloqueadores externos)

| Item | Responsável | Estado |
|---|---|---|
| Texto oficial aprovado (jurídico/DPO) | decisor legal | ⛔ pendente de aprovação humana |
| Encarregado nomeado e contato publicado | direção | ⛔ pendente (item 47) |
| Versão vigente da política | plataforma | `PRIVACY_POLICY_VERSION` (padrão `2026-10-v1`) |

## 2. Formato do documento

Markdown com *front matter* obrigatório. O front matter é a evidência de aprovação e vira
metadados públicos da API:

```markdown
---
version: 2026-10-v1
effectiveDate: 2026-10-01
approvedBy: Nome do Encarregado (ou parecer jurídico)
approvalReference: ATA-2026-001
---
# Política de Privacidade

...texto oficial aprovado...
```

Regras aplicadas pelo publicador e pelo backend:

- `version` precisa ser igual à versão exigida no aceite (`PRIVACY_POLICY_VERSION`);
- `effectiveDate`, `approvedBy` e `approvalReference` são obrigatórios;
- o corpo não pode conter chaves privadas, tokens `sk_live_*`, chaves AWS ou pares `senha=...`;
- o corpo precisa ter ao menos 400 caracteres (evita publicar stub);
- o backend **não publica** documento com versão divergente, incompleto ou com material sensível.

## 3. Publicação

```powershell
.\ops\legal\publish-privacy-policy.ps1 `
  -DocumentPath .\politica-aprovada.md `
  -Version 2026-10-v1 `
  -EffectiveDate 2026-10-01 `
  -ApprovedBy 'Nome do Encarregado' `
  -ApprovalReference 'ATA-2026-001'
```

O script valida, calcula o SHA-256, instala em `backend/src/main/resources/legal/privacy-policy/<versão>.md`
e registra a publicação em `ops/legal/publication-log.jsonl` (append-only, com hash, aprovador e referência).

Alternativa sem versionar o texto no repositório (instalação em runtime, fora do Git):

```powershell
.\ops\legal\publish-privacy-policy.ps1 ... -RuntimeDirectory C:\ProgramData\MangaNetWorking\legal
```

Nesse caso, o backend sobe com `PRIVACY_POLICY_DOCUMENT` apontando para o arquivo instalado.

## 4. Verificação

```powershell
curl -s http://localhost:8085/api/legal/privacy-policy
```

- `200` com `version`, `effectiveDate`, `approvedBy`, `approvalReference`, `sha256` e `content`;
- `404` com `code=POLICY_NOT_PUBLISHED` enquanto o texto oficial não estiver publicado.

O consumidor deve tratar `404` como "documento em publicação", nunca como texto válido.

## 5. Revisão e republicação

- Mudança de texto → nova versão (`2026-11-v1`), nova aprovação, novo registro no log.
- Substituir a mesma versão exige `-ReplaceExisting` e fica registrada no log.
- O backend recusa publicar documento cuja versão não seja a exigida no aceite: trocar a versão
  exige, no mesmo deploy, a atualização de `PRIVACY_POLICY_VERSION` (reaceite server-side).

## 6. Relação com o saneamento de dados legados

O mesmo bloco do roadmap (item 48) inclui o saneamento de CPF sentinela legado. Ele é feito no
servidor (o CPF é cifrado em repouso e não pode ser inspecionado por SQL), via
`GET/POST /api/owner/privacy/legacy-personal-data`, restrito a `ROLE_OWNER`, com auditoria
append-only em `privacy_governance_actions`.

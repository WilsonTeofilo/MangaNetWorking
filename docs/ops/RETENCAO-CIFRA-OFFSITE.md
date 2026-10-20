# Retenção, cifra e destino off-site dos backups

> Item 42 do roadmap (`ROADMAP-FASES.md`). O que está aqui é **procedimento executável**;
> os prazos e a custódia da chave dependem de aprovação organizacional (item 47).

## 1. O que o repositório entrega

| Capacidade | Onde | Estado |
|---|---|---|
| Dump de Postgres, Mongo e uploads + `manifest.json` com SHA-256 | `ops/backup-restore.ps1` | ✅ executado localmente |
| Cifra em repouso do backup (AES-256-CBC + HMAC-SHA256, encrypt-then-MAC) | `ops/crypto/backup-crypto.psm1` | ✅ verificado (decifra + checksums) |
| Verificação da cifra antes de publicar o artefato | `ops/backup-restore.ps1` (`Protect-BackupArtifact`) | ✅ verificado |
| Cópia off-site com conferência de SHA-256 e log `offsite-copies.jsonl` | `ops/backup-restore.ps1` (`Copy-ArtifactOffsite`) | ✅ verificado com diretório local |
| Retenção por janela, sem remover o backup mais recente, com log `retention-prune.jsonl` | `ops/backup-restore.ps1` (`Invoke-BackupRetention`) | ✅ verificado (remoção de backup de 2025) |
| Verificação de restauração em banco isolado, a partir do artefato cifrado | `ops/backup-restore.ps1 -Mode RestoreCheck` | ✅ executado (Postgres + Mongo isolados) |

O que **não** existe ainda: destino off-site real (bucket/volume em outra região), KMS para a
chave de cifra, prazos aprovados e RPO/RTO. Esses pontos dependem de decisão operacional e
financeira; o repositório não os fabrica.

## 2. Uso

```powershell
# Backup com cifra e cópia off-site
.\ops\backup-restore.ps1 -Mode Backup `
  -BackupPath D:\backups\run-2026-10-20 `
  -ComposeFile docker-compose.prod.yml `
  -EncryptKeyFile C:\ProgramData\MangaNetWorking\secrets\backup.key `
  -OffsiteDestination \\offsite-share\backups `
  -RetentionDays 30 -RetentionRoot D:\backups `
  -RemovePlaintext
```

```powershell
# Verificação de restauração a partir do artefato cifrado (não toca produção)
.\ops\backup-restore.ps1 -Mode RestoreCheck `
  -BackupPath D:\backups\run-2026-10-20 `
  -EncryptedArtifact D:\backups\run-2026-10-20.zip.mnbak `
  -EncryptKeyFile C:\ProgramData\MangaNetWorking\secrets\backup.key
```

Regras do script:

- `-OffsiteDestination` **exige** `-EncryptKeyFile`: nunca sai artefato em claro do host;
- o destino off-site não pode sobrescrever artefato existente com o mesmo nome;
- a cópia off-site é conferida por SHA-256 e registrada em `offsite-copies.jsonl`;
- a retenção nunca remove o backup mais recente e nunca sai de `-RetentionRoot`;
- `-RemovePlaintext` apaga a cópia em claro **depois** da verificação da cifra.

## 3. Formato do artefato cifrado

```
MNBACKUP1
alg=A256CBC-HS256
kdf=PBKDF2-SHA256-200000
salt=<base64>
iv=<base64>
mac=<base64 HMAC-SHA256 do cabecalho + ciphertext>
payload=<base64 do zip cifrado>
```

- Chave: arquivo com 64 bytes em base64 (32 AES + 32 HMAC) **ou** senha forte (PBKDF2 com sal aleatório).
- Comparação de integridade em tempo constante; chave errada ou arquivo adulterado falha de forma explícita.
- O arquivo de chave nunca é versionado. Em produção, use KMS/gerenciador de segredos com
  rotação e trilha de acesso; a rotação da chave exige novo backup completo (o artefato usa
  a chave no momento da gravação).

## 4. Pendências que exigem decisão humana

- [ ] Prazo de retenção por tipo de dado (o `-RetentionDays` acima é operacional, não a política aprovada).
- [ ] RPO/RTO e frequência do backup.
- [ ] Destino off-site real (bucket em outra região/ conta), com criptografia gerenciada e controle de acesso.
- [ ] Custódia da chave de cifra (KMS, responsáveis, rotação, acesso de emergência).
- [ ] Cópia cifrada de restore verificado com o encarregado responsável.

## 5. Evidência da rodada (20/10/2026, stack local)

- Backup real: 35.412 bytes cifrados, SHA-256 `70cf7c13...`; decifra conferiu todos os checksums do manifesto.
- Cópia off-site: mesmo SHA-256, log `offsite-copies.jsonl` gerado.
- Retenção: backup de `2025-01-01` removido, backup mais recente preservado, log `retention-prune.jsonl` gerado.
- Restauração de verificação a partir do artefato cifrado: Postgres e Mongo restaurados em bancos isolados, nada tocado em produção.

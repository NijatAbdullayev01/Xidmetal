# E-poçt çatdırılması (spam qovluğu)

Müştəri məktublarının inbox-a düşməsi üçün **DNS imzası** (SPF/DKIM/DMARC) və **göndərən kimliyi** uyğun olmalıdır. Kod tərəfi `MailService` bu başlıqları qoyur; DNS-i Cloudflare-də dərc etmək lazımdır.

## Nə yoxlanılıb (xidmetal.com)

| Qeyd | Status |
|------|--------|
| Resend göndərmə subdomeni `send.xidmetal.com` SPF (`include:amazonses.com`) | Var |
| Apex `xidmetal.com` SPF | Yox idi → `provision-dns.sh` əlavə edir |
| `_dmarc.xidmetal.com` | Yox idi → `provision-dns.sh` əlavə edir |
| Resend DKIM CNAME (`*. _domainkey` → amazonses.com) | Resend dashboard-da yoxla |
| Apex MX (cavab/bounce) | Yoxdur — Cloudflare Email Routing aktivləşdir |

## 1. DNS (məcburi)

```bash
CLOUDFLARE_API_TOKEN=… ./ops/cloudflare/provision-dns.sh
```

Skript əlavə edir:

- **SPF** (`xidmetal.com` TXT): `v=spf1 include:amazonses.com ~all` — Resend/SES
- **DMARC** (`_dmarc.xidmetal.com` TXT): `v=DMARC1; p=none; rua=mailto:info@xidmetal.com; adkim=r; aspf=r; pct=100`

DKIM CNAME-ləri Resend özü verir (random selector → `*.dkim.amazonses.com`). Dashboard → Domains → `xidmetal.com` → Verify. Əskikdirsə, Gmail/Mail.ru spam qovluğuna atır.

Bir neçə saat sonra:

- https://mxtoolbox.com/dmarc.aspx?domain=xidmetal.com
- https://www.mail-tester.com (özünüzə test məktubu)

DMARC hesabatları gəlməyə başlayandan sonra `p=none` → `p=quarantine` qaldırın (saxta From-ları kəsir, öz məktubunuz DKIM keçirsə inbox-a zərər vermir).

## 2. Resend

- Domain **Verified** (SPF + DKIM yaşıl).
- **Open/click tracking** sifariş/OTP üçün **sönük** — yad `links.` domeni spam siqnalıdır.
- `SMTP_FROM` domeni eyni verified zona olsun (`mail@xidmetal.com`). `noreply@` istifadə etməyin; API `noreply` görsə `mail@` yazır.
- `.env`: `SMTP_FROM="mail@xidmetal.com"`, `MAIL_REPLY_TO` və ya `CONTACT_INBOX_EMAIL="info@xidmetal.com"`.

## 3. Gələn poçt (info@)

Inbox yoxlamaları From domenində MX axtarır. Apex MX yoxdursa, bəzi filterlər (xüsusən Mail.ru) spam verir.

Cloudflare Dashboard → **Email** → **Email Routing**: yandırın, `info@xidmetal.com` (və catch-all) real qutuya yönəldin. MX qeydlərini Routing özü qoyur — əl ilə səhv MX yazmayın.

## 4. Kod (artıq tətbiq olunur)

- From göstəriş adı **Xidmətal**, `noreply@` → `mail@`
- `Reply-To: info@…`
- `Message-ID` From domeni ilə (`@xidmetal.com`), Docker hostname deyil
- Loqo məktuba CID ilə gömülür (saytdakı `/logo.png` «Tezliklə» HTML-inə düşməsin); ehtiyat: `GET /api/v1/mail/logo.png`
- Düzgün mətn + HTML, «reklam deyil» izahı
- Sifariş məktubunda `List-Unsubscribe` → `/mail/unsubscribe`

## 5. Production `.env`

```bash
SMTP_FROM="mail@xidmetal.com"
MAIL_REPLY_TO="info@xidmetal.com"
CONTACT_INBOX_EMAIL="info@xidmetal.com"
NEXT_PUBLIC_APP_URL="https://xidmetal.com"
```

API-ni yenidən başladın (image/rebuild). DNS dəyişikliyi 5–30 dəq (Cloudflare), bəzi qutularda reputasiya 24–48 saat.

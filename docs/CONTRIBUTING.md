# Töhfə Vermə Bələdçisi

Xidmətal layihəsinə töhfə vermək istəyirsinizsə, bu bələdçini oxuyun.

## Development workflow

1. Issue yaradın və ya mövcud issue seçin
2. Feature branch yaradın: `git checkout -b feature/your-feature`
3. Dəyişiklikləri edin
4. Test və lint keçirin: `pnpm lint && pnpm typecheck`
5. Commit edin (Conventional Commits formatında)
6. Pull Request açın

## PR tələbləri

- [ ] Kod `docs/CONVENTIONS.md` standartlarına uyğundur
- [ ] UI dəyişiklikləri mobil (~375px) və desktop (~1280px) görünüşlərdə responsivdir
- [ ] TypeScript xətası yoxdur (`pnpm typecheck`)
- [ ] Lint xətası yoxdur (`pnpm lint`)
- [ ] Yeni endpoint-lər Swagger-da sənədləşdirilib
- [ ] Shared types/schemas yenilənib (lazımsa)
- [ ] PR description-da nə dəyişdiyi izah olunub

## Code Review

- Minimum 1 approval tələb olunur
- Reviewer-lər kod keyfiyyəti, təhlükəsizlik və arxitektura uyğunluğuna baxır
- Feedback constructiv və respectful olmalıdır

## Branch strategiyası

```
main          ← production-ready kod
├── develop   ← integration branch
│   ├── feature/*
│   ├── fix/*
│   └── refactor/*
```

## Environment

Heç vaxt commit etməyin:
- `.env` faylları
- API keys, secrets
- `node_modules/`
- Build artifacts

## Suallar

Texniki suallar üçün issue açın və ya komanda ilə əlaqə saxlayın.

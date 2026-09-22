# Postiz CNS — fork notes

## Cambios CNS
- Editor de medios propio (sin Polotno / sin licencia de pago)
- Archivo: `apps/frontend/src/components/launches/polonto.tsx`
- Dependencia `polotno` eliminada del `package.json`
- Login Solana / wallets eliminado
- IA vía OmniRoute (OpenAI-compatible) con `OPENAI_BASE_URL` + `OPENAI_MODEL`

## Capacidades del editor
- Fondo de color
- Texto (color, tipografía, tamaño)
- Rectángulo / círculo
- Subir imagen
- Arrastrar elementos
- Exportar PNG → `/media/upload-simple` (igual que antes)

## IA / OmniRoute (VPS)
En `~/postiz/.env`:
```bash
OPENAI_API_KEY=sk-omniroute
OPENAI_BASE_URL=http://omniroute:20128/v1
OPENAI_MODEL=auto/chat
```

En `docker-compose.yaml`, el servicio `postiz` debe estar en la red externa `omniroute_default` (además de `postiz-network` y `temporal-network`).

Nota: LangChain/Mastra siguen en el monorepo (chat/autopost), pero las llamadas chat van a OmniRoute. Generación de imágenes tipo DALL·E puede no funcionar contra OmniRoute free.

## Build imagen (GitHub Actions)
Workflow: `.github/workflows/build-postiz-cns.yml` → `ghcr.io/marioromero959/postiz-cns:latest`

En VPS:
```bash
docker pull ghcr.io/marioromero959/postiz-cns:latest
# image: ghcr.io/marioromero959/postiz-cns:latest en docker-compose.yaml
cd ~/postiz && docker compose up -d --force-recreate postiz
```

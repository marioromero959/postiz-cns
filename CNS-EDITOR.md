# Postiz CNS — fork notes

## Cambios CNS
- Editor de medios propio (sin Polotno / sin licencia de pago)
- Archivo: `apps/frontend/src/components/launches/polonto.tsx`
- Dependencia `polotno` eliminada del `package.json`

## Capacidades del editor
- Fondo de color
- Texto (color, tipografía, tamaño)
- Rectángulo / círculo
- Subir imagen
- Arrastrar elementos
- Exportar PNG → `/media/upload-simple` (igual que antes)

## Build imagen custom
```bash
docker build -t postiz-cns:latest -f Dockerfile.dev .
```
Luego en `~/postiz/docker-compose.yaml` cambiar:
```yaml
image: postiz-cns:latest
```
en lugar de `ghcr.io/gitroomhq/postiz-app:latest`.

Requiere ~4GB RAM libres durante el build.

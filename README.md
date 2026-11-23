# Forja de Builds · MHW Iceborne

App web (Vite + React + TypeScript, 100 % estática) para montar builds de **Monster Hunter World: Iceborne** rápido y guardarlas en el navegador (`localStorage`).

## Funciones

- **Constructor**: arma, 5 piezas de armadura y amuleto, con buscador (español/inglés, por nombre o por habilidad) y filtro por rango (RM / RA+RM / todo).
- **Joyas**: cada ranura acepta solo las joyas que caben (incluye joyas de nivel 4, combinadas y "+"/"duras").
- **Aumentos** de arma (RM rareza 10-12): ataque, afinidad, defensa, mejora de ranura, regeneración de vida y elemento, con contador de capacidad y la ranura de aumento extra.
- **Personalización / ajustes manuales**: ataque, afinidad, elemento y defensa extra (mejoras personalizadas de las Tierras Guía, despertares de Safi'jiiva…).
- **Resumen**: habilidades con nivel/máximo (y los Secretos que desbloquean niveles), bonus de set, defensa (base / mejorada / con aumentos), resistencias, filo según Artesanía, ataque mostrado, raw real, afinidad y **raw efectivo (EFR)** con condiciones activables (punto débil, instigador, salud completa…).
- **Optimizador**: eliges habilidades y niveles objetivo y busca armaduras + amuleto + joyas que las cumplan con las ranuras de tu arma. Corre en un Web Worker y prioriza más ranuras libres y más defensa. Puedes fijar piezas y aplicar un resultado con un clic.
- **Guardado local**: lista de builds, duplicar, borrar, exportar/importar JSON y **compartir por enlace** (la build va codificada en la URL). El borrador actual se guarda solo.

## Datos

- Fuente: [MHWorldData](https://github.com/gatheringhallstudios/MHWorldData) (licencia MIT), que trae todo el contenido hasta Fatalis con traducciones al español.
- `scripts/build-data.mjs` convierte sus CSV en `public/data/mhw-data.json` (≈1,9 MB, ≈170 KB con gzip), que se sirve como archivo estático. **No hay ninguna base de datos ni API en tiempo de ejecución.**
- Regenerar los datos (descarga los CSV de un commit fijado):

  ```bash
  npm run data
  ```

  o desde un clon local: `node scripts/build-data.mjs /ruta/a/MHWorldData`.

### Limitaciones conocidas

- Parte del contenido de las últimas actualizaciones (p. ej. Fatalis) no tiene nombre en español en MHWorldData; en ese caso se muestra en inglés.
- Las reglas de **aumentos** (costes, capacidad por rareza, bonus) y algunos valores de habilidades de Iceborne no vienen en la base de datos: están en `src/logic/rules.ts` y conviene revisarlas contra el juego.
- El EFR es una estimación (no aplica valores de movimiento ni zonas débiles).

## Desarrollo

```bash
npm install
npm run dev        # servidor local
npm run build      # build de producción en dist/
npm test           # verifica que los resultados del optimizador cumplen los objetivos
```

## Despliegue en Vercel

Opción A: sube el repo a GitHub e impórtalo en Vercel; detecta Vite automáticamente (`vercel.json` ya fija el build y la caché de `/data`).

Opción B: con la CLI:

```bash
npx vercel --prod
```

---
Proyecto de fans, sin relación con Capcom.

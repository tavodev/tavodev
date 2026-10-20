# Mantenimiento del perfil

El `README.md` de este repo es el perfil de github.com/tavodev. Copia el texto en inglés de tavo.dev
(repo `tavodevlanding`, archivo `src/i18n/en.ts`) y sus capturas (`src/assets/img/`).

## Pendiente

- [ ] **Token para las estadísticas.** El secreto `STATS_TOKEN` existe pero no es válido: el workflow
  `Stats` falla con `GitHub API 401: "Bad credentials"` (se guardó lo que había en el portapapeles, que no
  era un token). Hasta corregirlo, las tarjetas `assets/activity-*.svg` y `assets/languages-*.svg` se
  quedan con los números del 2026-10-20 y la serpiente no se actualiza.
  1. Crear un token fine-grained en https://github.com/settings/personal-access-tokens/new: dueño
     `tavodev`, acceso a "All repositories", sin permisos extra (basta con Metadata de solo lectura).
     Un token fine-grained probablemente no cuenta las contribuciones en repos privados de
     organizaciones; si importa, usar uno classic con `repo`
     (https://github.com/settings/tokens/new?scopes=repo&description=STATS_TOKEN).
  2. Guardarlo desde una terminal propia (no con `!` dentro de Claude Code, porque ahí no lee lo que
     escribes): `gh secret set STATS_TOKEN -R tavodev/tavodev` y pegar el token.
  3. Lanzar el workflow: `gh workflow run stats.yml -R tavodev/tavodev` y revisar que el paso `Cards`
     termine bien.
  4. Cuando venza el token, repetir los pasos 1 y 2.
- [ ] **Contribuciones privadas en el perfil.** La gráfica pública solo muestra 126 contribuciones en el
  último año (con las privadas son unas 9,500). Activar Settings → Public profile → Contributions &
  activity → "Include private contributions on my profile". Llena la gráfica verde del perfil y la
  serpiente; no muestra nombres de repos.

## Cómo funciona

- `scripts/stats.mjs` genera las tarjetas de actividad y de lenguajes en tema claro y oscuro con la API
  GraphQL de GitHub. Necesita `GH_TOKEN` del dueño para contar el trabajo privado y solo publica totales.
  Los lenguajes suman la raíz cuadrada de los bytes de cada repo, para que un repo con librerías
  empaquetadas no pese más que años de trabajo, y omiten HTML, CSS, Shell y archivos de build.
  Para correrlo a mano: `GH_TOKEN=$(gh auth token) node scripts/stats.mjs`.
- `.github/workflows/stats.yml` corre cada día (y a mano con `workflow_dispatch`): regenera las tarjetas
  si hay `STATS_TOKEN`, genera la serpiente con Platane/snk y hace commit de `assets/` si algo cambió.
- Las acciones van fijadas por SHA.

## Cuando cambie tavo.dev

Este README no se actualiza solo. Si cambia el texto en inglés o una captura de la landing, copiar el
cambio aquí. Las capturas van en `assets/` con el mismo nombre; las que van en pareja deben tener la
misma proporción para que queden alineadas (Leviatán lleva relleno transparente para igualar a Soji).

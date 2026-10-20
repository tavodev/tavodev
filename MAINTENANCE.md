# Mantenimiento del perfil

El `README.md` de este repo es el perfil de github.com/tavodev. Copia el texto en inglés de tavo.dev
(repo `tavodevlanding`, archivo `src/i18n/en.ts`) y sus capturas (`src/assets/img/`).

## Token de las estadísticas

`STATS_TOKEN` es un token classic de `tavodev` con los scopes `repo`, `read:user` y `read:org`. Sin
`read:user` y `read:org`, GitHub no devuelve las contribuciones privadas y las tarjetas bajan a solo lo
público (pasó el 2026-10-20: 127 contribuciones en lugar de 9,551). Vence el **2027-01-18**.

Para renovarlo:

1. En https://github.com/settings/tokens, regenerar `STATS_TOKEN` (o crear uno nuevo con esos tres scopes).
2. Guardarlo desde una terminal propia (no con `!` dentro de Claude Code, porque ahí no lee lo que
   escribes): `gh secret set STATS_TOKEN -R tavodev/tavodev` y pegar el token, que empieza con `ghp_`.
3. Lanzar el workflow: `gh workflow run stats.yml -R tavodev/tavodev` y revisar que el paso `Cards`
   imprima cerca de 10,000 contribuciones en `lastYear`, no un centenar.

Cambiar solo los scopes de un token classic no cambia su valor: no hace falta volver a guardar el secreto.

## Cómo funciona

- `scripts/stats.mjs` genera las tarjetas de actividad y de lenguajes en tema claro y oscuro con la API
  GraphQL de GitHub. Necesita `GH_TOKEN` del dueño para contar el trabajo privado y solo publica totales.
  Los lenguajes suman la raíz cuadrada de los bytes de cada repo, para que un repo con librerías
  empaquetadas no pese más que años de trabajo, y omiten HTML, CSS, Shell y archivos de build.
  Para correrlo a mano: `GH_TOKEN=$(gh auth token) node scripts/stats.mjs`.
- `.github/workflows/stats.yml` corre cada día (y a mano con `workflow_dispatch`): regenera las tarjetas
  si hay `STATS_TOKEN`, genera la serpiente con Platane/snk y hace commit de `assets/` si algo cambió.
- La gráfica pública del perfil incluye las contribuciones privadas (Settings → Public profile →
  "Include private contributions on my profile", activado el 2026-10-20). Sin eso, la gráfica verde y la
  serpiente quedan casi vacías.
- Las acciones van fijadas por SHA.

## Cuando cambie tavo.dev

Este README no se actualiza solo. Si cambia el texto en inglés o una captura de la landing, copiar el
cambio aquí. Las capturas van en `assets/` con el mismo nombre; las que van en pareja deben tener la
misma proporción para que queden alineadas (Leviatán lleva relleno transparente para igualar a Soji).

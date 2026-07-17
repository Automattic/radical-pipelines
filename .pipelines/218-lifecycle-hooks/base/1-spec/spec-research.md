# Spec Research: Lifecycle hooks

# Lifecycle hooks: let conventions define orchestrator actions at defined pipeline moments

> Source: GitHub issue [Automattic/radical-pipelines#218](https://github.com/Automattic/radical-pipelines/issues/218).
> This file is self-contained; agents do not need to open the source issue.

## Goal

Project owners can attach their own instructions to defined moments in a pipeline's lifecycle — creating a branch, creating a worktree, merging a PR, and so on — and the orchestrator runs those instructions when it reaches each moment. This lets a project add behavior such as syncing a tracker, posting messages or comments, or doing cleanup, without modifying the generic skill.

## Context

- Today, project-specific lifecycle behavior is hard-coded into conventions — e.g. this project's `.rp.md` bakes Linear status/label sync and branch-push steps into an "Orchestrator updates during a run" section — which a hooks mechanism would generalize.
- Related open issues:
  - [#99](https://github.com/Automattic/radical-pipelines/issues/99) — a generated `.rp.md` should hold only project-specific config, never duplicate generic skill behavior; its principle (`.rp.md` records values, the skill owns behavior) is the same de-duplication pattern hooks serve.
  - [#180](https://github.com/Automattic/radical-pipelines/issues/180) — the Integrate phase (merging, closing, opening the PR, handling review feedback, run-level acceptance) defines pipeline-tail lifecycle moments where hooks would fire.
  - [#65](https://github.com/Automattic/radical-pipelines/issues/65) — initializing a pipeline's working environment (e.g. installing dependencies, starting services) before agents begin work is a "worktree created" moment where hooks would fire; who owns that initialization is open.

## Assumptions / directions to explore

_(open — to confirm or revise in later phases)_

- Implement as a new "lifecycle convention" (a hooks system): the skill names a hook at each specific point (branch created, worktree created, PR merged, …) and, at that point, says "if the convention defines something for this hook, run it" — doing nothing when the convention is silent.
- The set of hook points and their naming are open.

## Q&A

### Q1

**Q:** ¿Cuál es el alcance del entregable de este pipeline? (a) Solo el mecanismo genérico de hooks en la skill (la convención, los puntos de enganche, y cómo el orquestador los ejecuta), (b) el mecanismo **más** la migración del `.rp.md` de este proyecto (la sección "Orchestrator updates during a run" — sync de Linear y push de ramas) para que se exprese como hooks y sirva de validación real, o (c) otra cosa.

**A:** (b) — el mecanismo genérico en la skill **más** la migración del `.rp.md` de este proyecto: "Orchestrator updates during a run" se reescribe como hooks, validando el mecanismo con un consumidor real.

### Q2

**Q:** ¿Qué forma tiene la instrucción de un hook en la convención? (a) Prosa en lenguaje natural que el orquestador interpreta y ejecuta con sus propias herramientas (como el actual "Orchestrator updates during a run"), (b) comandos ejecutables deterministas juzgados por exit code (al estilo de los guardrails), o (c) ambas formas admitidas.

**A:** (a) — prosa en lenguaje natural que el orquestador interpreta y ejecuta con sus propias herramientas.

### Q3

**Q:** Sobre el conjunto de puntos de enganche: ¿el spec debe fijar la lista concreta de hook points que la skill nombra, o solo exigir un mínimo (los necesarios para expresar la migración del `.rp.md`) y dejar la lista completa y su naming al design doc?

**A:** El spec fija la lista completa de hook points.

### Q4

**Q:** Propuesta de lista de hook points (inventario derivado de los momentos que la skill ya define; ver Research). ¿Qué sobra, qué falta, y estás de acuerdo con plegar crear/reanudar/revisar/forkear en un único "run started" con el motivo como contexto?

1. `pipeline-created` — el pipeline existe: rama base, worktree, family folder e intent commiteados.
2. `run-started` — empieza el trabajo en un run (crear, reanudar, revisar o forkear), antes de lanzar nada; el motivo llega como contexto.
3. `branch-created` — se crea una rama (run branch o lane branch).
4. `worktree-created` — se crea (o recrea) un worktree (de run o de lane).
5. `phase-started` — arranca una fase.
6. `phase-completed` — el predicado de completitud de una fase se satisface.
7. `lanes-merged` — las lane branches se fusionan en la run branch y se eliminan.
8. `phase-rolled-back` — un resume revierte una fase activa.
9. `blocker-reported` — un agente reporta un blocker.
10. `run-ended` — el run se detiene por cualquier causa (completado, blocker, cancelación, fallo).

Momentos de merge/PR/cierre (issue #180, Integrate) quedan fuera: la skill aún no los define.

**A:** La lista vale (sin objeción al plegado en `run-started`), y se añaden tres momentos más: creación de la PR, merge del pipeline y cierre sin merge. Además, el alcance crece: la skill incorpora la infraestructura básica para esas secciones (PR / merge / cierre), aunque su contenido sea básicamente correr los hooks.

### Q5

**Q:** Para esas tres nuevas secciones (abrir PR, merge, cierre sin merge): ¿qué hace la skill genéricamente y qué queda en manos de los hooks? (a) La skill hace las acciones git genéricas (identificar la rama a mergear, mergear en main, borrar ramas al cerrar) y los hooks cubren lo específico de plataforma (abrir la PR, actualizar trackers); (b) las secciones son puros puntos de disparo: el humano/los hooks hacen todo y la skill solo detecta el momento y dispara; (c) mixto — detallar.

**A:** (b) — las tres secciones son puros puntos de disparo: la skill solo detecta el momento y dispara el hook; el resto lo hacen el humano o los hooks.

### Q6

**Q:** ¿Qué hace el orquestador cuando las instrucciones de un hook fallan (p. ej. el tracker no responde)? (a) Detiene el run y lo reporta (como un fallo de fase), (b) lo reporta al owner y continúa — un hook nunca bloquea el pipeline, (c) lo decide cada hook en la convención (p. ej. una marca de "bloqueante"), (d) otro comportamiento.

**A:** (c), con granularidad por instrucción: la convención puede marcar como bloqueantes instrucciones concretas dentro de un hook, no solo el hook entero.

### Q7

**Q:** Cuando una instrucción de un hook no lleva marca, ¿cuál es el comportamiento por defecto ante un fallo? (a) No bloqueante — el orquestador reporta el fallo al owner y el run continúa, (b) bloqueante — hay que marcar explícitamente lo no bloqueante.

**A:** (a) — no bloqueante por defecto: el fallo se reporta al owner y el run continúa; solo lo marcado como bloqueante detiene el run.

### Q8

**Q:** La convención de hooks entra en la tabla de `conventions/load.md` como opcional (el silencio = no-op). ¿Debe además el flujo de setup (`setup.md`) ofrecer capturar hooks al configurar un proyecto, o el owner los añade a mano a `.rp.md` cuando los necesite y el setup no cambia?

**A:** (a) — `setup.md` ofrece capturar hooks al configurar un proyecto.

### Q9

**Q:** ¿Puede `.rp.local.md` sobrescribir los hooks para una copia de trabajo concreta, o los hooks son solo del `.rp.md` commiteado (como los guardrails, que son "shared and committed-only")?

**A:** Sí — `.rp.local.md` puede sobrescribir hooks para una copia de trabajo concreta.

### Q10

**Q:** Sobre la migración del `.rp.md` de este proyecto: la sección "Orchestrator updates during a run" desaparece; sus ítems de Linear se expresan como hooks (`run-started` → labels y assignee; `phase-completed` → estado; `run-ended` → quitar `running…`) manteniendo el comportamiento observable; y el ítem "Push at run close-out" se elimina sin sustituto por duplicar lo que la skill ya hace en el close-out. ¿Confirmas?

**A:** Sí — confirmadas la migración a hooks de los ítems de Linear y la eliminación sin sustituto del ítem de push.

## Research

- **Inventario de momentos de ciclo de vida en la skill** (fuentes: `create-pipeline.md`, `autonomous-workflow.md`, `assisted-workflow.md`, `resume-pipeline.md`, `revision-pipeline.md`, `fork-pipeline.md`, `autonomous-phases/*`): creación de pipeline (rama + worktree + family folder + intent); inicio de run (autónomo paso 5 "At run start"; también al reanudar/revisar/forkear); creación de ramas (run y lane) y worktrees (incl. recreación en resume); inicio y fin de fase (predicado de completitud); merge de lanes y borrado de sus ramas/worktrees; rollback de fase activa en resume; blocker; close-out del run (por completitud, blocker, cancelación o fallo).
- **El push del close-out ya es genérico en la skill**: `autonomous-workflow.md` paso 7.2 ("Push the run branch and any remaining lane branches") y `assisted-workflow.md` paso 4 ("Push the run branch"). El ítem "Push at run close-out" del `.rp.md` de este proyecto duplica comportamiento de la skill — la migración puede eliminarlo en lugar de expresarlo como hook.
- **Mapa de la migración del `.rp.md`** (sección "Orchestrator updates during a run", todo prosa sobre el MCP de Linear): run started → label `running…` + label de versión + assignee; phase completed → estado del issue de Linear; run ended → quitar label `running…`. Aplica hoy a ambos modos (autónomo y asistido).
- **Momentos futuros no incluibles**: PR abierta/mergeada, cierre de pipeline (issue #180, fase Integrate) e inicialización de entorno (issue #65) no existen aún en la skill; la regla del proyecto exige describir solo el sistema tal como está diseñado hoy. _(Superado por Q4: el owner decide incorporar la infraestructura básica de PR / merge / cierre sin merge en este pipeline, con lo que esos momentos pasan a existir en la skill y sus hooks son nombrables.)_
- **Derivado, sin pregunta**: los hooks disparan en ambos modos (autónomo y asistido) — los momentos son independientes del modo y el comportamiento migrado ya aplicaba a ambos; y los ejecuta solo el orquestador, como fija el intent ("the orchestrator runs those instructions" — el orquestador posee toda la topología de ramas y worktrees, incluidas las de lane).
- **Detección de momentos de las secciones nuevas**: la skill ya define la detección de merge (`git merge-base --is-ancestor` en `pipeline-versioning.md`, "Merged detection"); las secciones de PR / merge / cierre son puntos de disparo invocados por el owner.

### Q11

**Q:** Confirmación de la lista consolidada de out-of-scope (7 ítems).

**A:** Confirmada, con un matiz: la pregunta abierta de #65 sobre quién posee la inicialización del entorno ya tiene respuesta clara — el orquestador. El contenido de esa inicialización sigue fuera de este pipeline.

## Out of Scope

Confirmados por el owner:

1. La fase Integrate completa (#180) — solo entran las tres secciones básicas como puntos de disparo; la aceptación a nivel de run y el manejo de feedback de PR review quedan fuera.
2. El contenido de la inicialización de entorno (#65) — su propiedad está resuelta (el orquestador), pero su contenido y uso del hook siguen en ese issue.
3. El barrido general de #99 (valores vs. comportamiento en todas las convenciones) — aquí solo migra la sección de lifecycle de este proyecto.
4. Hooks ejecutables por exit code (estilo guardrails) — los hooks son prosa; no hay forma ejecutable.
5. El ítem de push del `.rp.md` — se elimina; ningún hook lo sustituye.
6. Acciones git o de plataforma en las secciones nuevas — son puros puntos de disparo.
7. Hook points fuera de la lista fijada — no hay mecanismo de hooks arbitrarios definidos por el proyecto.

## Consolidated Requirements

1. La skill define una convención opcional **Lifecycle hooks**, listada en la tabla de `conventions/load.md`; donde la convención calla, el orquestador no hace nada.
2. Las instrucciones de un hook son prosa en lenguaje natural; el orquestador las interpreta y ejecuta con sus propias herramientas al alcanzar el momento, antes de continuar con el pipeline.
3. `.rp.local.md` puede sobrescribir hooks para una copia de trabajo concreta.
4. Los hooks disparan en ambos modos (autónomo y asistido) y los ejecuta solo el orquestador, aplicando el contexto del momento (qué fase, qué run, el motivo de `run-started`).
5. La lista de hook points es cerrada y la fija el spec: `pipeline-created`, `run-started`, `branch-created`, `worktree-created`, `phase-started`, `phase-completed`, `lanes-merged`, `phase-rolled-back`, `blocker-reported`, `run-ended`, `pr-opened`, `pipeline-merged`, `pipeline-closed-without-merge`.
6. Fallos: la convención puede marcar instrucciones concretas de un hook como bloqueantes; sin marca, una instrucción es no bloqueante (el fallo se reporta y el run continúa); el fallo de una bloqueante detiene el run, con close-out normal (y por tanto `run-ended` dispara).
7. La skill incorpora tres acciones invocables por el owner — abrir la PR del pipeline, registrar su merge, cerrarlo sin merge — como puros puntos de disparo: la skill detecta/recibe el momento y dispara el hook, sin ejecutar por sí misma acciones git o de plataforma.
8. `setup.md` ofrece capturar hooks al configurar un proyecto.
9. Migración de este repositorio: la sección "Orchestrator updates during a run" del `.rp.md` desaparece; sus ítems de Linear se expresan como hooks (`run-started` → label `running…` + label de versión única + assignee; `phase-completed` → estado; `run-ended` → quitar `running…`) con comportamiento observable idéntico; el ítem de push se elimina sin sustituto.

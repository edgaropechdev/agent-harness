import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

/**
 * Que el enrutado de las reglas no se pudra.
 *
 * Las secciones «reglas que no se negocian» de cada módulo salieron de
 * `AGENTS.md` a `rules/` **verbatim**, no resumidas: el problema no era su
 * contenido sino que compitieran todas a la vez por la atención en cada sesión,
 * incluso al tocar CSS. Ahora llegan cuando importan, por dos vías: la tabla de
 * `AGENTS.md` y el hook `.claude/hooks/module-rules`.
 *
 * Un enrutado se rompe en silencio, y ése es justo el fallo que no se nota: un
 * fichero de reglas que ya no nombra nadie no da error, sólo deja de llegar, y
 * la decisión que protegía se deshace meses después sin que salte nada.
 *
 * Es leer el código y afirmar sobre él en vez de fiarlo a la prosa, aplicado a
 * la documentación. Corre en milisegundos y sin base de datos.
 */

const ROOT = join(import.meta.dirname, "..")
const REGLAS = join(ROOT, "rules")
const HOOK = join(ROOT, ".claude/hooks/module-rules")
const MAPA_JSON = join(ROOT, "rules-map.json")

/**
 * Tope de `AGENTS.md`, **en bytes y no en líneas**: lo que cuesta es el contexto
 * que se carga en cada sesión, y cien líneas de tokens de diseño ocupan menos
 * que veinte de prosa.
 *
 * Si esto falla, la respuesta casi nunca es subir el número: es que algo que
 * pertenece a un módulo se escribió en el fichero que se carga siempre.
 */
const AGENTS_MAX_BYTES = 24_000

const SLUGS = readdirSync(REGLAS)
    .filter((name) => name.endsWith(".md"))
    .map((name) => name.replace(/\.md$/, ""))

const AGENTS = readFileSync(join(ROOT, "AGENTS.md"), "utf8")
const MAPA: [string, string][] = JSON.parse(readFileSync(MAPA_JSON, "utf8"))

function walk(dir: string): string[] {
    const files: string[] = []
    for (const name of readdirSync(dir)) {
        const full = join(dir, name)
        if (statSync(full).isDirectory()) files.push(...walk(full))
        else files.push(full)
    }
    return files
}

/**
 * ¿Casa el glob con algo?
 *
 * A mano y no con `globSync`, que existe en Node 24 pero no en `@types/node`
 * v20 y rompería el typecheck mientras las pruebas pasaban en verde.
 */
function globCasa(patron: string): boolean {
    const prefijo = patron.slice(0, patron.indexOf("*"))
    const base = prefijo.endsWith("/")
        ? prefijo
        : prefijo.slice(0, prefijo.lastIndexOf("/") + 1)
    const dir = join(ROOT, base)
    if (!existsSync(dir)) return false

    const regex = new RegExp(
        `^${patron.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*+/g, ".*")}$`,
    )
    return walk(dir).some((file) => regex.test(relative(ROOT, file)))
}

/** Las rutas declaradas en la cabecera de cada fichero de reglas. */
function ficherosDeclarados(slug: string): string[] {
    const source = readFileSync(join(REGLAS, `${slug}.md`), "utf8")
    const linea = source.match(/^\*\*Ficheros que gobierna:\*\* (.+)$/m)
    if (!linea) return []
    return [...linea[1].matchAll(/`([^`]+)`/g)].map((match) => match[1])
}

describe("enrutado de las reglas por módulo", () => {
    it("encuentra ficheros de reglas (si no, el escáner está roto)", () => {
        assert.ok(
            SLUGS.length >= 3,
            `Sólo se encontraron ${SLUGS.length} ficheros en rules/; ` +
                "el escáner no está leyendo el directorio.",
        )
    })

    it("AGENTS.md no vuelve a engordar", () => {
        const bytes = Buffer.byteLength(AGENTS, "utf8")
        assert.ok(
            bytes <= AGENTS_MAX_BYTES,
            `AGENTS.md ocupa ${bytes} bytes y el tope es ${AGENTS_MAX_BYTES}. ` +
                "Se carga entero en cada sesión: lo que sea de un módulo va a " +
                "rules/, no aquí.",
        )
    })

    it("AGENTS.md nombra todos los ficheros de reglas", () => {
        const huerfanos = SLUGS.filter(
            (slug) => !AGENTS.includes(`rules/${slug}.md`),
        )

        assert.deepEqual(
            huerfanos,
            [],
            "Estos ficheros de reglas no los enlaza AGENTS.md, así que nadie " +
                "los va a leer. Añádelos a la tabla de módulos.",
        )
    })

    it("el hook enruta todos los ficheros de reglas", () => {
        const enrutados = new Set(MAPA.map(([, slug]) => slug))
        const fuera = SLUGS.filter((slug) => !enrutados.has(slug))

        assert.deepEqual(
            fuera,
            [],
            "Estos ficheros de reglas no están en rules-map.json: no llegarán " +
                "solas al tocar su código.",
        )
    })

    it("el hook no enruta a ficheros que no existen", () => {
        const rotos = [...new Set(MAPA.map(([, slug]) => slug))].filter(
            (slug) => !existsSync(join(REGLAS, `${slug}.md`)),
        )

        assert.deepEqual(
            rotos,
            [],
            "El mapa apunta a ficheros de reglas inexistentes; inyectaría " +
                "nada en silencio.",
        )
    })

    it("los globs del mapa casan con código que existe", () => {
        const muertos = MAPA.map(([patron]) => patron).filter((patron) =>
            patron.includes("*")
                ? !globCasa(patron)
                : !existsSync(join(ROOT, patron)),
        )

        assert.deepEqual(
            muertos,
            [],
            "Estos globs no casan con nada. Un renombrado deja el glob muerto " +
                "y las reglas dejan de llegar sin que nada avise.",
        )
    })

    it("cada fichero de reglas declara qué código gobierna", () => {
        const sinCabecera = SLUGS.filter(
            (slug) => ficherosDeclarados(slug).length === 0,
        )

        assert.deepEqual(
            sinCabecera,
            [],
            "Sin la línea «**Ficheros que gobierna:**» nadie sabe cuándo " +
                "aplican estas reglas, y la prueba de abajo no puede " +
                "comprobar que sus rutas sigan existiendo.",
        )
    })

    it("las rutas que declara cada regla siguen existiendo", () => {
        const rotas: string[] = []

        for (const slug of SLUGS) {
            for (const ruta of ficherosDeclarados(slug)) {
                // Un glob vale si casa con algo; una ruta literal, si existe.
                const existe = ruta.includes("*")
                    ? globCasa(ruta)
                    : existsSync(join(ROOT, ruta))
                if (!existe) rotas.push(`${slug}.md → ${ruta}`)
            }
        }

        assert.deepEqual(
            rotas,
            [],
            "Estas rutas ya no existen. Un renombrado deja el glob del mapa " +
                "muerto y las reglas dejan de llegar sin que nada avise: " +
                "actualiza la cabecera y rules-map.json.",
        )
    })

    it("la cabecera de cada regla y el mapa dicen lo mismo", () => {
        const desincronizados: string[] = []

        for (const slug of SLUGS) {
            const declarados = new Set(ficherosDeclarados(slug))
            const enMapa = new Set(
                MAPA.filter(([, s]) => s === slug).map(([patron]) => patron),
            )
            for (const ruta of declarados) {
                if (!enMapa.has(ruta)) desincronizados.push(`${slug}.md declara ${ruta}, el mapa no`)
            }
            for (const patron of enMapa) {
                if (!declarados.has(patron)) desincronizados.push(`el mapa enruta ${patron} a ${slug}, la cabecera no lo dice`)
            }
        }

        assert.deepEqual(
            desincronizados,
            [],
            "La cabecera de un fichero de reglas y el mapa del hook se han " +
                "separado. Quien lea la cabecera creerá que las reglas llegan " +
                "solas donde ya no llegan, o al revés.",
        )
    })

    it("el hook es ejecutable", () => {
        assert.ok(existsSync(HOOK), "No existe .claude/hooks/module-rules")
        const modo = statSync(HOOK).mode
        assert.ok(
            (modo & 0o111) !== 0,
            "El hook no tiene permiso de ejecución: Claude Code no lo llamará " +
                "y las reglas dejarán de llegar sin que nada avise.",
        )
    })
})

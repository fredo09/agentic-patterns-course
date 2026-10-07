/**
 * PATRÓN: Uso de herramientas - Tool use
 * ---------------------------
 * El catálogo de cursos NO está en el entrenamiento
 * del modelo. Sin herramientas, el modelo inventa precios y cursos con
 * total confianza o en su defecto, no hace nada.
 * Con herramientas, consulta el dato real.
 */

import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { createTracer, model } from "../../helpers/index.js";

// ---------------------------------------------------------------------------
//  LA "BASE DE DATOS" — datos que el modelo no puede conocer
// ---------------------------------------------------------------------------

type Course = {
  id: string;
  title: string;
  hours: number;
  priceUSD: number;
  level: "basic" | "intermediate" | "advanced";
  students: number;
};

const COURSE_CATALOG: Course[] = [
  {
    id: "ts-01",
    title: "TypeScript desde cero",
    hours: 22,
    priceUSD: 19.99,
    level: "basic",
    students: 48_120,
  },
  {
    id: "nest-02",
    title: "NestJS: API REST modular",
    hours: 31,
    priceUSD: 24.99,
    level: "intermediate",
    students: 22_450,
  },
  {
    id: "flu-03",
    title: "Flutter: apps multiplataforma",
    hours: 46,
    priceUSD: 29.99,
    level: "intermediate",
    students: 61_300,
  },
  {
    id: "agt-04",
    title: "Agentes de IA con TypeScript",
    hours: 18,
    priceUSD: 34.99,
    level: "advanced",
    students: 1_890,
  },
  {
    id: "dkr-05",
    title: "Docker para desarrolladores",
    hours: 14,
    priceUSD: 17.99,
    level: "basic",
    students: 35_770,
  },
];

/**
 * Aqui creamos el prompt que le vamos a pasar al modelo
 */
const QUESTION =
  "¿Cuanto costarian juntos el curso de Typescript y el de docker" +
  "con un 20% de descuento? Dame las horas totales";

/**
 * Aqui creamos la funcion que va a generar el texto usando el modelo seleccionado esto sin usar el patron  tool-use
 */
async function withoutTools() {
  const tracer = createTracer("Sin respuesta");

  const { text } = await generateText({
    model,
    prompt: QUESTION,
    onStepEnd: tracer.onStepFinish,
  });

  console.log("\n🚀 ~ Respuesta :", text.green);
  console.log("\n🚀 ~ Verificar los numeros contra el catalogo de cursos");

  return tracer.summary();
}

/**
 * Tiene el mismo objetivo que la funcion withoutTools, pero esta vez usando el patron tool-use
 * @returns 
 */
async function withTools() {
  const tracer = createTracer("Con herramientas");

  const { text } = await generateText({
    model,
    prompt: QUESTION,
	// * circuit breaker: para que el modelo no se quede en un loop infinito, le decimos que se detenga despues de 6 pasos
	stopWhen: stepCountIs(6),
	tools: { findCourse },
	//! instrucciones que va a gobernan el comportamiento del modelo
	instructions: 'Eres un asistente de cursos de programación. ' +
		'No inventes precios ni cursos, ni duraciones. ' +
		'Consultalo siempre de las herramientas disponibles.',
    onStepEnd: tracer.onStepFinish,
  });

  console.log("\n🚀 ~ Respuesta :", text.green);
  console.log("\n🚀 ~ Verificar los numeros contra el catalogo de cursos");

  return tracer.summary();
}

/**
 * ! ============ Implementacion del patron tool-use
 */
const findCourse = tool({
  description:
    "Buscar cursos en el catalogo de detalles, por texto, " +
    "por titulo o por nivel. Utilizala antes de responder " +
    "cualquier pregunta sobre cursos, precios, cantidad de alumnos etc...",
  inputSchema: z.object({
    text: z
      .string()
      .optional()
      .describe("Texto a buscar en el titulo del curso."),
    level: z.enum(["basic", "intermediate", "advanced"]).optional(),
  }),
  execute: async ({ text, level }) => {
    const filteredCourses = COURSE_CATALOG.filter((course) => {
	  const matchesLevel = !level || course.level === level;
      const matchesText =
        !text || course.title.toLowerCase().includes(text.toLowerCase());
      return matchesText && matchesLevel;
    });

    return {
      find: filteredCourses.length,
      courses: filteredCourses,
    };
  },
});

/**
 * Aqui creamos la funcion que va a generar el texto usando el modelo seleccionado esto usando el patron  tool-use
 */
export async function examenToolUse() {
  const resultExample = await withoutTools();
  const resultWithTools = await withTools();

  console.log("\n🚀 ~~~~~~~~~~ Respuesta ~~~~~~~~~~ 🚀");
  console.table({
    "Sin herramientas": resultExample,
    "Con herramientas": resultWithTools,
  });
}

import { z, type ZodTypeAny } from 'zod'
import { atlasSchema, sectionSchemas } from './gemini-schemas'

/** Validate model output and founder edits against the same schema used to generate them. */
function fromSchema(schema: Record<string, unknown>): ZodTypeAny {
  switch (schema.type) {
    case 'string': return schema.enum ? z.enum(schema.enum as [string, ...string[]]) : z.string().max(20000)
    case 'integer':
    case 'number': {
      let n = z.number().finite()
      if (schema.type === 'integer') n = n.int()
      if (typeof schema.minimum === 'number') n = n.min(schema.minimum)
      if (typeof schema.maximum === 'number') n = n.max(schema.maximum)
      return n
    }
    case 'array': return z.array(fromSchema(schema.items as Record<string, unknown>)).max(100)
    case 'object': {
      const required = schema.required as string[] ?? []
      return z.object(Object.fromEntries(Object.entries(schema.properties as Record<string, Record<string, unknown>>).map(([k, v]) => [k, required.includes(k) ? fromSchema(v) : fromSchema(v).optional()])))
    }
    default: return z.unknown()
  }
}
export const validatedAtlas = fromSchema(atlasSchema)
export const validatedSections = Object.fromEntries(Object.entries(sectionSchemas).map(([k, v]) => [k, fromSchema(v)]))

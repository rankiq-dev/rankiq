import { z } from "zod"

export const createSiteSchema = z.object({
  /* domain: canonical hostname, no protocol, no trailing slash */
  domain: z
    .string()
    .min(3)
    .max(253)
    .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/, {
      message: "Must be a valid domain (e.g. example.com)",
    })
    .transform((v) => v.toLowerCase().replace(/^www\./, "")),
  displayName: z.string().min(1).max(100).optional(),
})

export const updateSiteSchema = createSiteSchema.partial()

export type CreateSiteInput = z.infer<typeof createSiteSchema>
export type UpdateSiteInput = z.infer<typeof updateSiteSchema>

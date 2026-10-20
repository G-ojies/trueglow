/**
 * Zod schemas for the YouCam (Perfect Corp) S2S v2.0 responses we use.
 * Shapes follow the published OpenAPI bundles:
 *   https://docs.perfectcorp.com/_bundle/reference/file.yaml
 *   https://docs.perfectcorp.com/_bundle/reference/ai_skin_analysis.yaml
 *   https://docs.perfectcorp.com/_bundle/reference/ai_fitzpatrick_skin_type.yaml
 *   https://docs.perfectcorp.com/_bundle/reference/ai_skin_simulation.yaml
 * Schemas are deliberately tolerant of extra fields (passthrough by default in
 * zod objects) so a harmless API addition never breaks the app.
 */
import { z } from "zod";

/** SD skin concerns accepted by `dst_actions` (HD and SD cannot be mixed). */
export const SD_ACTIONS = [
  "wrinkle",
  "pore",
  "texture",
  "acne",
  "oiliness",
  "radiance",
  "eye_bag",
  "age_spot",
  "dark_circle_v2",
  "droopy_upper_eyelid",
  "droopy_lower_eyelid",
  "firmness",
  "moisture",
  "redness",
  "tear_trough",
  "skin_type",
] as const;
export type SdAction = (typeof SD_ACTIONS)[number];

export const TaskStatus = z.enum(["running", "success", "error"]);

/** POST /s2s/v2.0/file */
export const FileResponse = z.object({
  status: z.number(),
  data: z.object({
    files: z
      .array(
        z.object({
          content_type: z.string(),
          file_name: z.string(),
          file_id: z.string().min(1),
          requests: z
            .array(
              z.object({
                method: z.string().default("PUT"),
                url: z.string().url(),
                headers: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
              }),
            )
            .min(1),
        }),
      )
      .min(1),
  }),
});
export type FileResponse = z.infer<typeof FileResponse>;

/** POST /s2s/v2.0/task/<feature> */
export const RunTaskResponse = z.object({
  status: z.number(),
  data: z.object({ task_id: z.string().min(1) }),
});

/** Error body for 4xx on task creation (RunError in the spec). */
export const RunError = z.object({
  status: z.number().optional(),
  error: z.string().optional(),
  error_code: z.string().optional(),
});

/** One item of `data.results.output` when skin analysis is run with format=json. */
export const SkinOutputItem = z.object({
  type: z.string(),
  region: z.string().optional(),
  raw_score: z.number().optional(),
  ui_score: z.number().optional(),
  score: z.number().optional(),
  skin_type: z.string().optional(),
  mask_urls: z.array(z.string()).optional(),
});
export type SkinOutputItem = z.infer<typeof SkinOutputItem>;

/** GET /s2s/v2.0/task/skin-analysis/{task_id} */
export const SkinAnalysisStatus = z.object({
  status: z.number(),
  data: z.object({
    task_status: TaskStatus,
    error: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
    results: z
      .union([
        z.object({ output: z.array(SkinOutputItem) }),
        z.object({ url: z.string() }),
        z.string(),
      ])
      .nullable()
      .optional(),
  }),
});
export type SkinAnalysisStatus = z.infer<typeof SkinAnalysisStatus>;

export const FITZPATRICK = ["I", "II", "III", "IV", "V", "VI"] as const;
export type Fitzpatrick = (typeof FITZPATRICK)[number];

/** GET /s2s/v2.0/task/fitzpatrick-scale-analyzer/{task_id} */
export const FitzpatrickStatus = z.object({
  status: z.number(),
  data: z.object({
    task_status: TaskStatus,
    error: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
    results: z
      .object({
        fitzpatrick_scale: z.enum(FITZPATRICK),
        timed: z.number().optional(),
      })
      .nullable()
      .optional(),
  }),
});
export type FitzpatrickStatus = z.infer<typeof FitzpatrickStatus>;

/** GET /s2s/v2.0/task/skin-simulation/{task_id} */
export const SimulationStatus = z.object({
  status: z.number(),
  data: z.object({
    task_status: TaskStatus,
    error: z.string().nullable().optional(),
    error_message: z.string().nullable().optional(),
    results: z.union([z.object({ url: z.string() }), z.string()]).nullable().optional(),
  }),
});
export type SimulationStatus = z.infer<typeof SimulationStatus>;

/** Skin simulation intensities (0..1). At least one must be above 0. */
export const SIM_KEYS = [
  "wrinkle",
  "radiance",
  "oiliness",
  "acne",
  "eye_bags",
  "dark_circle",
  "spots",
  "pores",
  "texture",
  "redness",
] as const;
export type SimKey = (typeof SIM_KEYS)[number];
export type SimSettings = Partial<Record<SimKey, number>>;

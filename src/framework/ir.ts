import { z } from "zod";

// ── IR Layer 1: Blueprint (Structural) ──────────────────────────────────
// [RULE: Blueprint is an immutable representation of the static template structure]

export const BlueprintNodeSchema = z.lazy(() => 
  z.object({
    nodeType: z.enum(["text", "element"]),
    tag: z.string().nullable().optional(),
    textContent: z.string().nullable().optional(),
    attributes: z.array(z.object({
      name: z.string(),
      value: z.string(),
      isDynamic: z.boolean(),
      marker: z.string().nullable().optional(),
    })),
    children: z.array(z.any()), // Recursive type handled by z.lazy
  })
);

export type BlueprintNode = z.infer<typeof BlueprintNodeSchema>;

export const BlueprintSchema = z.object({
  root: BlueprintNodeSchema,
  version: z.string(),
  rawHtml: z.string(),
});

export type Blueprint = z.infer<typeof BlueprintSchema>;

// ── IR Layer 2: Binding Set (Dynamic Mapping) ───────────────────────────
// [RULE: BindingSet maps DOM markers to their reactive data source/type]

export const BindingSchema = z.object({
  marker: z.string(),
  type: z.enum(["event", "property", "bool", "text"]),
  valueIdx: z.number(),
  eventName: z.string().optional(),
  propName: z.string().optional(),
  attrName: z.string().optional(),
});

export type Binding = z.infer<typeof BindingSchema>;
export type BindingSet = Map<string, Binding>;

// ── IR Layer 3: Node Map (DOM References) ───────────────────────────────
// [RULE: NodeMap allows O(1) access to elements via their markers]

export type NodeMap = Map<string, HTMLElement | Text>;

// ── IR Layer 4: Patch Set (Updates) ──────────────────────────────────────
// [RULE: Patches describe granular changes to the DOM]

export type PatchType = "text" | "attribute" | "property" | "class" | "bool";

export interface Patch {
  type: PatchType;
  marker: string;
  value: any;
}

export type PatchSet = Patch[];

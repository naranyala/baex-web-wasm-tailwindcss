import { z } from "zod";

// ── IR Layer 1: Blueprint (Structural) ──────────────────────────────────
// [RULE: Blueprint is an immutable representation of the static template structure]

/**
 * Schema for a single node in the Blueprint tree.
 * Describes the structure of an element or text node and its attributes.
 */
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

/** 
 * A structural representation of a DOM node within the Blueprint.
 */
export type BlueprintNode = z.infer<typeof BlueprintNodeSchema>;

/**
 * Schema for the overall Blueprint of a template.
 */
export const BlueprintSchema = z.object({
  root: BlueprintNodeSchema,
  version: z.string(),
  rawHtml: z.string(),
});

/**
 * An immutable representation of the static template structure, 
 * used to optimize DOM patching.
 */
export type Blueprint = z.infer<typeof BlueprintSchema>;

// ── IR Layer 2: Binding Set (Dynamic Mapping) ───────────────────────────
// [RULE: BindingSet maps DOM markers to their reactive data source/type]

/**
 * Schema for a binding that maps a DOM marker to a reactive value.
 */
export const BindingSchema = z.object({
  marker: z.string(),
  type: z.enum(["event", "property", "bool", "text"]),
  valueIdx: z.number(),
  eventName: z.string().optional(),
  propName: z.string().optional(),
  attrName: z.string().optional(),
  modifiers: z.array(z.string()).optional(),
  key: z.string().optional(),
  nodeIdx: z.number().optional(),
});

/**
 * Defines how a specific part of the DOM should be reactively updated.
 */
export type Binding = z.infer<typeof BindingSchema>;

/**
 * A map of unique markers (e.g., 'b0') to their corresponding Binding definitions.
 */
export type BindingSet = Map<string, Binding>;

// ── IR Layer 3: Node Map (DOM References) ───────────────────────────────
// [RULE: NodeMap allows O(1) access to elements via their markers]

/**
 * A map providing fast access to DOM elements or text nodes using their markers.
 */
export type NodeMap = Map<string, HTMLElement | Text>;

// ── IR Layer 4: Patch Set (Updates) ──────────────────────────────────────
// [RULE: Patches describe granular changes to the DOM]

/**
 * Types of DOM updates that can be performed.
 */
export type PatchType = "text" | "attribute" | "property" | "class" | "bool";

/**
 * A granular update instruction to be applied to the DOM.
 */
export interface Patch {
  type: PatchType;
  marker: string;
  value: any;
}

/**
 * A set of patches to be applied in a single update cycle.
 */
export type PatchSet = Patch[];

import { z } from 'zod';

/**
 * Zod schema for the Documaster test auth tool arguments
 * @internal
 */
export const DocumentmasterTestAuthArgs = z.object({
	// Ingen argumenter trengs for test-autentisering foreløpig
}).strict();

/**
 * TypeScript type for the Documaster test auth tool arguments
 * @internal
 */
export type DocumentmasterTestAuthArgsType = z.infer<typeof DocumentmasterTestAuthArgs>;

/**
 * Zod schema for the Documaster search tool arguments
 */
export const DocumentmasterSearchArgs = z.object({
	/** Søkestreng som skal brukes i Documaster */
	query: z.string().describe('Søkestreng for å finne dokumenter i Documaster'),
	
	/** Maksimalt antall resultater som skal returneres (valgfri, standard er 10) */
	limit: z.number().int().positive().max(100).optional().default(10)
		.describe('Maksimalt antall resultater som skal returneres (maks 100)'),
		
	/** Filtrer resultater etter dokumenttype (valgfri) */
	documentType: z.string().optional()
		.describe('Filtrer resultater etter dokumenttype (valgfritt)')
}).strict();

/**
 * TypeScript type for the Documaster search tool arguments
 */
export type DocumentmasterSearchArgsType = z.infer<typeof DocumentmasterSearchArgs>;

/**
 * Zod schema for the Documaster query tool arguments
 */
export const DocumentmasterQueryArgs = z.object({
	/** Dokument-ID som skal spørres mot */
	documentId: z.string().describe('ID til dokumentet som skal spørres mot'),
	
	/** Spørring eller instruksjon for dokumentanalyse */
	query: z.string().describe('Spørring eller instruksjon for dokumentanalyse'),
}).strict();

/**
 * TypeScript type for the Documaster query tool arguments
 */
export type DocumentmasterQueryArgsType = z.infer<typeof DocumentmasterQueryArgs>; 
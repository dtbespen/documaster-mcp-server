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
 * Schema for documaster-search argumemnter
 */
export const DocumentmasterSearchArgs = z
	.object({
		query: z
			.string()
			.min(2, { message: 'Søkeord må bestå av minst 2 tegn.' })
			.describe(
				'Søkeord eller søkefrase som skal brukes for å finne relevante dokumenter i Documaster.',
			),
		limit: z
			.number()
			.int()
			.min(1)
			.max(50)
			.default(10)
			.describe(
				'Maksimalt antall søkeresultater som skal returneres. Standard er 10.',
			),
		documentType: z
			.string()
			.optional()
			.describe(
				'Valgfri filtrering på dokumenttypen. Om utelatt, vil alle typer dokumenter bli inkludert.',
			),
	})
	.describe(
		'Søk etter dokumenter i Documaster basert på søkeord og valgfrie filtre.',
	);

/**
 * Derived type for documaster-search arguments
 */
export type DocumentmasterSearchArgsType = z.infer<typeof DocumentmasterSearchArgs>;

/**
 * Zod schema for the Documaster query tool arguments
 */
export const DocumentmasterQueryArgs = z.object({
	/** Type for hovedentiteten som skal hentes (Arkiv, Arkivdel, Saksmappe, Journalpost, Dokument, etc.) */
	type: z.string().describe('Entitetstypen som skal hentes (f.eks. "Saksmappe", "Journalpost")'),

	/** Forespørselsuttrykk basert på Documaster Query Language */
	query: z.string().optional().describe('Spørring basert på Documaster Query Language'),

	/** Objekter med parametere brukt i query-stringen. Navnene må starte med "@" */
	parameters: z.record(z.string(), z.any()).optional().describe('Parametere brukt i queryen'),

	/** Maksimalt antall resultater som skal returneres (1–500) */
	limit: z.number().int().positive().max(500).optional().default(10)
		.describe('Maksimalt antall resultater (1-500), standard 10'),

	/** Offset for paginering */
	offset: z.number().int().nonnegative().optional().describe('Offset for paginering'),

	/** Joins-aliaser */
	joins: z.record(z.string(), z.string()).optional().describe('Joins-aliaser for referansefelt'),

	/** Sorteringsrekkefølge */
	sortOrder: z.array(z.object({
		field: z.string(),
		order: z.enum(['asc','desc'])
	})).optional().describe('Sorteringsdefinisjon')
}).strict();

/**
 * TypeScript type for the Documaster query tool arguments
 */
export type DocumentmasterQueryArgsType = z.infer<typeof DocumentmasterQueryArgs>; 
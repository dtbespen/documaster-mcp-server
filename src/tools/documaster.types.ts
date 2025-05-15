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

// === Mappe-verktøy argumenter ===

export const MappePrimaerklasseArgs = z.object({
	classTitle: z.string().describe('Tittel på primærklassering som mappen skal hentes på'),
});
export type MappePrimaerklasseArgsType = z.infer<typeof MappePrimaerklasseArgs>;

export const MappeSekundaerklasseArgs = z.object({
	classTitle: z.string().describe('Tittel på sekundærklassering som mappen skal hentes på'),
});
export type MappeSekundaerklasseArgsType = z.infer<typeof MappeSekundaerklasseArgs>;

export const MappeSaksnummerArgs = z.object({
	saksnummer: z.string().describe('Saksnummer (mappeIdent) som mappen skal hentes på, f.eks. "2022/109"'),
});
export type MappeSaksnummerArgsType = z.infer<typeof MappeSaksnummerArgs>;

export const MappeIdArgs = z.object({
	saksId: z.string().describe('ID til mappen som skal hentes, f.eks. "7368480"'),
});
export type MappeIdArgsType = z.infer<typeof MappeIdArgs>;

// Midlertidig type for å støtte eksisterende controller.queryEntities-signatur
export type DocumentmasterQueryArgsType = {
	type: string;
	query?: string;
	parameters?: Record<string, unknown>;
	limit?: number;
	offset?: number;
	joins?: Record<string, string>;
	sortOrder?: Array<{ field: string; order: 'asc' | 'desc' }>;
};

/**
 * Zod schema for hent_registrering_primaerklasse tool arguments
 */
export const RegistreringPrimaerklasseArgs = z.object({
	/** Primærklasseringens tittel som skal brukes i søket */
	classTitle: z.string().describe('Tittel på primærklassering som registreringen skal hentes på'),
});
export type RegistreringPrimaerklasseArgsType = z.infer<typeof RegistreringPrimaerklasseArgs>;

/**
 * Zod schema for hent_registrering_sekundaerklasse tool arguments
 */
export const RegistreringSekundaerklasseArgs = z.object({
	/** Sekundærklasseringens tittel som skal brukes i søket */
	classTitle: z.string().describe('Tittel på sekundærklassering som registreringen skal hentes på'),
});
export type RegistreringSekundaerklasseArgsType = z.infer<typeof RegistreringSekundaerklasseArgs>;

/**
 * Zod schema for hent_registrering_registreringsIdent tool arguments
 */
export const RegistreringIdentArgs = z.object({
	/** Registreringsidentifikator som skal brukes i søket */
	registreringsIdent: z.string().describe('Registreringsidentifikator som registreringen skal hentes på'),
});
export type RegistreringIdentArgsType = z.infer<typeof RegistreringIdentArgs>;

/**
 * Zod schema for hent_registrering_saksnummer tool arguments
 */
export const RegistreringSaksnummerArgs = z.object({
	/** Saksnummer (mappeIdent) som skal brukes i søket */
	saksnummer: z.string().describe('Saksnummer (mappeIdent) som registreringen skal hentes på, f.eks. "2022/109"'),
});
export type RegistreringSaksnummerArgsType = z.infer<typeof RegistreringSaksnummerArgs>;

/**
 * Zod schema for hent_registrering_id tool arguments
 */
export const RegistreringIdArgs = z.object({
	/** ID til registreringen som skal hentes */
	registreringsId: z.string().describe('ID til registreringen som skal hentes, f.eks. "7368480"'),
});
export type RegistreringIdArgsType = z.infer<typeof RegistreringIdArgs>;

/**
 * Zod schema for hent_dokumentversjon_registreringsId tool arguments
 */
export const DokumentversjonRegistreringsIdArgs = z.object({
	/** ID til registreringen som skal brukes i søket */
	registreringID: z.string().describe('ID til registrering som dokumentversjoner skal hentes for'),
});
export type DokumentversjonRegistreringsIdArgsType = z.infer<typeof DokumentversjonRegistreringsIdArgs>;

/**
 * Zod schema for hent_dokument_id tool arguments
 */
export const DokumentIdArgs = z.object({
	/** ID til dokumentet som skal hentes */
	dokumentId: z.string().describe('ID til dokumentet som skal hentes'),
});
export type DokumentIdArgsType = z.infer<typeof DokumentIdArgs>;

/**
 * Zod schema for hent_dokumentversjon_registreringsIdent tool arguments
 */
export const DokumentversjonRegistreringsIdentArgs = z.object({
	/** RegistreringsIdent som skal brukes i søket */
	registreringID: z.string().describe('Registreringsnummer (registreringsIdent) som dokumentversjoner skal hentes for, f.eks. "2024/4219"'),
});
export type DokumentversjonRegistreringsIdentArgsType = z.infer<typeof DokumentversjonRegistreringsIdentArgs>;

/**
 * Zod schema for hent_dokumentversjon_id tool arguments
 */
export const DokumentversjonIdArgs = z.object({
	/** ID til dokumentversjonen som skal hentes */
	dokumentversjonId: z.string().describe('ID til dokumentversjonen som skal hentes'),
});
export type DokumentversjonIdArgsType = z.infer<typeof DokumentversjonIdArgs>; 
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
		'Søk etter dokumenter i Documaster basert på søkeord og valgfrie filtre. Resultater kan inkludere relevante mapper, journalposter og dokumenter.',
	);

/**
 * Derived type for documaster-search arguments
 */
export type DocumentmasterSearchArgsType = z.infer<typeof DocumentmasterSearchArgs>;

// === Mappe-verktøy argumenter (Saksmappe / Mappe kategori) ===

export const MappePrimaerklasseArgs = z.object({
	classTitle: z.string().describe('Tittel på primærklassering som mappen skal hentes på. Dette er hovedkategorien for saken.'),
}).describe('Finn mapper/saker basert på hovedkategori. Resultatet inneholder metadata om saken inkludert saksnummer og lenker til Documaster.');
export type MappePrimaerklasseArgsType = z.infer<typeof MappePrimaerklasseArgs>;

export const MappeSekundaerklasseArgs = z.object({
	classTitle: z.string().describe('Tittel på sekundærklassering som mappen skal hentes på. Dette er underkategorien for saken.'),
}).describe('Finn mapper/saker basert på underkategori. Resultatet inneholder metadata om saken inkludert saksnummer og lenker til Documaster.');
export type MappeSekundaerklasseArgsType = z.infer<typeof MappeSekundaerklasseArgs>;

export const MappeSaksnummerArgs = z.object({
	saksnummer: z.string().describe('Saksnummer (mappeIdent) som mappen skal hentes på, f.eks. "2022/109". Dette er det synlige saksnummeret i Documaster.'),
}).describe('Finn mapper/saker basert på saksnummer (mappeIdent). Resultatet inneholder all metadata om saken og lenker til Documaster.');
export type MappeSaksnummerArgsType = z.infer<typeof MappeSaksnummerArgs>;

export const MappeIdArgs = z.object({
	saksId: z.string().describe('ID til mappen som skal hentes, f.eks. "7368480". Dette er den interne ID-en Documaster bruker for saken.'),
}).describe('Finn mapper/saker basert på intern ID. Denne ID-en finner du i resultatene fra søk eller andre verktøy som returnerer saker.');
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

// === Registrering-verktøy argumenter (Journalpost kategori) ===

/**
 * Zod schema for hent_registrering_primaerklasse tool arguments
 */
export const RegistreringPrimaerklasseArgs = z.object({
	/** Primærklasseringens tittel som skal brukes i søket */
	classTitle: z.string().describe('Tittel på primærklassering som registreringen skal hentes på. Dette er hovedkategorien for journalposter.'),
}).describe('Finn journalposter basert på hovedkategori. Resultatet inneholder metadata om journalposten inkludert journalnummer og lenker til Documaster.');
export type RegistreringPrimaerklasseArgsType = z.infer<typeof RegistreringPrimaerklasseArgs>;

/**
 * Zod schema for hent_registrering_sekundaerklasse tool arguments
 */
export const RegistreringSekundaerklasseArgs = z.object({
	/** Sekundærklasseringens tittel som skal brukes i søket */
	classTitle: z.string().describe('Tittel på sekundærklassering som registreringen skal hentes på. Dette er underkategorien for journalposter.'),
}).describe('Finn journalposter basert på underkategori. Resultatet inneholder metadata om journalposten inkludert journalnummer og lenker til Documaster.');
export type RegistreringSekundaerklasseArgsType = z.infer<typeof RegistreringSekundaerklasseArgs>;

/**
 * Zod schema for hent_registrering_ident tool arguments
 */
export const RegistreringIdentArgs = z.object({
	/** Registreringsidentifikator som skal brukes i søket */
	registreringsIdent: z.string().describe('Registreringsidentifikator som registreringen skal hentes på. Dette er det synlige journalnummeret i Documaster.'),
}).describe('Finn journalposter basert på journalnummer (registreringsIdent). Resultatet inneholder all metadata om journalposten og lenker til Documaster.');
export type RegistreringIdentArgsType = z.infer<typeof RegistreringIdentArgs>;

/**
 * Zod schema for hent_registrering_saksnummer tool arguments
 */
export const RegistreringSaksnummerArgs = z.object({
	/** Saksnummer (mappeIdent) som skal brukes i søket */
	saksnummer: z.string().describe('Saksnummer (mappeIdent) som registreringen skal hentes på, f.eks. "2022/109". Dette er det synlige saksnummeret i Documaster som journalposten tilhører.'),
}).describe('Finn alle journalposter som tilhører en bestemt sak, basert på saksnummer. Resultatet inneholder metadata om journalposter og lenker til Documaster.');
export type RegistreringSaksnummerArgsType = z.infer<typeof RegistreringSaksnummerArgs>;

/**
 * Zod schema for hent_registrering_id tool arguments
 */
export const RegistreringIdArgs = z.object({
	/** ID til registreringen som skal hentes */
	registreringsId: z.string().describe('ID til registreringen som skal hentes, f.eks. "7368480". Dette er den interne ID-en Documaster bruker for journalposten.'),
}).describe('Finn journalposter basert på intern ID. Denne ID-en finner du i resultatene fra søk eller andre verktøy som returnerer journalposter.');
export type RegistreringIdArgsType = z.infer<typeof RegistreringIdArgs>;

// === Dokumentversjon-verktøy argumenter (Filversjoner kategori) ===

/**
 * Zod schema for hent_dokversjon_regId tool arguments
 */
export const DokumentversjonRegIdArgs = z.object({
	/** ID til registreringen som skal brukes i søket */
	registreringsId: z.string().describe('ID til journalposten (registrering) som dokumentversjoner skal hentes fra. Denne ID-en finnes i resultatene fra journalpost-søk i feltet "id".'),
}).describe('Finn dokumentversjoner basert på journalpost-ID. Dokumentversjoner inneholder metadata om og lenker til selve filene. Hver dokumentversjon har et "referanseDokumentfil"-felt som inneholder filID du kan bruke med hent_filinnhold-verktøyet for å hente selve innholdet.');
export type DokumentversjonRegIdArgsType = z.infer<typeof DokumentversjonRegIdArgs>;

/**
 * Zod schema for hent_dokument_id tool arguments
 */
export const DokumentIdArgs = z.object({
	/** ID til dokumentet som skal hentes */
	dokumentId: z.string().describe('ID til dokumentet som skal hentes. Denne ID-en finnes i søkeresultater eller i dokumentversjonenes "refDokument.id"-felt.'),
}).describe('Finn et dokument basert på dokument-ID. Et dokument kan ha flere versjoner (dokumentversjoner) som inneholder selve filene.');
export type DokumentIdArgsType = z.infer<typeof DokumentIdArgs>;

/**
 * Zod schema for hent_dokversjon_regIdent tool arguments
 */
export const DokumentversjonRegistreringsIdentArgs = z.object({
	/** RegistreringsIdent som skal brukes i søket */
	registreringsIdent: z.string().describe('Journalnummer (registreringsIdent) som dokumentversjoner skal hentes fra, f.eks. "2024/4219". Dette er det synlige journalnummeret i Documaster.'),
}).describe('Finn dokumentversjoner basert på journalnummer. Dokumentversjoner inneholder metadata om og lenker til selve filene. Hver dokumentversjon har et "referanseDokumentfil"-felt som inneholder filID du kan bruke med hent_filinnhold-verktøyet for å hente selve innholdet.');
export type DokumentversjonRegistreringsIdentArgsType = z.infer<typeof DokumentversjonRegistreringsIdentArgs>;

/**
 * Zod schema for hent_dokumentversjon_id tool arguments
 */
export const DokumentversjonIdArgs = z.object({
	/** ID til dokumentversjonen som skal hentes */
	dokumentversjonId: z.string().describe('ID til dokumentversjonen som skal hentes. Denne ID-en finnes i resultater fra andre dokumentversjonssøk i feltet "id".'),
}).describe('Finn en spesifikk dokumentversjon basert på dokumentversjon-ID. Dokumentversjonen inneholder metadata om og lenke til selve filen. I "referanseDokumentfil"-feltet finner du filID som kan brukes med hent_filinnhold-verktøyet for å hente selve innholdet.');
export type DokumentversjonIdArgsType = z.infer<typeof DokumentversjonIdArgs>;

/**
 * Zod schema for hent_dokumentversjon_dokumentId tool arguments
 */
export const DokumentversjonDokumentIdArgs = z.object({
	/** ID til dokumentet som skal brukes i søket */
	dokumentId: z.string().describe('ID til dokumentet som dokumentversjoner skal hentes fra. Denne ID-en finnes i søkeresultater eller i dokumentversjonenes "refDokument.id"-felt.'),
}).describe('Finn alle versjoner av et dokument basert på dokument-ID. Dokumentversjoner inneholder metadata om og lenker til selve filene. Hver dokumentversjon har et "referanseDokumentfil"-felt som inneholder filID du kan bruke med hent_filinnhold-verktøyet for å hente selve innholdet.');
export type DokumentversjonDokumentIdArgsType = z.infer<typeof DokumentversjonDokumentIdArgs>;

/**
 * Zod schema for hent_dokumentversjon_saksId tool arguments
 */
export const DokumentversjonSaksIdArgs = z.object({
	/** ID til saken (mappen) som skal brukes i søket */
	mappeId: z.string().describe('ID til saken/mappen som dokumentversjoner skal hentes fra. Denne ID-en finnes i resultater fra sakssøk i feltet "id".'),
}).describe('Finn alle dokumentversjoner tilknyttet en sak, basert på sakens ID. Dokumentversjoner inneholder metadata om og lenker til selve filene. Hver dokumentversjon har et "referanseDokumentfil"-felt som inneholder filID du kan bruke med hent_filinnhold-verktøyet for å hente selve innholdet.');
export type DokumentversjonSaksIdArgsType = z.infer<typeof DokumentversjonSaksIdArgs>;

/**
 * Zod schema for hent_filinnhold tool arguments
 */
export const FilInnholdArgs = z.object({
	/** ID til referanseDokumentfil fra dokumentversjon */
	filId: z.string().describe('ID til dokumentfilen som skal hentes. Denne ID-en finnes i dokumentversjoner i feltet "referanseDokumentfil".'),
}).describe('Henter selve innholdet i en fil basert på filens ID. FilID finnes i dokumentversjonsobjekter i feltet "referanseDokumentfil". Tips: Hvis du har en dokumentversjon, se etter feltet "referanseDokumentfil" for å finne ID-en du trenger for dette verktøyet.');
export type FilInnholdArgsType = z.infer<typeof FilInnholdArgs>; 
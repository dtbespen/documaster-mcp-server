import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import documasterController from '../controllers/documaster.controller.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import { 
	DocumentmasterTestAuthArgs, 
	DocumentmasterSearchArgs,
	DocumentmasterSearchArgsType,
	MappePrimaerklasseArgs,
	MappeSekundaerklasseArgs,
	MappeSaksnummerArgs,
	MappeIdArgs,
	MappePrimaerklasseArgsType,
	MappeSekundaerklasseArgsType,
	MappeSaksnummerArgsType,
	MappeIdArgsType,
	RegistreringPrimaerklasseArgs,
	RegistreringSekundaerklasseArgs,
	RegistreringIdentArgs,
	RegistreringSaksnummerArgs,
	RegistreringIdArgs,
	RegistreringPrimaerklasseArgsType,
	RegistreringSekundaerklasseArgsType,
	RegistreringIdentArgsType,
	RegistreringSaksnummerArgsType,
	RegistreringIdArgsType,
	DokumentversjonRegistreringsIdArgs,
	DokumentIdArgs,
	DokumentversjonRegistreringsIdentArgs,
	DokumentversjonIdArgs,
	DokumentversjonRegistreringsIdArgsType,
	DokumentIdArgsType,
	DokumentversjonRegistreringsIdentArgsType,
	DokumentversjonIdArgsType,
	DokumentversjonDokumentIdArgs,
	DokumentversjonDokumentIdArgsType,
	DokumentversjonSaksIdArgs,
	DokumentversjonSaksIdArgsType,
	FilInnholdArgs,
	FilInnholdArgsType
} from './documaster.types.js';

/**
 * @function handleTestAuth
 * @description MCP Tool handler to test authentication against the Documaster API.
 *              It calls the documentmasterController to test authentication and formats the response for the MCP.
 *
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted response for the MCP.
 * @throws {McpError} Formatted error if the controller or service layer encounters an issue.
 * @internal For internal testing only.
 */
export async function handleTestAuth() {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleTestAuth',
	);
	methodLogger.debug(`Testing Documaster API authentication...`);

	try {
		// Call the controller to test authentication
		const result = await documasterController.testAuth();
		methodLogger.debug(`Got the response from the controller`, result);

		// Format the response for the MCP tool
		return {
			content: [
				{
					type: 'text' as const,
					text: result.message,
				},
			],
		};
	} catch (error) {
		methodLogger.error(`Error testing authentication`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleSearch
 * @description Handler for the search_documaster MCP tool.
 * Searches for documents in Documaster based on the provided query.
 * 
 * @param {DocumentmasterSearchArgsType} args - The search arguments
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted search results
 */
async function handleSearch(args: DocumentmasterSearchArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleSearch',
	);
	methodLogger.debug(`Searching Documaster documents...`, args);

	try {
		// Call the controller to search for documents
		const searchResults = await documasterController.searchDocuments(
			args.query,
			args.limit,
			args.documentType
		);
		
		methodLogger.debug(`Got search results from controller`, { count: searchResults.length });

		// Format the search results for display
		let resultText = `### Søkeresultater for "${args.query}"\n\n`;
		
		if (searchResults.length === 0) {
			resultText += "Ingen resultater funnet.";
		} else {
			resultText += `Fant ${searchResults.length} treff i arkivet.\n\n`;
			
			// Legg til klikkbare lenker for hvert resultat
			searchResults.forEach((result, index) => {
				const title = result.title || `Resultat ${index + 1}`;
				
				if (result.url) {
					resultText += `${index + 1}. [${title}](${result.url})`;
				} else {
					resultText += `${index + 1}. ${title}`;
				}
				
				// Legg til ID-informasjon som er relevant
				const ids = [];
				if (result.journalpostId) ids.push(`Journalpost: ${result.journalpostId}`);
				if (result.saksmappeId) ids.push(`Saksmappe: ${result.saksmappeId}`);
				if (result.dokumentId) ids.push(`Dokument: ${result.dokumentId}`);
				
				if (ids.length > 0) {
					resultText += ` (${ids.join(', ')})`;
				}
				
				resultText += '\n';
				
				// Legg til treff-kontekst hvis tilgjengelig
				if (result.highlights && result.highlights.length > 0) {
					// Begrens til 2 highlights per resultat for å holde responsen ryddig
					const limitedHighlights = result.highlights.slice(0, 2);
					resultText += `   *Treff i: ${limitedHighlights.join(' ... ')}*\n\n`;
				} else {
					resultText += '\n';
				}
			});
			
			resultText += `\nFor å hente fullstendig informasjon om et dokument eller journalpost, bruk et av spesifikke Documaster-verktøyene med relevante parametere.`;
		}

		// Return the formatted results with Markdown
		return {
			content: [
				{
					type: 'text' as const,
					text: resultText,
				},
				{
					type: 'text' as const,
					text: JSON.stringify({
						query: args,
						resultInfo: {
							count: searchResults.length,
							query: args.query,
							limit: args.limit,
							documentType: args.documentType
						},
						results: searchResults,
					}, null, 2)
				}
			],
		};
	} catch (error) {
		methodLogger.error(`Error searching documents`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleMappePrimaerklasse
 * @description Handler for the hent_mappe_primaerklasse MCP tool.
 * Queries documents in Documaster based on the provided primærklassering.
 * Includes direct URL links to each result in Documaster web interface.
 * 
 * @param {MappePrimaerklasseArgsType} args - The primærklassering arguments
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted query results
 */
async function handleMappePrimaerklasse(args: MappePrimaerklasseArgsType) {
	return handleSpecificMappeQuery({
		type: 'AbstraktMappe',
		limit: 10,
		query: 'refPrimaerKlasse.tittel = @classTitle',
		parameters: { '@classTitle': args.classTitle },
	});
}

/**
 * @function handleMappeSekundaerklasse
 * @description Handler for the hent_mappe_sekundaerklasse MCP tool.
 * Queries documents in Documaster based on the provided sekundærklassering.
 * 
 * @param {MappeSekundaerklasseArgsType} args - The sekundærklassering arguments
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted query results
 */
async function handleMappeSekundaerklasse(args: MappeSekundaerklasseArgsType) {
	return handleSpecificMappeQuery({
		type: 'AbstraktMappe',
		limit: 10,
		query: 'refSekundaerKlasse.tittel = @classTitle',
		parameters: { '@classTitle': args.classTitle },
	});
}

/**
 * @function handleMappeSaksnummer
 * @description Handler for the hent_mappe_saksnummer MCP tool.
 * Queries documents in Documaster based on the provided saksnummer.
 * 
 * @param {MappeSaksnummerArgsType} args - The saksnummer arguments
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted query results
 */
async function handleMappeSaksnummer(args: MappeSaksnummerArgsType) {
	return handleSpecificMappeQuery({
		type: 'AbstraktMappe',
		limit: 10,
		query: 'mappeIdent = @saksnummer',
		parameters: { '@saksnummer': args.saksnummer },
	});
}

/**
 * @function handleMappeId
 * @description Handler for the hent_mappe_id MCP tool.
 * Queries documents in Documaster based on the provided intern ID.
 * 
 * @param {MappeIdArgsType} args - The intern ID arguments
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted query results
 */
async function handleMappeId(args: MappeIdArgsType) {
	return handleSpecificMappeQuery({
		type: 'AbstraktMappe',
		limit: 10,
		query: 'id = @saksId',
		parameters: { '@saksId': args.saksId },
	});
}

/**
 * Genererer en lesbar oppsummering av resultatene med klikkbare Markdown-lenker
 * 
 * @param results Resultatlisten med URL-er
 * @param entityType Type entitet (mappe, journalpost, etc.) for bedre beskrivelser
 * @returns Markdown-formatert tekst med klikkbare lenker
 */
function generateReadableSummary(results: any[], queryType: string): string {
	if (results.length === 0) {
		return "Ingen resultater funnet.";
	}
	
	// Bestem riktig beskrivelse basert på type spørring
	let entityTypeDesc = "dokumenter";
	if (queryType.includes('Mappe')) {
		entityTypeDesc = "mapper";
	} else if (queryType.includes('Registrering')) {
		entityTypeDesc = "journalposter";
	} else if (queryType.includes('Dokument')) {
		entityTypeDesc = "dokumenter";
	}
	
	let summary = `### Fant ${results.length} ${entityTypeDesc} i Documaster\n\n`;
	
	// Legg til informasjon om resultatene med klikkbare lenker
	results.forEach((item, index) => {
		// Bruk tittel eller systemID eller en annen identifikator
		const title = item.tittel || item.systemID || item.mappeIdent || item.registreringsIdent || `Resultat ${index + 1}`;
		
		// Legg til klikkbar lenke hvis URL er tilgjengelig
		if (item.url) {
			summary += `${index + 1}. [${title}](${item.url})`;
		} else {
			summary += `${index + 1}. ${title}`;
		}
		
		// Legg til ekstra informasjon hvis tilgjengelig
		if (item.mappeIdent) {
			summary += ` (Saksnr: ${item.mappeIdent})`;
		}
		if (item.registreringsIdent) {
			summary += ` (Journalnr: ${item.registreringsIdent})`;
		}
		if (item.dokumentnummer) {
			summary += ` (Dok.nr: ${item.dokumentnummer})`;
		}
		
		summary += '\n';
	});
	
	summary += "\nFor detaljert data, se den strukturerte JSON-responsen nedenfor.\n";
	
	return summary;
}

/**
 * @function handleSpecificMappeQuery
 * @description Felles hjelpefunksjon som utfører queryEntities og formatterer svaret
 *
 * @param {any} queryBody - The query body
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted query results
 */
async function handleSpecificMappeQuery(queryBody: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
	const methodLogger = Logger.forContext('tools/documaster.tool.ts', 'handleSpecificMappeQuery');
	try {
		const result = await documasterController.queryEntities(queryBody);
		methodLogger.debug('Got mappe-query result', { count: result.results.length });

		// Legg til URL-er for hver mappe
		const resultsWithUrls = result.results.map(item => {
			// Bestem entitetstype basert på tilgjengelige felt
			let entityType = 'folder'; // Standard er 'folder'
			if (item.sakssekvensnummer !== undefined) {
				entityType = 'case-file'; // Saksmappe hvis den har sakssekvensnummer
			}
			
			return {
				...item,
				url: documasterController.buildEntityUrl(entityType, item.id)
			};
		});

		const responseObj = {
			query: queryBody,
			resultInfo: { count: result.results.length, hasMore: result.hasMore },
			results: resultsWithUrls,
		};

		// Lag en lesbar oppsummering med klikkbare lenker
		const readableSummary = generateReadableSummary(resultsWithUrls, queryBody.type);

		return {
			content: [
				{ 
					type: 'text' as const, 
					text: readableSummary 
				},
				{ 
					type: 'text' as const, 
					text: JSON.stringify(responseObj, null, 2) 
				},
			],
		};
	} catch (error) {
		methodLogger.error('Error executing mappe query', error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * Hjelpefunksjon for å legge til URL-er i resultat-objekter
 * 
 * @param results Resultatlisten fra queryEntities
 * @param entityType Type entitet som skal brukes i URL ('registry-entry', 'document', etc.)
 * @returns Resultatlisten med URL-er lagt til
 */
function addUrlsToResults(results: any[], entityType: string) {
	return results.map(item => ({
		...item,
		url: documasterController.buildEntityUrl(entityType, item.id)
	}));
}

/**
 * @function handleRegistreringPrimaerklasse
 * @description Handler for the hent_registrering_primaerklasse MCP tool.
 * Fetches registrations based on primary classification title.
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleRegistreringPrimaerklasse(args: RegistreringPrimaerklasseArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleRegistreringPrimaerklasse',
	);
	methodLogger.debug(`Querying Documaster for registrations by primary class...`, { classTitle: args.classTitle });

	try {
		// Build query
		const queryArgs = {
			type: 'AbstraktRegistrering',
			limit: 10,
			query: 'refMappe.refPrimaerKlasse.tittel = @classTitle',
			parameters: {
				'@classTitle': args.classTitle
			}
		};

		// Call the controller
		const result = await documasterController.queryEntities(queryArgs);
		methodLogger.debug(`Got query result from controller`, { count: result.results.length });

		// Legg til URL-er for registreringene
		const resultsWithUrls = addUrlsToResults(result.results, 'registry-entry');

		// Lag en lesbar oppsummering med klikkbare lenker
		const readableSummary = generateReadableSummary(resultsWithUrls, queryArgs.type);

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: readableSummary
				},
				{
					type: "text" as const,
					text: JSON.stringify({
						results: resultsWithUrls,
						metadata: {
							total: result.results.length,
							hasMore: result.hasMore,
							query: {
								type: queryArgs.type,
								classTitle: args.classTitle
							}
						}
					}, null, 2)
				}
			]
		};
	} catch (error) {
		methodLogger.error('Failed to query Documaster', { error });
		throw error;
	}
}

/**
 * @function handleRegistreringSekundaerklasse
 * @description Handler for the hent_registrering_sekundaerklasse MCP tool.
 * Fetches registrations based on secondary classification title.
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleRegistreringSekundaerklasse(args: RegistreringSekundaerklasseArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleRegistreringSekundaerklasse',
	);
	methodLogger.debug(`Querying Documaster for registrations by secondary class...`, { classTitle: args.classTitle });

	try {
		// Build query
		const queryArgs = {
			type: 'AbstraktRegistrering',
			limit: 10,
			query: 'refMappe.refSekundaerKlasse.tittel = @classTitle',
			parameters: {
				'@classTitle': args.classTitle
			}
		};

		// Call the controller
		const result = await documasterController.queryEntities(queryArgs);
		methodLogger.debug(`Got query result from controller`, { count: result.results.length });

		// Legg til URL-er for registreringene
		const resultsWithUrls = addUrlsToResults(result.results, 'registry-entry');

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: resultsWithUrls,
						metadata: {
							total: result.results.length,
							hasMore: result.hasMore,
							query: {
								type: queryArgs.type,
								classTitle: args.classTitle
							}
						}
					}, null, 2)
				}
			]
		};
	} catch (error) {
		methodLogger.error('Failed to query Documaster', { error });
		throw error;
	}
}

/**
 * @function handleRegistreringIdent
 * @description Handler for the hent_registrering_registreringsIdent MCP tool.
 * Fetches a registration based on registreringsIdent.
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleRegistreringIdent(args: RegistreringIdentArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleRegistreringIdent',
	);
	methodLogger.debug(`Querying Documaster for registration by registreringsIdent...`, { registreringsIdent: args.registreringsIdent });

	try {
		// Build query
		const queryArgs = {
			type: 'AbstraktRegistrering',
			limit: 10,
			query: 'registreringsIdent = @registreringsIdent',
			parameters: {
				'@registreringsIdent': args.registreringsIdent
			}
		};

		// Call the controller
		const result = await documasterController.queryEntities(queryArgs);
		methodLogger.debug(`Got query result from controller`, { count: result.results.length });

		// Legg til URL-er for registreringene
		const resultsWithUrls = addUrlsToResults(result.results, 'registry-entry');

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: resultsWithUrls,
						metadata: {
							total: result.results.length,
							hasMore: result.hasMore,
							query: {
								type: queryArgs.type,
								registreringsIdent: args.registreringsIdent
							}
						}
					}, null, 2)
				}
			]
		};
	} catch (error) {
		methodLogger.error('Failed to query Documaster', { error });
		throw error;
	}
}

/**
 * @function handleRegistreringSaksnummer
 * @description Handler for the hent_registrering_saksnummer MCP tool.
 * Fetches registrations based on case number (mappeIdent).
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleRegistreringSaksnummer(args: RegistreringSaksnummerArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleRegistreringSaksnummer',
	);
	methodLogger.debug(`Querying Documaster for registrations by case number...`, { saksnummer: args.saksnummer });

	try {
		// Build query
		const queryArgs = {
			type: 'AbstraktRegistrering',
			limit: 10,
			query: 'refMappe.mappeIdent = @saksnummer',
			parameters: {
				'@saksnummer': args.saksnummer
			}
		};

		// Call the controller
		const result = await documasterController.queryEntities(queryArgs);
		methodLogger.debug(`Got query result from controller`, { count: result.results.length });

		// Legg til URL-er for registreringene
		const resultsWithUrls = addUrlsToResults(result.results, 'registry-entry');

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: resultsWithUrls,
						metadata: {
							total: result.results.length,
							hasMore: result.hasMore,
							query: {
								type: queryArgs.type,
								saksnummer: args.saksnummer
							}
						}
					}, null, 2)
				}
			]
		};
	} catch (error) {
		methodLogger.error('Failed to query Documaster', { error });
		throw error;
	}
}

/**
 * @function handleRegistreringId
 * @description Handler for the hent_registrering_id MCP tool.
 * Fetches a registration by its ID.
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleRegistreringId(args: RegistreringIdArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleRegistreringId',
	);
	methodLogger.debug(`Querying Documaster for registration by ID...`, { registreringsId: args.registreringsId });

	try {
		// Build query
		const queryArgs = {
			type: 'AbstraktRegistrering',
			limit: 10,
			query: 'id = @registreringsId',
			parameters: {
				'@registreringsId': args.registreringsId
			}
		};

		// Call the controller
		const result = await documasterController.queryEntities(queryArgs);
		methodLogger.debug(`Got query result from controller`, { count: result.results.length });

		// Legg til URL-er for registreringene
		const resultsWithUrls = addUrlsToResults(result.results, 'registry-entry');

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: resultsWithUrls,
						metadata: {
							total: result.results.length,
							hasMore: result.hasMore,
							query: {
								type: queryArgs.type,
								registreringsId: args.registreringsId
							}
						}
					}, null, 2)
				}
			]
		};
	} catch (error) {
		methodLogger.error('Failed to query Documaster', { error });
		throw error;
	}
}

/**
 * @function handleDokumentversjonRegistreringsId
 * @description Handler for the hent_dokumentversjon_registreringsId MCP tool.
 * Fetches document versions based on registration ID.
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleDokumentversjonRegistreringsId(args: DokumentversjonRegistreringsIdArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleDokumentversjonRegistreringsId',
	);
	methodLogger.debug(`Querying Documaster for document versions by registration ID...`, { registreringsId: args.registreringsId });

	try {
		// Build query
		const queryArgs = {
			type: 'Dokumentversjon',
			limit: 10,
			query: 'refDokument.refRegistrering.id = @registreringsId',
			parameters: {
				'@registreringsId': args.registreringsId
			}
		};

		// Call the controller
		const result = await documasterController.queryEntities(queryArgs);
		methodLogger.debug(`Got query result from controller`, { count: result.results.length });

		// Legg til URL-er for dokumentversjonene
		const resultsWithUrls = addUrlsToResults(result.results, 'record');

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: resultsWithUrls,
						metadata: {
							total: result.results.length,
							hasMore: result.hasMore,
							query: {
								type: queryArgs.type,
								registreringsId: args.registreringsId
							}
						}
					}, null, 2)
				}
			]
		};
	} catch (error) {
		methodLogger.error('Failed to query Documaster', { error });
		throw error;
	}
}

/**
 * @function handleDokumentId
 * @description Handler for the hent_dokument_id MCP tool.
 * Fetches document by its ID.
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleDokumentId(args: DokumentIdArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleDokumentId',
	);
	methodLogger.debug(`Querying Documaster for document by ID...`, { dokumentId: args.dokumentId });

	try {
		// Build query
		const queryArgs = {
			type: 'Dokument',
			limit: 10,
			query: 'id = @dokumentId',
			parameters: {
				'@dokumentId': args.dokumentId
			}
		};

		// Call the controller
		const result = await documasterController.queryEntities(queryArgs);
		methodLogger.debug(`Got query result from controller`, { count: result.results.length });

		// Legg til URL-er for dokumentene
		const resultsWithUrls = addUrlsToResults(result.results, 'document');

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: resultsWithUrls,
						metadata: {
							total: result.results.length,
							hasMore: result.hasMore,
							query: {
								type: queryArgs.type,
								dokumentId: args.dokumentId
							}
						}
					}, null, 2)
				}
			]
		};
	} catch (error) {
		methodLogger.error('Failed to query Documaster', { error });
		throw error;
	}
}

/**
 * @function handleDokumentversjonRegistreringsIdent
 * @description Handler for the hent_dokversjon_regIdent MCP tool.
 * Fetches document versions based on registration ident.
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleDokumentversjonRegistreringsIdent(args: DokumentversjonRegistreringsIdentArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleDokumentversjonRegistreringsIdent',
	);
	methodLogger.debug(`Querying Documaster for document versions by registration ident...`, { registreringsIdent: args.registreringsIdent });

	try {
		// Build query
		const queryArgs = {
			type: 'Dokumentversjon',
			limit: 10,
			query: 'refDokument.refRegistrering.registreringsIdent = @registreringsIdent',
			parameters: {
				'@registreringsIdent': args.registreringsIdent
			}
		};

		// Call the controller
		const result = await documasterController.queryEntities(queryArgs);
		methodLogger.debug(`Got query result from controller`, { count: result.results.length });

		// Legg til URL-er for dokumentversjonene
		const resultsWithUrls = addUrlsToResults(result.results, 'record');

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: resultsWithUrls,
						metadata: {
							total: result.results.length,
							hasMore: result.hasMore,
							query: {
								type: queryArgs.type,
								registreringsIdent: args.registreringsIdent
							}
						}
					}, null, 2)
				}
			]
		};
	} catch (error) {
		methodLogger.error('Failed to query Documaster', { error });
		throw error;
	}
}

/**
 * @function handleDokumentversjonId
 * @description Handler for the hent_dokumentversjon_id MCP tool.
 * Fetches a specific document version by its ID.
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleDokumentversjonId(args: DokumentversjonIdArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleDokumentversjonId',
	);
	methodLogger.debug(`Querying Documaster for document version by ID...`, { dokumentversjonId: args.dokumentversjonId });

	try {
		// Build query
		const queryArgs = {
			type: 'Dokumentversjon',
			limit: 10,
			query: 'id = @dokumentversjonId',
			parameters: {
				'@dokumentversjonId': args.dokumentversjonId
			}
		};

		// Call the controller
		const result = await documasterController.queryEntities(queryArgs);
		methodLogger.debug(`Got query result from controller`, { count: result.results.length });

		// Legg til URL-er for dokumentversjonene
		const resultsWithUrls = addUrlsToResults(result.results, 'record');

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: resultsWithUrls,
						metadata: {
							total: result.results.length,
							hasMore: result.hasMore,
							query: {
								type: queryArgs.type,
								dokumentversjonId: args.dokumentversjonId
							}
						}
					}, null, 2)
				}
			]
		};
	} catch (error) {
		methodLogger.error('Failed to query Documaster', { error });
		throw error;
	}
}

/**
 * @function handleDokumentversjonDokumentId
 * @description Handler for the hent_dokumentversjon_dokumentId MCP tool.
 * Fetches document versions related to a specific document ID.
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleDokumentversjonDokumentId(args: DokumentversjonDokumentIdArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleDokumentversjonDokumentId',
	);
	methodLogger.debug(`Querying Documaster for document versions by document ID...`, { dokumentId: args.dokumentId });

	try {
		// Build query
		const queryArgs = {
			type: 'Dokumentversjon',
			limit: 10,
			query: 'refDokument.id = @dokumentId',
			parameters: {
				'@dokumentId': args.dokumentId
			}
		};

		// Call the controller
		const result = await documasterController.queryEntities(queryArgs);
		methodLogger.debug(`Got query result from controller`, { count: result.results.length });

		// Legg til URL-er for dokumentversjonene
		const resultsWithUrls = addUrlsToResults(result.results, 'record');

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: resultsWithUrls,
						metadata: {
							total: result.results.length,
							hasMore: result.hasMore,
							query: {
								type: queryArgs.type,
								dokumentId: args.dokumentId
							}
						}
					}, null, 2)
				}
			]
		};
	} catch (error) {
		methodLogger.error('Failed to query Documaster', { error });
		throw error;
	}
}

/**
 * @function handleDokumentversjonSaksId
 * @description Handler for the hent_dokumentversjon_saksId MCP tool.
 * Fetches document versions related to a specific case (folder) ID.
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleDokumentversjonSaksId(args: DokumentversjonSaksIdArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleDokumentversjonSaksId',
	);
	methodLogger.debug(`Querying Documaster for document versions by case ID...`, { mappeId: args.mappeId });

	try {
		// Build query
		const queryArgs = {
			type: 'Dokumentversjon',
			limit: 10,
			query: 'refDokument.refRegistrering.refMappe.id = @mappeId',
			parameters: {
				'@mappeId': args.mappeId
			}
		};

		// Call the controller
		const result = await documasterController.queryEntities(queryArgs);
		methodLogger.debug(`Got query result from controller`, { count: result.results.length });

		// Legg til URL-er for dokumentversjonene
		const resultsWithUrls = addUrlsToResults(result.results, 'record');

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: resultsWithUrls,
						metadata: {
							total: result.results.length,
							hasMore: result.hasMore,
							query: {
								type: queryArgs.type,
								mappeId: args.mappeId
							}
						}
					}, null, 2)
				}
			]
		};
	} catch (error) {
		methodLogger.error('Failed to query Documaster', { error });
		throw error;
	}
}

/**
 * @function handleFilInnhold
 * @description Handler for the hent_filinnhold MCP tool.
 * Henter filinnhold basert på ID til referanseDokumentfil.
 * 
 * @param {FilInnholdArgsType} args - Argumentet med ID-en til filen
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatert filinnhold
 */
async function handleFilInnhold(args: FilInnholdArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleFilInnhold',
	);
	methodLogger.debug(`Henter filinnhold fra Documaster...`, args);

	try {
		// Kall kontrolleren for å hente filinnhold
		const fileResult = await documasterController.getFileContent(args.filId);
		
		methodLogger.debug(`Fikk filinnhold fra kontrolleren`, { 
			metadata: fileResult.metadata,
			contentLength: fileResult.content.length 
		});

		// Format the search results for display
		let resultText = `### Filinnhold\n\n`;
		resultText += `**Filnavn:** ${fileResult.metadata.fileName}\n`;
		resultText += `**Filtype:** ${fileResult.metadata.fileType}\n`;
		
		if (fileResult.metadata.pageCount) {
			resultText += `**Antall sider:** ${fileResult.metadata.pageCount}\n`;
		}
		
		if (fileResult.metadata.fileSize) {
			const fileSizeKB = Math.round(fileResult.metadata.fileSize / 1024);
			resultText += `**Filstørrelse:** ${fileSizeKB} KB\n`;
		}
		
		resultText += `\n### Innhold:\n\n${fileResult.content}\n`;

		// Sanitize content preview to ensure it's valid JSON-compatible text
		// Remove any control characters or special sequences that might break JSON parsing
		const sanitizedContent = fileResult.content
			.replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
			.replace(/Warning:|Error:/g, '[NOTAT]: '); // Replace warning/error patterns that might break JSON

		// Only show first 500 chars of sanitized content in the JSON preview
		const contentPreview = sanitizedContent.substring(0, 500) + 
			(sanitizedContent.length > 500 ? '...' : '');
		
		// Return the formatted results with proper text types
		return {
			content: [
				{
					type: 'text' as const,
					text: resultText,
				},
				{
					type: 'text' as const,
					// Safely stringify the JSON object with sanitized content
					text: JSON.stringify({
						metadata: fileResult.metadata,
						contentPreview: contentPreview
					}, null, 2)
				}
			],
		};
	} catch (error) {
		methodLogger.error(`Error henting av filinnhold`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the Documaster tools with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance.
 */
export function registerTools(server: McpServer) {
	const loggerScope = 'tools/documaster.tool.ts:registerTools';
	const logger = Logger.forContext(loggerScope);

	logger.debug('Registering Documaster tools');
	
	try {
		server.tool(
			'documaster_test_auth',
			`[INTERNT] Tester autentisering mot Documaster API ved å hente et OAuth2 token. Returnerer resultat og en maskert versjon av tokenet ved suksess.`,
			DocumentmasterTestAuthArgs.shape,
			handleTestAuth,
		);

		server.tool(
			'search_documaster',
			`Søker i Documaster sine arkiver etter dokumenter basert på søkeord og filtreringsvalg.
Returnerer en liste med dokumenter som matcher søket, inkludert tittel, type, opprettelsesdato og sammendrag.
Bruk dette verktøyet når brukeren vil finne relevante dokumenter i Documaster arkivet.`,
			DocumentmasterSearchArgs.shape,
			handleSearch,
		);
		
		server.tool(
			'hent_mappe_primaerklasse',
			`Henter en mappe basert på angitt primærklassering (tittel på klasse).
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			MappePrimaerklasseArgs.shape,
			handleMappePrimaerklasse,
		);
		
		server.tool(
			'hent_mappe_sekundaerklasse',
			`Henter en mappe basert på angitt sekundærklassering (tittel på klasse).
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			MappeSekundaerklasseArgs.shape,
			handleMappeSekundaerklasse,
		);

		server.tool(
			'hent_mappe_saksnummer',
			`Henter en mappe basert på saksnummer (mappeIdent).
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			MappeSaksnummerArgs.shape,
			handleMappeSaksnummer,
		);

		server.tool(
			'hent_mappe_id',
			`Henter en mappe basert på intern ID.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			MappeIdArgs.shape,
			handleMappeId,
		);

		server.tool(
			'hent_registrering_primaerklasse',
			`Henter registreringer basert på primærklassering (tittel på klasse).
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			RegistreringPrimaerklasseArgs.shape,
			handleRegistreringPrimaerklasse,
		);

		server.tool(
			'hent_registrering_sekundaerklasse',
			`Henter registreringer basert på sekundærklassering (tittel på klasse).
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			RegistreringSekundaerklasseArgs.shape,
			handleRegistreringSekundaerklasse,
		);

		server.tool(
			'hent_registrering_ident',
			`Henter registreringer basert på journalpostident.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			RegistreringIdentArgs.shape,
			handleRegistreringIdent,
		);

		server.tool(
			'hent_registrering_saksnummer',
			`Henter registreringer basert på saksnummer (mappeIdent).
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			RegistreringSaksnummerArgs.shape,
			handleRegistreringSaksnummer,
		);

		server.tool(
			'hent_registrering_id',
			`Henter en registrering basert på intern ID.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			RegistreringIdArgs.shape,
			handleRegistreringId,
		);
		
		server.tool(
			'hent_dokumentversjon_registreringsId',
			`Henter dokumentversjoner basert på registreringsID.
Dokumentversjon inneholder metadata og lenke til selve filen (i feltet "referanseDokumentfil").
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			DokumentversjonRegistreringsIdArgs.shape,
			handleDokumentversjonRegistreringsId,
		);

		server.tool(
			'hent_dokument_id',
			`Henter ett dokument basert på dokumentID.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			DokumentIdArgs.shape,
			handleDokumentId,
		);

		server.tool(
			'hent_dokversjon_regIdent',
			`Henter dokumentversjoner basert på registreringsIdent (journalpostIdent).
Dokumentversjon inneholder metadata og lenke til selve filen (i feltet "referanseDokumentfil").
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			DokumentversjonRegistreringsIdentArgs.shape,
			handleDokumentversjonRegistreringsIdent,
		);

		server.tool(
			'hent_dokumentversjon_id',
			`Henter en dokumentversjon basert på dokumentversjonID.
Dokumentversjon inneholder metadata og lenke til selve filen (i feltet "referanseDokumentfil").
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			DokumentversjonIdArgs.shape,
			handleDokumentversjonId,
		);

		server.tool(
			'hent_dokumentversjon_dokumentId',
			`Henter dokumentversjoner basert på dokument-ID.
Dokumentversjon inneholder metadata og lenke til selve filen (i feltet "referanseDokumentfil").
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			DokumentversjonDokumentIdArgs.shape,
			handleDokumentversjonDokumentId,
		);

		server.tool(
			'hent_dokumentversjon_saksId',
			`Henter alle dokumentversjoner på en sak, basert på id på saken.
Dokumentversjon inneholder metadata og lenke til selve filen (i feltet "referanseDokumentfil").
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.`,
			DokumentversjonSaksIdArgs.shape,
			handleDokumentversjonSaksId,
		);

		server.tool(
			'hent_filinnhold',
			`Henter filinnhold fra filen i arkivet basert på id på referanseDokumentfil. Filen er tilkoblet en dokumentversjon med feltet referanseDokumentfil.
Konverterer og returnerer innholdet av filen som tekst, spesielt for PDF-filer.`,
			FilInnholdArgs.shape,
			handleFilInnhold,
		);

		logger.debug('Documaster tools registered successfully');
	} catch (error) {
		logger.error('Failed to register Documaster tools', { error });
		throw error;
	}
}

export default { registerTools }; 
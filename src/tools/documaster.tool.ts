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
	DokumentIdArgs,
	DokumentversjonRegistreringsIdentArgs,
	DokumentversjonIdArgs,
	DokumentIdArgsType,
	DokumentversjonRegistreringsIdentArgsType,
	DokumentversjonIdArgsType,
	DokumentversjonDokumentIdArgs,
	DokumentversjonDokumentIdArgsType,
	DokumentversjonSaksIdArgs,
	DokumentversjonSaksIdArgsType,
	DokumentversjonRegIdArgs,
	DokumentversjonRegIdArgsType,
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

		// Forbedret formatering av resultatet med mer kontekstuell informasjon
		let resultText = `### Filinnhold fra Documaster\n\n`;
		
		// Metadata-seksjon
		resultText += `#### Fildetaljer\n`;
		resultText += `**FilID:** ${args.filId}\n`;
		
		if (fileResult.metadata.fileName) {
			resultText += `**Filnavn:** ${fileResult.metadata.fileName}\n`;
		}
		
		if (fileResult.metadata.fileType) {
			resultText += `**Filtype:** ${fileResult.metadata.fileType}\n`;
		}
		
		if (fileResult.metadata.pageCount) {
			resultText += `**Antall sider:** ${fileResult.metadata.pageCount}\n`;
		}
		
		if (fileResult.metadata.fileSize) {
			const fileSizeKB = Math.round(fileResult.metadata.fileSize / 1024);
			resultText += `**Filstørrelse:** ${fileSizeKB} KB\n`;
		}
		
		// Sjekk om dokumentId eksisterer i metadata (TypeScript vet ikke om dette feltet)
		if (fileResult.metadata && 'documentId' in fileResult.metadata && fileResult.metadata.documentId) {
			resultText += `**Tilknyttet dokument-ID:** ${fileResult.metadata.documentId} *(Kan brukes med hent_dokumentversjon_dokumentId)*\n`;
		}
		
		// Sjekk om documentVersionId eksisterer i metadata (TypeScript vet ikke om dette feltet)
		if (fileResult.metadata && 'documentVersionId' in fileResult.metadata && fileResult.metadata.documentVersionId) {
			resultText += `**Tilknyttet dokumentversjon-ID:** ${fileResult.metadata.documentVersionId} *(Kan brukes med hent_dokumentversjon_id)*\n`;
		}
		
		// Forklaring om hvordan denne filen relaterer seg til dokumentversjonen
		resultText += `\n**Om denne filen:** Dette er selve filinnholdet som er knyttet til en dokumentversjon. Hver dokumentversjon har et felt kalt 'referanseDokumentfil' som inneholder ID-en som brukes for å hente dette innholdet.\n\n`;
		
		// Innholdsseksjon
		resultText += `#### Innhold\n\n`;
		
		// Legg til innholdet, eller en melding hvis innholdet er tomt
		if (fileResult.content && fileResult.content.trim().length > 0) {
			resultText += `${fileResult.content}\n`;
		} else {
			resultText += `*Filinnholdet kunne ikke konverteres til tekst eller er tomt. Dette kan skje med bildefiler eller andre ikke-tekstbaserte dokumenter.*\n`;
		}
		
		// Legg til tips om videre steg
		resultText += `\n#### Neste steg\n`;
		resultText += `- For å finne flere dokumenter i samme journalpost, bruk 'hent_dokversjon_regId' med journalpost-ID\n`;
		resultText += `- For å finne dokumenter i samme sak, bruk 'hent_dokumentversjon_saksId' med saks-ID\n`;

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
						metadata: {
							...fileResult.metadata,
							source: "Documaster",
							retrievedWith: "hent_filinnhold",
							contentPreviewLength: contentPreview.length,
							fullContentLength: fileResult.content.length
						},
						contentPreview: contentPreview,
						relationships: {
							documentVersionTools: "Bruk 'hent_dokumentversjon_id' med dokumentversjon-ID for relaterte metadata",
							documentTools: "Bruk 'hent_dokumentversjon_dokumentId' med dokument-ID for å finne alle versjoner"
						}
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
 * @function handleDokumentversjonRegId
 * @description Handler for the hent_dokversjon_regId MCP tool.
 * Fetches document versions based on registration ID.
 * 
 * @param args - The arguments for the tool
 * @returns A text response containing the formatted query results
 */
async function handleDokumentversjonRegId(args: DokumentversjonRegIdArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleDokumentversjonRegId',
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
		
		// Forbedret lesbar formatering med mer kontekstuell informasjon
		let readableOutput = `### Dokumentversjoner for journalpost (ID: ${args.registreringsId})\n\n`;
		
		if (resultsWithUrls.length === 0) {
			readableOutput += "Ingen dokumentversjoner funnet for denne journalposten.\n";
		} else {
			readableOutput += `Fant ${resultsWithUrls.length} dokumentversjon${resultsWithUrls.length > 1 ? 'er' : ''}.\n\n`;
			
			// Legg til informasjon om hver dokumentversjon
			resultsWithUrls.forEach((item, index) => {
				const title = item.tittel || `Dokumentversjon ${index + 1}`;
				
				// Først linjen med tittel og lenke
				readableOutput += `${index + 1}. [${title}](${item.url || '#'})\n`;
				
				// Legg til filnavn hvis tilgjengelig
				if (item.filnavn) {
					readableOutput += `   **Filnavn:** ${item.filnavn}\n`;
				}
				
				// Legg til format/filtype hvis tilgjengelig
				if (item.format) {
					readableOutput += `   **Format:** ${item.format}\n`;
				}
				
				// Legg til dokumentversjon-ID og referanse til filinnhold
				readableOutput += `   **Dokumentversjon-ID:** ${item.id}\n`;
				
				// Viktig: Legg til referanse til filID hvis den finnes
				if (item.referanseDokumentfil) {
					readableOutput += `   **FilID:** ${item.referanseDokumentfil} *(Bruk denne med hent_filinnhold for å hente selve innholdet)*\n`;
				}
				
				// Legg til dokument-ID hvis tilgjengelig
				if (item.refDokument && item.refDokument.id) {
					readableOutput += `   **Dokument-ID:** ${item.refDokument.id} *(Bruk denne med hent_dokumentversjon_dokumentId for å finne alle versjoner)*\n`;
				}
				
				readableOutput += "\n";
			});
			
			// Tips om videre bruk
			readableOutput += "**Tips:** For å hente selve filinnholdet, bruk verktøyet 'hent_filinnhold' med FilID-en fra 'referanseDokumentfil'-feltet.\n";
		}

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: readableOutput
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
								registreringsId: args.registreringsId
							},
							nextSteps: {
								getFileContent: "Bruk 'hent_filinnhold' med FilID fra 'referanseDokumentfil'-feltet for å hente selve innholdet",
								getDocumentVersions: "Bruk 'hent_dokumentversjon_dokumentId' med Dokument-ID for å se alle versjoner av et dokument"
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
		// === INTERNE VERKTØY ===
		server.tool(
			'documaster_test_auth',
			`[INTERNT] Tester autentisering mot Documaster API ved å hente et OAuth2 token. Returnerer resultat og en maskert versjon av tokenet ved suksess.`,
			DocumentmasterTestAuthArgs.shape,
			handleTestAuth,
		);

		// === SØK ===
		server.tool(
			'search_documaster',
			`Søker i Documaster sine arkiver etter dokumenter basert på søkeord og filtreringsvalg.
Returnerer en liste med dokumenter som matcher søket, inkludert tittel, type, opprettelsesdato og sammendrag.
Bruk dette verktøyet når brukeren vil finne relevante dokumenter i Documaster arkivet.`,
			DocumentmasterSearchArgs.shape,
			handleSearch,
		);
		
		// === MAPPE/SAKER ===
		// Disse verktøyene hjelper deg å finne mapper/saker i Documaster
		server.tool(
			'hent_mappe_primaerklasse',
			`Henter mapper (saker) basert på angitt primærklassering (hovedkategori).
Mapper er saker i Documaster som inneholder journalposter og dokumenter.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: Når du har funnet en mappe, kan du bruke ID-en med hent_registrering_saksnummer for å finne journalposter i saken.`,
			MappePrimaerklasseArgs.shape,
			handleMappePrimaerklasse,
		);
		
		server.tool(
			'hent_mappe_sekundaerklasse',
			`Henter mapper (saker) basert på angitt sekundærklassering (underkategori).
Mapper er saker i Documaster som inneholder journalposter og dokumenter.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: Når du har funnet en mappe, kan du bruke ID-en med hent_registrering_saksnummer for å finne journalposter i saken.`,
			MappeSekundaerklasseArgs.shape,
			handleMappeSekundaerklasse,
		);

		server.tool(
			'hent_mappe_saksnummer',
			`Henter mapper (saker) basert på saksnummer (mappeIdent, f.eks. "2022/109").
Dette er det synlige saksnummeret i Documaster-systemet.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: Når du har funnet en mappe, kan du bruke ID-en med hent_registrering_saksnummer for å finne journalposter i saken.`,
			MappeSaksnummerArgs.shape,
			handleMappeSaksnummer,
		);

		server.tool(
			'hent_mappe_id',
			`Henter en spesifikk mappe (sak) basert på intern ID.
ID-en kan du finne i resultater fra sakssøk eller andre verktøy som returnerer mapper.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: Når du har funnet en mappe, kan du bruke ID-en med hent_dokumentversjon_saksId for å finne alle dokumentversjoner i saken.`,
			MappeIdArgs.shape,
			handleMappeId,
		);

		// === JOURNALPOSTER (REGISTRERINGER) ===
		// Disse verktøyene hjelper deg å finne journalposter i Documaster
		server.tool(
			'hent_registrering_primaerklasse',
			`Henter journalposter (registreringer) basert på primærklassering (hovedkategori).
Journalposter er innkommende eller utgående brev/dokumenter som er registrert i en sak.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: Når du har funnet en journalpost, kan du bruke ID-en med hent_dokversjon_regId for å finne dokumentversjoner.`,
			RegistreringPrimaerklasseArgs.shape,
			handleRegistreringPrimaerklasse,
		);

		server.tool(
			'hent_registrering_sekundaerklasse',
			`Henter journalposter (registreringer) basert på sekundærklassering (underkategori).
Journalposter er innkommende eller utgående brev/dokumenter som er registrert i en sak.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: Når du har funnet en journalpost, kan du bruke ID-en med hent_dokversjon_regId for å finne dokumentversjoner.`,
			RegistreringSekundaerklasseArgs.shape,
			handleRegistreringSekundaerklasse,
		);

		server.tool(
			'hent_registrering_ident',
			`Henter journalposter (registreringer) basert på journalpostnummer (f.eks. "2024/4219").
Dette er det synlige journalnummeret i Documaster-systemet.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: Når du har funnet en journalpost, kan du bruke ID-en med hent_dokversjon_regId for å finne dokumentversjoner.`,
			RegistreringIdentArgs.shape,
			handleRegistreringIdent,
		);

		server.tool(
			'hent_registrering_saksnummer',
			`Henter journalposter (registreringer) basert på saksnummer (mappeIdent, f.eks. "2022/109").
Dette gir deg alle journalposter som tilhører en bestemt sak.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: Når du har funnet en journalpost, kan du bruke ID-en med hent_dokversjon_regId for å finne dokumentversjoner.`,
			RegistreringSaksnummerArgs.shape,
			handleRegistreringSaksnummer,
		);

		server.tool(
			'hent_registrering_id',
			`Henter en spesifikk journalpost (registrering) basert på intern ID.
ID-en kan du finne i resultater fra journalpostsøk eller andre verktøy som returnerer journalposter.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: Når du har funnet en journalpost, kan du bruke ID-en med hent_dokversjon_regId for å finne dokumentversjoner.`,
			RegistreringIdArgs.shape,
			handleRegistreringId,
		);
		
		// === DOKUMENTVERSJONER ===
		// Disse verktøyene hjelper deg å finne dokumentversjoner som inneholder lenker til selve filene
		server.tool(
			'hent_dokversjon_regId',
			`Henter dokumentversjoner basert på journalpost-ID.
Dokumentversjoner inneholder metadata om og lenke til selve filen.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: I hvert dokumentversjonsobjekt finner du feltet "referanseDokumentfil" som inneholder ID-en du trenger for å hente selve filinnholdet med hent_filinnhold-verktøyet.`,
			DokumentversjonRegIdArgs.shape,
			handleDokumentversjonRegId,
		);

		server.tool(
			'hent_dokversjon_regIdent',
			`Henter dokumentversjoner basert på journalnummer (registreringsIdent, f.eks. "2024/4219").
Dette er det synlige journalnummeret i Documaster-systemet.
Dokumentversjon inneholder metadata og lenke til selve filen (i feltet "referanseDokumentfil").
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: I hvert dokumentversjonsobjekt finner du feltet "referanseDokumentfil" som inneholder ID-en du trenger for å hente selve filinnholdet med hent_filinnhold-verktøyet.`,
			DokumentversjonRegistreringsIdentArgs.shape,
			handleDokumentversjonRegistreringsIdent,
		);

		server.tool(
			'hent_dokumentversjon_id',
			`Henter en spesifikk dokumentversjon basert på dokumentversjon-ID.
ID-en kan du finne i resultater fra andre dokumentversjonssøk.
Dokumentversjon inneholder metadata og lenke til selve filen (i feltet "referanseDokumentfil").
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: I dokumentversjonsobjektet finner du feltet "referanseDokumentfil" som inneholder ID-en du trenger for å hente selve filinnholdet med hent_filinnhold-verktøyet.`,
			DokumentversjonIdArgs.shape,
			handleDokumentversjonId,
		);

		server.tool(
			'hent_dokumentversjon_dokumentId',
			`Henter alle versjoner av et dokument basert på dokument-ID.
ID-en kan du finne i søkeresultater eller i dokumentversjonenes "refDokument.id"-felt.
Dokumentversjon inneholder metadata og lenke til selve filen (i feltet "referanseDokumentfil").
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: I hvert dokumentversjonsobjekt finner du feltet "referanseDokumentfil" som inneholder ID-en du trenger for å hente selve filinnholdet med hent_filinnhold-verktøyet.`,
			DokumentversjonDokumentIdArgs.shape,
			handleDokumentversjonDokumentId,
		);

		server.tool(
			'hent_dokumentversjon_saksId',
			`Henter alle dokumentversjoner tilknyttet en sak, basert på sakens ID.
ID-en kan du finne i resultater fra sakssøk i feltet "id".
Dokumentversjon inneholder metadata og lenke til selve filen (i feltet "referanseDokumentfil").
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: I hvert dokumentversjonsobjekt finner du feltet "referanseDokumentfil" som inneholder ID-en du trenger for å hente selve filinnholdet med hent_filinnhold-verktøyet.`,
			DokumentversjonSaksIdArgs.shape,
			handleDokumentversjonSaksId,
		);

		// === DOKUMENTER ===
		server.tool(
			'hent_dokument_id',
			`Henter ett dokument basert på dokumentID.
Et dokument kan ha flere versjoner (dokumentversjoner) som inneholder lenker til selve filene.
Responsen inkluderer URL-lenker til hvert resultat i Documaster web-grensesnittet.

Tips: Når du har funnet et dokument, kan du bruke ID-en med hent_dokumentversjon_dokumentId for å finne alle versjoner av dokumentet.`,
			DokumentIdArgs.shape,
			handleDokumentId,
		);

		// === FILINNHOLD ===
		server.tool(
			'hent_filinnhold',
			`Henter selve innholdet i en fil basert på filID.
FilID finner du i dokumentversjonsobjekter i feltet "referanseDokumentfil".
Konverterer og returnerer innholdet av filen som tekst, spesielt nyttig for PDF-filer.

Tips: Dette er det siste steget i prosessen for å få tak i det faktiske innholdet i et dokument. Bruk først andre verktøy for å finne dokumentversjonen, deretter dette verktøyet med filID-en fra "referanseDokumentfil"-feltet.`,
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
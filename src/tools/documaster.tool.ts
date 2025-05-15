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
	RegistreringIdArgsType
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
			resultText += `Fant ${searchResults.length} treff i arkivet. Se fullstendige data i den strukturerte responsen.\n\n`;
			resultText += `\nFor å hente fullstendig informasjon om et dokument eller journalpost, bruk \`query_documaster\` verktøyet med relevant ID.`;
		}

		// Return the formatted results as Markdown
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

		const responseObj = {
			query: queryBody,
			resultInfo: { count: result.results.length, hasMore: result.hasMore },
			results: result.results,
		};

		return {
			content: [
				{ type: 'text' as const, text: JSON.stringify(responseObj, null, 2) },
			],
		};
	} catch (error) {
		methodLogger.error('Error executing mappe query', error);
		return formatErrorForMcpTool(error);
	}
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

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: result.results,
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

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: result.results,
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

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: result.results,
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

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: result.results,
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

		// Format the result for MCP response
		return {
			content: [
				{
					type: "text" as const,
					text: JSON.stringify({
						results: result.results,
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
 * @function registerTools
 * @description Registers the Documaster tools with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance.
 */
export function registerTools(server: McpServer) {
	const serverLogger = Logger.forContext('tools/documaster.tool.ts', 'registerTools');
	serverLogger.debug('Registering Documaster tools...');

	// Test auth tool - Internal
	server.tool(
		'documaster_test_auth',
		`[INTERNT] Tester autentisering mot Documaster API ved å hente et OAuth2 token. Returnerer resultat og en maskert versjon av tokenet ved suksess.`,
		DocumentmasterTestAuthArgs.shape,
		handleTestAuth,
	);
	
	// Main public tools
	server.tool(
		'search_documaster',
		`Søker i Documaster sine arkiver etter dokumenter basert på søkeord og filtreringsvalg.
Returnerer en liste med dokumenter som matcher søket, inkludert tittel, type, opprettelsesdato og sammendrag.
Bruk dette verktøyet når brukeren vil finne relevante dokumenter i Documaster arkivet.`,
		DocumentmasterSearchArgs.shape,
		handleSearch,
	);
	
	// Mappe (Case folder) tools
	server.tool(
		'hent_mappe_primaerklasse',
		`Henter en mappe basert på angitt primærklassering (tittel på klasse).`,
		MappePrimaerklasseArgs.shape,
		handleMappePrimaerklasse,
	);

	server.tool(
		'hent_mappe_sekundaerklasse',
		`Henter en mappe basert på angitt sekundærklassering (tittel på klasse).`,
		MappeSekundaerklasseArgs.shape,
		handleMappeSekundaerklasse,
	);

	server.tool(
		'hent_mappe_saksnummer',
		`Henter en mappe basert på saksnummer (mappeIdent).`,
		MappeSaksnummerArgs.shape,
		handleMappeSaksnummer,
	);

	server.tool(
		'hent_mappe_id',
		`Henter en mappe basert på intern ID.`,
		MappeIdArgs.shape,
		handleMappeId,
	);

	// Registrering (Record) tools
	server.tool(
		'hent_registrering_primaerklasse',
		`Henter registreringer i arkivet, basert på oppgitt primærklassering.`,
		RegistreringPrimaerklasseArgs.shape,
		handleRegistreringPrimaerklasse,
	);

	server.tool(
		'hent_registrering_sekundaerklasse',
		`Henter registreringer i arkivet, basert på oppgitt sekundærklassering.`,
		RegistreringSekundaerklasseArgs.shape,
		handleRegistreringSekundaerklasse,
	);

	server.tool(
		'hent_registrering_registreringsIdent',
		`Henter registrering i arkivet, basert på oppgitt registreringsnummer, som er kallt "registreringsIdent" i documaster sin datamodell.`,
		RegistreringIdentArgs.shape,
		handleRegistreringIdent,
	);

	server.tool(
		'hent_registrering_saksnummer',
		`Henter registreringer i arkivet, basert på oppgitt saksnummer, som er kallt "mappeIdent" i documaster sin datamodell.`,
		RegistreringSaksnummerArgs.shape,
		handleRegistreringSaksnummer,
	);

	server.tool(
		'hent_registrering_id',
		`Henter registrering i arkivet, basert på oppgitt id.`,
		RegistreringIdArgs.shape,
		handleRegistreringId,
	);

	serverLogger.debug('Registered all Documaster tools.');
}

export default { registerTools }; 
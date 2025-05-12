import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Logger } from '../utils/logger.util.js';
import { 
	DocumentmasterTestAuthArgs, 
	DocumentmasterSearchArgs, 
	DocumentmasterSearchArgsType,
	DocumentmasterQueryArgs,
	DocumentmasterQueryArgsType
} from './documaster.types.js';
import { formatErrorForMcpTool } from '../utils/error.util.js';
import documasterController from '../controllers/documaster.controller.js';

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
 * @description Handler for the search-documaster MCP tool.
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
			resultText += `Fant ${searchResults.length} dokument(er):\n\n`;
			
			searchResults.forEach((result, index) => {
				resultText += `#### ${index + 1}. ${result.title}\n`;
				resultText += `- **ID**: ${result.id}\n`;
				if (result.documentType) resultText += `- **Type**: ${result.documentType}\n`;
				if (result.createdDate) resultText += `- **Opprettet**: ${result.createdDate}\n`;
				if (result.summary) resultText += `- **Sammendrag**: ${result.summary}\n`;
				if (result.url) resultText += `- **URL**: ${result.url}\n`;
				resultText += '\n';
			});
			
			resultText += `\nFor å stille spørsmål til et spesifikt dokument, bruk \`query-documaster\` verktøyet med dokument-ID.`;
		}

		// Return the formatted results as Markdown
		return {
			content: [
				{
					type: 'text' as const,
					text: resultText,
				},
			],
		};
	} catch (error) {
		methodLogger.error(`Error searching documents`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function handleQuery
 * @description Handler for the query-documaster MCP tool.
 * Queries a specific document in Documaster based on the provided query and document ID.
 * 
 * @param {DocumentmasterQueryArgsType} args - The query arguments
 * @returns {Promise<{ content: Array<{ type: 'text', text: string }> }>} Formatted query results
 */
async function handleQuery(args: DocumentmasterQueryArgsType) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'handleQuery',
	);
	methodLogger.debug(`Querying Documaster document...`, args);

	try {
		// Call the controller to query the document
		const queryResult = await documasterController.queryDocument(
			args.documentId,
			args.query
		);
		
		methodLogger.debug(`Got query result from controller`);

		// Format the query results for display
		let resultText = `### Svar på spørsmål om dokument\n\n`;
		resultText += `**Dokument ID**: ${queryResult.documentId}\n`;
		if (queryResult.documentTitle) resultText += `**Dokument tittel**: ${queryResult.documentTitle}\n`;
		resultText += `**Spørsmål**: ${args.query}\n\n`;
		resultText += `**Svar**:\n${queryResult.answer}\n`;
		
		if (queryResult.confidence) {
			// Format confidence as percentage
			const confidencePercent = Math.round(queryResult.confidence * 100);
			resultText += `\n**Konfidens**: ${confidencePercent}%\n`;
		}

		// Return the formatted results as Markdown
		return {
			content: [
				{
					type: 'text' as const,
					text: resultText,
				},
			],
		};
	} catch (error) {
		methodLogger.error(`Error querying document`, error);
		return formatErrorForMcpTool(error);
	}
}

/**
 * @function registerTools
 * @description Registers the Documaster tools with the MCP server.
 *
 * @param {McpServer} server - The MCP server instance.
 */
function registerTools(server: McpServer) {
	const methodLogger = Logger.forContext(
		'tools/documaster.tool.ts',
		'registerTools',
	);
	methodLogger.debug(`Registering Documaster tools...`);

	// Internal test tool - not for general use
	server.tool(
		'documaster_test_auth',
		`[INTERNT] Tester autentisering mot Documaster API ved å hente et OAuth2 token. Returnerer resultat og en maskert versjon av tokenet ved suksess.`,
		DocumentmasterTestAuthArgs.shape,
		handleTestAuth,
	);
	
	// Main public tools
	server.tool(
		'search-documaster',
		`Søker i Documaster sine arkiver etter dokumenter basert på søkeord og filtreringsvalg.
Returnerer en liste med dokumenter som matcher søket, inkludert tittel, type, opprettelsesdato og sammendrag.
Bruk dette verktøyet når brukeren vil finne relevante dokumenter i Documaster arkivet.`,
		DocumentmasterSearchArgs.shape,
		handleSearch,
	);
	
	server.tool(
		'query-documaster',
		`Stiller spørsmål til et spesifikt dokument i Documaster og returnerer et svar basert på dokumentets innhold.
Du må angi dokument-ID (som kan hentes fra \`search-documaster\`) og et spørsmål eller en instruksjon.
Bruk dette verktøyet når brukeren vil analysere eller stille spørsmål om innholdet i et bestemt dokument.`,
		DocumentmasterQueryArgs.shape,
		handleQuery,
	);

	methodLogger.debug('Successfully registered Documaster tools.');
}

export default { registerTools }; 
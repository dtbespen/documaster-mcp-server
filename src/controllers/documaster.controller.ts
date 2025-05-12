import { Logger } from '../utils/logger.util.js';
import { DocumentmasterOAuth2Service } from '../services/documaster.oauth2.service.js';
import { documasterConfig } from '../utils/documaster-config.util.js';

/**
 * Grensesnitt for søkeresultater fra Documaster
 */
export interface DocumentmasterSearchResult {
	id: string;
	title: string;
	documentType?: string;
	createdDate?: string;
	summary?: string;
	url?: string;
}

/**
 * Grensesnitt for resultat av spørringer mot dokumenter i Documaster
 */
export interface DocumentmasterQueryResult {
	documentId: string;
	documentTitle?: string;
	answer: string;
	confidence?: number;
}

/**
 * Controller for Documaster API operations
 * Handles authentication and provides methods for various Documaster operations
 */
class DocumentmasterController {
	private readonly logger = Logger.forContext('controllers/documaster.controller.ts');
	private oauthService: DocumentmasterOAuth2Service;
	
	constructor() {
		this.logger.debug('Initializing DocumentmasterController');
		this.oauthService = new DocumentmasterOAuth2Service();
	}
	
	/**
	 * Get the base URL for Documaster API
	 * @returns Base URL string
	 * @internal
	 */
	getApiBaseUrl(): string {
		return documasterConfig.getOAuth2Config().baseUrl;
	}
	
	/**
	 * Get the Authorization header for Documaster API requests
	 * @returns Promise resolving to the Authorization header value
	 * @internal
	 */
	async getAuthHeader(): Promise<string> {
		const methodLogger = Logger.forContext(
			'controllers/documaster.controller.ts',
			'getAuthHeader',
		);
		
		methodLogger.debug('Getting authorization header for Documaster API');
		return this.oauthService.getAuthorizationHeader();
	}
	
	/**
	 * Test authentication against the Documaster API
	 * 
	 * @returns Object containing status and message information
	 * @internal
	 */
	async testAuth(): Promise<{success: boolean; message: string}> {
		const methodLogger = Logger.forContext(
			'controllers/documaster.controller.ts',
			'testAuth',
		);
		
		try {
			methodLogger.debug('Testing Documaster API authentication');
			const token = await this.oauthService.getAccessToken();
			const maskedToken = token.length > 20 
				? `${token.substring(0, 10)}...${token.substring(token.length - 10)}`
				: '[Token for kort til å maskere]';
			
			methodLogger.debug('Successfully retrieved access token');
			return {
				success: true,
				message: `Autentisering vellykket. Token-lengde: ${token.length} tegn. Token: ${maskedToken}`
			};
		} catch (error) {
			methodLogger.error('Authentication test failed', error);
			return {
				success: false,
				message: `Autentisering feilet: ${error instanceof Error ? error.message : 'Ukjent feil'}`
			};
		}
	}

	/**
	 * Søk i Documaster etter dokumenter
	 * 
	 * @param query Søkestreng
	 * @param limit Maksimalt antall resultater (standard: 10)
	 * @param documentType Valgfri filtrering etter dokumenttype
	 * @returns Liste med søkeresultater
	 */
	async searchDocuments(
		query: string, 
		limit: number = 10, 
		documentType?: string
	): Promise<DocumentmasterSearchResult[]> {
		const methodLogger = Logger.forContext(
			'controllers/documaster.controller.ts',
			'searchDocuments',
		);
		
		methodLogger.debug('Searching Documaster for documents', { query, limit, documentType });
		
		try {
			// TODO: Implementer faktisk søk mot Documaster API
			// Her må vi bruke this.getAuthHeader() for å få autorisasjonsheaderen
			// og deretter gjøre et API-kall mot Documaster
			
			// Eksempel på mock-data som returneres midlertidig:
			methodLogger.debug('Returning mock search results (ikke implementert)');
			return [
				{
					id: 'doc-123',
					title: 'Eksempeldokument 1',
					documentType: documentType || 'Rapport',
					createdDate: '2023-05-15',
					summary: 'Dette er et eksempel på et dokument som matcher søket "' + query + '"',
					url: 'https://documaster.com/documents/doc-123'
				},
				{
					id: 'doc-456',
					title: 'Eksempeldokument 2',
					documentType: documentType || 'Notat',
					createdDate: '2023-06-20',
					summary: 'Et annet eksempel på et dokument som matcher søket "' + query + '"',
					url: 'https://documaster.com/documents/doc-456'
				}
			].slice(0, limit);
		} catch (error) {
			methodLogger.error('Error searching documents', error);
			throw new Error(`Feil ved søk i dokumenter: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
		}
	}
	
	/**
	 * Utfør en spørring mot et spesifikt dokument i Documaster
	 * 
	 * @param documentId ID til dokumentet som skal spørres mot
	 * @param query Spørringen eller instruksjonen for dokumentanalyse
	 * @returns Svar på spørringen
	 */
	async queryDocument(documentId: string, query: string): Promise<DocumentmasterQueryResult> {
		const methodLogger = Logger.forContext(
			'controllers/documaster.controller.ts',
			'queryDocument',
		);
		
		methodLogger.debug('Querying Documaster document', { documentId, query });
		
		try {
			// TODO: Implementer faktisk spørring mot Documaster API
			// Her må vi bruke this.getAuthHeader() for å få autorisasjonsheaderen
			// og deretter gjøre et API-kall mot Documaster
			
			// Eksempel på mock-data som returneres midlertidig:
			methodLogger.debug('Returning mock query result (ikke implementert)');
			return {
				documentId,
				documentTitle: 'Tittel på dokument ' + documentId,
				answer: `Dette er et mock-svar på spørringen "${query}" for dokument ${documentId}. Implementasjon av faktisk API-integrasjon gjenstår.`,
				confidence: 0.85
			};
		} catch (error) {
			methodLogger.error('Error querying document', error);
			throw new Error(`Feil ved spørring mot dokument: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
		}
	}
}

// Export controller instance as a singleton
export default new DocumentmasterController(); 
import { Logger } from '../utils/logger.util.js';
import { DocumentmasterOAuth2Service } from '../services/documaster.oauth2.service.js';
import { documasterConfig } from '../utils/documaster-config.util.js';
import axios from 'axios';
import { 
	DocumentmasterSearchResult, 
	DocumentmasterQueryResult, 
	DocumentmasterGenericQueryResponse 
} from '../models/documentmaster.model.js';

import { DocumentmasterQueryArgsType } from '../tools/documaster.types.js';

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
			// Hent auth header for API-kallet
			const authHeader = await this.getAuthHeader();
			const baseUrl = this.getApiBaseUrl();
			
			// Bygg API-endepunktet med samme logikk som i queryEntities
			const baseUrlRaw = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

			// Sikre at vi har port og riktig endepunkt
			let searchEndpoint;
			if (baseUrlRaw.includes(':8083')) {
				// Allerede har port spesifisert i baseUrl
				searchEndpoint = `${baseUrlRaw}/rms/api/public/noark5/v1/full-text/search`;
			} else {
				// Legg til port
				const baseUrlWithPort = baseUrlRaw.replace(/(https?:\/\/[^\/]+)(.*)/, '$1:8083$2');
				searchEndpoint = `${baseUrlWithPort}/rms/api/public/noark5/v1/full-text/search`;
			}
			
			methodLogger.debug('Constructed search endpoint:', { baseUrl, baseUrlRaw, searchEndpoint });
			
			// Bygg søkeparametrene med riktig format for Documaster API
			const searchBody: any = {
				doctype: "Tekst", // Standard indekssamling ifølge dokumentasjonen
				query  // Søkestreng
			};
			
			// Legg til limit hvis spesifisert (merk: API-et krever ikke dette, så vi fjerner det fra standard parametre)
			if (limit && limit !== 10) { // Bare sett hvis ikke standard verdi
				searchBody.limit = limit;
			}
			
			// Legg til dokumenttype-filter hvis det er definert
			if (documentType) {
				searchBody.filters = { documentType };
			}
			
			methodLogger.debug('Calling Documaster search API', { endpoint: searchEndpoint, body: searchBody });
			
			// Utfør API-kallet
			const response = await axios.post(searchEndpoint, searchBody, {
				headers: {
					'Authorization': authHeader,
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'X-Documaster-Error-Response-Type': 'application/json'
				}
			});
			
			methodLogger.debug('Received search results from Documaster API', { 
				resultCount: response.data.results?.length || 0,
				totalHits: response.data.total || 0
			});
			
			// Konverter API-svaret til vår format
			const results = (response.data.results || []).map((item: any, index: number) => {
				// Ekstraher IDs fra hierarkiet
				const dokumentId = item.ids['Dokument.id']?.[0] || '';
				const journalpostId = item.ids['AbstraktRegistrering.id']?.[0] || '';
				const saksmappeId = item.ids['AbstraktMappe.id']?.[0] || '';
				
				// Finn ut hvor treffet ble funnet ved å se på highlights
				const highlightKeys = Object.keys(item.highlights || {});
				const foundIn = highlightKeys.length > 0 ? highlightKeys[0] : 'Ukjent';
				
				// Samle alle highlight-verdier
				const allHighlights: string[] = [];
				highlightKeys.forEach(key => {
					const highlights = item.highlights[key] || [];
					highlights.forEach((hl: string) => {
						// Konverter highlight-markeringer til noe mer lesbart
						const readableHighlight = hl
							.replace(/\|=hlstart=\|/g, '**')
							.replace(/\|=hlstop=\|/g, '**');
						allHighlights.push(`${key}: ${readableHighlight}`);
					});
				});
				
				return {
					id: journalpostId || saksmappeId || dokumentId || `result-${index}`,
					dokumentId,
					journalpostId,
					saksmappeId,
					title: `Treff i ${foundIn.split('.').pop() || 'dokument'}`, // Forenklet tittel basert på hvor treffet er funnet
					documentType: 'Arkivdokument',
					foundIn,
					highlights: allHighlights,
					url: journalpostId ? 
						this.buildEntityUrl('registry-entry', journalpostId) : 
						(saksmappeId ? 
							this.buildEntityUrl('case-file', saksmappeId) : 
							dokumentId ? this.buildEntityUrl('document', dokumentId) : '')
				};
			}).slice(0, limit);
			
			return results;
		} catch (error) {
			methodLogger.error('Error searching documents', error);
			
			// Sjekk om feilen kommer fra Axios
			if (axios.isAxiosError(error)) {
				const statusCode = error.response?.status;
				const errorData = error.response?.data;
				methodLogger.error('API error details', { statusCode, errorData });
				
				throw new Error(
					`Feil ved søk i dokumenter: API returnerte ${statusCode}. ${
						errorData?.message || errorData?.error || errorData?.description || error.message || 'Ukjent API-feil'
					}`
				);
			}
			
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
			// Hent auth header for API-kallet
			const authHeader = await this.getAuthHeader();
			const baseUrl = this.getApiBaseUrl();
			
			// Bygg API-endepunktet for dokumentanalyse
			const queryEndpoint = `${baseUrl}/api/v1/documents/${documentId}/query`;
			
			methodLogger.debug('Calling Documaster query API', { endpoint: queryEndpoint });
			
			// Utfør API-kallet
			const response = await axios.post(queryEndpoint, {
				query: query
			}, {
				headers: {
					'Authorization': authHeader,
					'Content-Type': 'application/json',
					'Accept': 'application/json'
				}
			});
			
			methodLogger.debug('Received query result from Documaster API');
			
			// Konverter API-svaret til vårt format
			// NB: Dette må tilpasses basert på faktisk API-respons fra Documaster
			return {
				documentId,
				documentTitle: response.data.documentTitle || response.data.title,
				answer: response.data.answer || response.data.result || response.data.content || 'Ingen respons fra API',
				confidence: response.data.confidence || response.data.score
			};
		} catch (error) {
			methodLogger.error('Error querying document', error);
			
			// Sjekk om feilen kommer fra Axios
			if (axios.isAxiosError(error)) {
				const statusCode = error.response?.status;
				const errorData = error.response?.data;
				methodLogger.error('API error details', { statusCode, errorData });
				
				throw new Error(
					`Feil ved spørring mot dokument: API returnerte ${statusCode}. ${
						errorData?.message || errorData?.error || error.message || 'Ukjent API-feil'
					}`
				);
			}
			
			throw new Error(`Feil ved spørring mot dokument: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
		}
	}

	/**
	 * Utfør generelt query-kall mot Documaster /noark5/v1/query
	 */
	async queryEntities(args: DocumentmasterQueryArgsType): Promise<DocumentmasterGenericQueryResponse> {
		const methodLogger = Logger.forContext(
			'controllers/documaster.controller.ts',
			'queryEntities',
		);
		methodLogger.debug('Executing generic query', args);
		try {
			const authHeader = await this.getAuthHeader();
			const baseUrl = this.getApiBaseUrl();
			// Sørg for at vi bruker riktig URL format for Documaster API
			const baseUrlRaw = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

			// Sikre at vi har port og riktig endepunkt
			let endpoint;
			if (baseUrlRaw.includes(':8083')) {
				// Allerede har port spesifisert i baseUrl
				endpoint = `${baseUrlRaw}/rms/api/public/noark5/v1/query`;
			} else {
				// Legg til port
				const baseUrlWithPort = baseUrlRaw.replace(/(https?:\/\/[^\/]+)(.*)/, '$1:8083$2');
				endpoint = `${baseUrlWithPort}/rms/api/public/noark5/v1/query`;
			}

			methodLogger.debug('Constructed endpoint:', { baseUrl, baseUrlRaw, endpoint });

			// Build request body as provided in args
			const body: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
				type: args.type,
				limit: args.limit ?? 10,
			};
			if (args.query) body.query = args.query;
			if (args.parameters) body.parameters = args.parameters;
			if (args.offset !== undefined) body.offset = args.offset;
			if (args.joins) body.joins = args.joins;
			if (args.sortOrder) body.sortOrder = args.sortOrder;

			methodLogger.debug('Calling Documaster query API', { endpoint, body });

			const response = await axios.post(endpoint, body, {
				headers: {
					'Authorization': authHeader,
					'Content-Type': 'application/json',
					'Accept': 'application/json',
					'X-Documaster-Error-Response-Type': 'application/json',
				},
			});

			methodLogger.debug('Received generic query response');
			return {
				hasMore: !!response.data.hasMore,
				results: response.data.results ?? [],
			};
		} catch (error) {
			methodLogger.error('Error during generic query', error);
			if (axios.isAxiosError(error)) {
				const status = error.response?.status;
				const msg = error.response?.data?.message || error.message;
				throw new Error(`Feil ved query: API returnerte ${status}. ${msg}`);
			}
			throw new Error(`Feil ved query: ${error instanceof Error ? error.message : 'Ukjent feil'}`);
		}
	}

	/**
	 * Bygg en URL til Documaster klient-grensesnitt for en gitt entitetstype og ID
	 * 
	 * @param entityType Type entitet ('case-file', 'folder', 'registry-entry', 'record', 'document')
	 * @param entityId ID til entiteten
	 * @returns URL til entiteten i Documaster-grensesnittet
	 */
	buildEntityUrl(entityType: string, entityId: string): string {
		if (!entityId) return '';
		
		const baseUrl = this.getApiBaseUrl();
		// Fjern eventuelle avsluttende skråstreker
		const baseUrlRaw = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
		
		// Fjern eventuelle porter og rms-stier i URL-en siden vi skal bruke /v2/entity/
		const baseUrlWithoutPort = baseUrlRaw.replace(/:\d+/, '');
		// Fjern også /rms om det finnes i URL-en
		const cleanBaseUrl = baseUrlWithoutPort.replace(/\/rms\/?$/, '');
		
		return `${cleanBaseUrl}/v2/entity/${entityType}/${entityId}`;
	}
}

// Export controller instance as a singleton
export default new DocumentmasterController(); 
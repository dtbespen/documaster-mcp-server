import { Logger } from '../utils/logger.util.js';
import { DocumentmasterOAuth2Service } from '../services/documaster.oauth2.service.js';
import { documasterConfig } from '../utils/documaster-config.util.js';
import axios from 'axios';
import { 
	DocumentmasterSearchResult, 
	DocumentmasterQueryResult, 
	DocumentmasterGenericQueryResponse 
} from '../models/documentmaster.model.js';
import pdfParse from 'pdf-parse';

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
	 * Normaliserer en entitetstype til standard format
	 * Håndterer ulike variasjoner og synonymer for entitetstypene
	 * 
	 * @param entityType Entitetstype som skal normaliseres
	 * @returns Normalisert entitetstype ('case-file', 'folder', 'registry-entry', 'record', 'document')
	 * @private
	 */
	private normalizeEntityType(entityType: string): string {
		const methodLogger = Logger.forContext(
			'controllers/documaster.controller.ts',
			'normalizeEntityType',
		);
		
		// Gjør input til lowercase for konsistens
		const type = entityType.toLowerCase().trim();
		
		// Definer mappinger av varianter
		const typeMap: Record<string, string> = {
			// Case-file varianter
			'case-file': 'case-file',
			'casefile': 'case-file',
			'case': 'case-file',
			'saksmappe': 'case-file',
			'sak': 'case-file',
			'saksdokument': 'case-file',
			
			// Folder varianter
			'folder': 'folder',
			'mappe': 'folder',
			
			// Registry-entry varianter
			'registry-entry': 'registry-entry',
			'registryentry': 'registry-entry',
			'registry': 'registry-entry',
			'journalpost': 'registry-entry',
			'journal': 'registry-entry',
			'entry': 'registry-entry',
			'post': 'registry-entry',
			
			// Record varianter
			'record': 'record',
			'basisregistrering': 'record',
			'registrering': 'record',
			
			// Document varianter
			'document': 'document',
			'dokument': 'document',
			'doc': 'document',
			'fil': 'document',
			'file': 'document'
		};
		
		// Finn normalisert type fra mappingen
		const normalizedType = typeMap[type];
		
		if (!normalizedType) {
			methodLogger.warn(`Ukjent entitetstype "${entityType}", bruker "document" som fallback`);
			return 'document';
		}
		
		// Hvis innkommende type ikke er identisk med den normaliserte, logg det
		if (type !== normalizedType) {
			methodLogger.debug(`Normaliserte entitetstype fra "${type}" til "${normalizedType}"`);
		}
		
		return normalizedType;
	}

	/**
	 * Bygg en URL til Documaster klient-grensesnitt for en gitt entitetstype og ID
	 * 
	 * @param entityType Type entitet ('case-file', 'folder', 'registry-entry', 'record', 'document')
	 * @param entityId ID til entiteten
	 * @returns URL til entiteten i Documaster-grensesnittet
	 */
	buildEntityUrl(entityType: string, entityId: string): string {
		const methodLogger = Logger.forContext(
			'controllers/documaster.controller.ts',
			'buildEntityUrl',
		);
		
		if (!entityId) return '';
		
		// Normaliser entitetstypen
		const normalizedEntityType = this.normalizeEntityType(entityType);
		
		const baseUrl = this.getApiBaseUrl();
		// Fjern eventuelle avsluttende skråstreker
		const baseUrlRaw = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
		
		// Ekstraher bare domenet uten porter
		const domainMatch = baseUrlRaw.match(/(https?:\/\/[^:\/]+)/);
		const domain = domainMatch ? domainMatch[1] : baseUrlRaw.replace(/:\d+/, '').replace(/\/rms.*$/, '');
		
		// Bygg korrekt URL med /v2/entity/ format
		const resultUrl = `${domain}/v2/entity/${normalizedEntityType}/${entityId}`;
		
		methodLogger.debug('Built entity URL', { 
			baseUrl, 
			baseUrlRaw, 
			domain, 
			entityType,
			normalizedEntityType, 
			entityId, 
			resultUrl 
		});
		
		return resultUrl;
	}

	/**
	 * Henter filinnhold fra dokumentarkivet basert på referanseDokumentfil-ID
	 * Støtter parsing av PDF-filer og andre tekstbaserte formater
	 * 
	 * @param filId ID til referanseDokumentfil fra en dokumentversjon
	 * @returns Filens innhold som tekst og metadata om filen
	 */
	async getFileContent(filId: string): Promise<{ 
		content: string; 
		metadata: { 
			fileType: string; 
			fileName: string;
			pageCount?: number;
			fileSize?: number;
		} 
	}> {
		const methodLogger = Logger.forContext(
			'controllers/documaster.controller.ts',
			'getFileContent',
		);
		
		methodLogger.debug('Henter filinnhold fra Documaster', { filId });
		
		try {
			// Hent auth header for API-kallet
			const authHeader = await this.getAuthHeader();
			const baseUrl = this.getApiBaseUrl();
			
			// Bygg API-endepunktet
			const baseUrlRaw = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
			
			// Sikre at vi har port og riktig endepunkt
			let downloadEndpoint;
			if (baseUrlRaw.includes(':8083')) {
				// Allerede har port spesifisert i baseUrl
				downloadEndpoint = `${baseUrlRaw}/rms/api/public/noark5/v1/download?id=${filId}`;
			} else {
				// Legg til port
				const baseUrlWithPort = baseUrlRaw.replace(/(https?:\/\/[^\/]+)(.*)/, '$1:8083$2');
				downloadEndpoint = `${baseUrlWithPort}/rms/api/public/noark5/v1/download?id=${filId}`;
			}
			
			methodLogger.debug('Constructed download endpoint:', { downloadEndpoint });
			
			// Utfør API-kallet med arraybuffer responseType for binærdata
			const response = await axios.get(downloadEndpoint, {
				headers: {
					'Authorization': authHeader,
					'Accept': '*/*'  // Aksepter alle content-types
				},
				responseType: 'arraybuffer'  // Viktig for binærfiler
			});
			
			const contentType = response.headers['content-type'] || 'application/octet-stream';
			const contentDisposition = response.headers['content-disposition'] || '';
			
			// Prøv å hente filnavn fra content-disposition header
			let fileName = 'ukjent_fil';
			const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
			if (fileNameMatch && fileNameMatch[1]) {
				fileName = fileNameMatch[1];
			}
			
			methodLogger.debug('Mottok fil fra Documaster API', { 
				contentType,
				contentLength: response.headers['content-length'],
				fileName
			});
			
			// Konverter filen til tekst basert på filtype
			const fileBuffer = Buffer.from(response.data);
			let fileContent = '';
			let metadata: {
				fileType: string;
				fileName: string;
				pageCount?: number;
				fileSize?: number;
			} = {
				fileType: contentType,
				fileName: fileName,
				fileSize: fileBuffer.length
			};
			
			if (contentType.includes('pdf')) {
				try {
					methodLogger.debug('Parser PDF-fil');
					
					// Bruk try-catch inni til å fange opp advarsler ved parsing
					try {
						const pdfData = await pdfParse(fileBuffer);
						fileContent = pdfData.text || '';
						metadata.pageCount = pdfData.numpages;
						
						// Rens filinnholdet for ugyldige tegn som kan påvirke JSON
						fileContent = fileContent
							.replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Fjern kontroll-tegn
							.trim(); // Fjern whitespace i start og slutt
							
						methodLogger.debug('PDF-parsing fullført', { 
							pageCount: pdfData.numpages,
							textLength: fileContent.length
						});
					} catch (pdfWarning) {
						// Hvis vi får en advarsel, logg den men fortsett
						methodLogger.warn('Advarsel ved parsing av PDF', pdfWarning);
						// Hvis vi har fått noe innhold, bruk det, ellers sett standardmelding
						if (!fileContent) {
							fileContent = '[PDF-innhold delvis ekstrahert med advarsler]';
						}
					}
				} catch (pdfError) {
					methodLogger.error('Feil ved parsing av PDF', pdfError);
					throw new Error(`Kunne ikke parse PDF: ${pdfError instanceof Error ? pdfError.message : 'Ukjent feil'}`);
				}
			} else if (contentType.includes('text/') || 
					contentType.includes('json') || 
					contentType.includes('xml') || 
					contentType.includes('html')) {
				// For tekstfiler, konverter buffer til tekst direkte
				fileContent = fileBuffer.toString('utf-8');
				// Rens også innholdet her
				fileContent = fileContent
					.replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Fjern kontroll-tegn
					.trim(); // Fjern whitespace i start og slutt
					
				methodLogger.debug('Tekstfil konvertert til streng', { textLength: fileContent.length });
			} else {
				// For ukjente filtyper, returner en melding om at filtypen ikke støttes
				methodLogger.debug('Filtypen støttes ikke for tekstekstrahering', { contentType });
				fileContent = `[Filinnhold kunne ikke ekstraheres. Filtype: ${contentType} støttes ikke for tekstekstrahering]`;
			}
			
			// Sikre at vi alltid returnerer en gyldig streng
			if (fileContent === null || fileContent === undefined) {
				fileContent = '';
			}
			
			return {
				content: fileContent,
				metadata: metadata
			};
		} catch (error) {
			methodLogger.error('Error henting av filinnhold', error);
			throw error;
		}
	}
}

// Export controller instance as a singleton
export default new DocumentmasterController(); 
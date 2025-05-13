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
	foundIn?: string; // Hvor søketreffet ble funnet
	// Hierarkisk informasjon
	journalpostId?: string;
	saksmappeId?: string;
	dokumentId?: string;
	highlights?: string[]; // Søketreff med markering
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
 * Resultatstruktur fra Documaster /noark5/v1/query
 */
export interface DocumentmasterGenericQueryResponse {
	hasMore: boolean;
	results: Array<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
} 
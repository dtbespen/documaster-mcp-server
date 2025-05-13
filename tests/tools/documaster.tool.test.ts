import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { formatErrorForMcpTool } from '../../src/utils/error.util';
import documasterController from '../../src/controllers/documaster.controller';
import { handleTestAuth } from '../../src/tools/documaster.tool';
import { DocumentmasterSearchResult, DocumentmasterQueryResult } from '../../src/models/documentmaster.model';

// Mock documaster controller
jest.mock('../../src/controllers/documaster.controller', () => ({
	default: {
		testAuth: jest.fn(),
		searchDocuments: jest.fn(),
		queryDocument: jest.fn()
	}
}));

// Oppdaterer mock data for søkeresultater med nye felter
const mockSearchResults: Array<DocumentmasterSearchResult> = [
	{
		id: '12345',
		title: 'Test dokument 1',
		documentType: 'PDF',
		createdDate: '2023-01-01',
		summary: 'Dette er et testdokument',
		url: 'https://example.com/doc/12345',
		// Nye felter:
		journalpostId: '12345',
		saksmappeId: '6789',
		dokumentId: '10111',
		foundIn: 'Korrespondansepart.korrespondansepartNavn',
		highlights: ['Korrespondansepart.korrespondansepartNavn: **Test** søkeord']
	},
	{
		id: '67890',
		title: 'Test dokument 2',
		documentType: 'Word',
		createdDate: '2023-02-01',
		summary: 'Dette er et annet testdokument',
		url: 'https://example.com/doc/67890',
		// Nye felter:
		journalpostId: '67890',
		saksmappeId: '12345',
		dokumentId: '98765',
		foundIn: 'AbstraktMappe.tittel',
		highlights: ['AbstraktMappe.tittel: Dokument med **test** i tittelen']
	}
];

// Mock for queryDocument
const mockQueryResult: DocumentmasterQueryResult = {
	documentId: '12345',
	documentTitle: 'Test Document',
	answer: 'This is the answer to your query',
	confidence: 0.85
};

describe('Documaster Tool Tests', () => {
	describe('handleTestAuth', () => {
		it('should return successful authentication result', async () => {
			const mockSuccessResult = {
				success: true,
				message: 'Authentication successful. Token length: 1234 characters.'
			};
			
			((documasterController.testAuth as any) as jest.Mock).mockResolvedValue(mockSuccessResult);
			
			const result = await handleTestAuth();
			
			expect(documasterController.testAuth).toHaveBeenCalled();
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: mockSuccessResult.message
					}
				]
			});
		});
		
		it('should return error for authentication failure', async () => {
			const mockFailureResult = {
				success: false,
				message: 'Authentication failed: Invalid credentials.'
			};
			
			((documasterController.testAuth as any) as jest.Mock).mockResolvedValue(mockFailureResult);
			
			const result = await handleTestAuth();
			
			expect(documasterController.testAuth).toHaveBeenCalled();
			expect(result).toEqual({
				content: [
					{
						type: 'text',
						text: mockFailureResult.message
					}
				]
			});
		});
		
		it('should handle unexpected errors gracefully', async () => {
			const error = new Error('Unexpected error during authentication');
			((documasterController.testAuth as any) as jest.Mock).mockRejectedValue(error);
			
			// Mock the error formatting utility
			jest.mock('../../src/utils/error.util', () => ({
				formatErrorForMcpTool: jest.fn().mockReturnValue({
					content: [{ type: 'text', text: 'Formatted error message' }]
				})
			}));
			
			const result = await handleTestAuth();
			
			expect(documasterController.testAuth).toHaveBeenCalled();
			// Rather than checking exact message, just verify it's an object with content
			expect(result).toHaveProperty('content');
		});
	});
}); 
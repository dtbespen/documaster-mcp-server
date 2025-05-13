/**
 * Integration test for Documaster MCP Tool
 * 
 * Tests the Documaster tool handlers directly with mocked controller responses.
 */

import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import documasterController from '../../src/controllers/documaster.controller';
import {
  DocumentmasterSearchResult,
  DocumentmasterQueryResult
} from '../../src/models/documentmaster.model';

// Mock documaster controller
jest.mock('../../src/controllers/documaster.controller', () => ({
  default: {
    testAuth: jest.fn(),
    searchDocuments: jest.fn(),
    queryDocument: jest.fn(),
    queryEntities: jest.fn()
  }
}));

// Mock data
const mockSearchResults: DocumentmasterSearchResult[] = [
  {
    id: '12345',
    title: 'Test dokument 1',
    documentType: 'PDF',
    createdDate: '2023-01-01',
    summary: 'Dette er et testdokument',
    url: 'https://example.com/doc/12345',
    journalpostId: '12345',
    saksmappeId: '6789',
    dokumentId: '10111',
    foundIn: 'Korrespondansepart.korrespondansepartNavn',
    highlights: ['Korrespondansepart.korrespondansepartNavn: **Test** søkeord']
  }
];

const mockQueryResult: DocumentmasterQueryResult = {
  documentId: '12345',
  documentTitle: 'Test Document',
  answer: 'Dette er svaret på spørsmålet',
  confidence: 0.85
};

// Define a bare minimum mock for MCP Server
class MockMcpServer {
  tools: Record<string, { handler: Function }> = {};
  
  tool(name: string, description: string, argsSchema: any, handler: Function): void {
    this.tools[name] = { handler };
  }
}

describe('Documaster Tool Integration Tests', () => {
  
  beforeEach(() => {
    jest.resetAllMocks();
  });
  
  describe('search-documaster tool', () => {
    it('should handle successful search', async () => {
      // Set up mocks
      (documasterController.testAuth as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Autentisering vellykket. Token-lengde: 1234 tegn. Token: mocked...token',
      });
      
      (documasterController.searchDocuments as jest.Mock).mockResolvedValue(mockSearchResults);
      
      // Register tools with our mock server
      const mockServer = new MockMcpServer();
      
      // Import the tool registration function dynamically to avoid hoisting issues with mocks
      const documasterTool = await import('../../src/tools/documaster.tool');
      documasterTool.default.registerTools(mockServer as any);
      
      // Get the tool handler
      const searchHandler = mockServer.tools['search-documaster']?.handler;
      expect(searchHandler).toBeDefined();
      
      // Call the handler with test arguments
      const result = await searchHandler({
        query: 'test query',
        limit: 10
      });
      
      // Check that the controller was called correctly
      expect(documasterController.searchDocuments).toHaveBeenCalledWith(
        'test query', 
        10, 
        undefined
      );
      
      // Check the response format
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('Søkeresultater for "test query"');
    });
  });
  
  describe('query-documaster tool', () => {
    it('should handle successful query', async () => {
      // Set up mocks for the query
      (documasterController.queryEntities as jest.Mock).mockResolvedValue({
        hasMore: false,
        results: [
          {
            id: '12345',
            type: 'Journalpost',
            fields: {
              tittel: 'Test journalpost',
              dokumentdato: '2023-01-01'
            }
          }
        ]
      });
      
      // Register tools with our mock server
      const mockServer = new MockMcpServer();
      
      // Import the tool registration function dynamically to avoid hoisting issues with mocks
      const documasterTool = await import('../../src/tools/documaster.tool');
      documasterTool.default.registerTools(mockServer as any);
      
      // Get the tool handler
      const queryHandler = mockServer.tools['query-documaster']?.handler;
      expect(queryHandler).toBeDefined();
      
      // Call the handler with test arguments
      const result = await queryHandler({
        type: 'Journalpost',
        query: 'tittel = @title',
        parameters: { '@title': 'Test journalpost' }
      });
      
      // Check the response format
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0].text).toContain('Resultater for entitetstype `Journalpost`');
    });
  });
}); 
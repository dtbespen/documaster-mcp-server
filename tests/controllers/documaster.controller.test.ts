import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import axios from 'axios';
import documasterController from '../../src/controllers/documaster.controller';
import { DocumentmasterOAuth2Service } from '../../src/services/documaster.oauth2.service';
import { documasterConfig } from '../../src/utils/documaster-config.util';
import { 
  DocumentmasterSearchResult, 
  DocumentmasterQueryResult 
} from '../../src/models/documentmaster.model';

// Mock dependencies
jest.mock('axios');
jest.mock('../../src/services/documaster.oauth2.service');
jest.mock('../../src/utils/documaster-config.util');

// Mock axios
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('DocumentmasterController', () => {
  const mockAuthHeader = 'Bearer test-token';
  const mockBaseUrl = 'https://test.documaster.tech';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock OAuth service
    (DocumentmasterOAuth2Service.prototype.getAuthorizationHeader as jest.Mock).mockResolvedValue(mockAuthHeader);
    (DocumentmasterOAuth2Service.prototype.getAccessToken as jest.Mock).mockResolvedValue('test-token');
    
    // Mock config
    (documasterConfig.getOAuth2Config as jest.Mock).mockReturnValue({
      baseUrl: mockBaseUrl,
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tokenUrl: 'https://test.documaster.tech/idp/oauth2/token',
      scope: 'openid',
    });
  });

  describe('searchDocuments', () => {
    it('should make correct API call and return formatted results', async () => {
      // Mock response data
      const mockResponse = {
        data: {
          results: [
            {
              id: 'doc-123',
              title: 'Test Dokument 1',
              documentType: 'Rapport',
              createdDate: '2023-05-15',
              description: 'Dette er et testdokument',
              url: 'https://test.documaster.tech/documents/doc-123'
            },
            {
              id: 'doc-456',
              title: 'Test Dokument 2',
              documentType: 'Notat',
              createdDate: '2023-06-20',
              description: 'Dette er et annet testdokument',
              url: 'https://test.documaster.tech/documents/doc-456'
            }
          ]
        }
      };
      
      // Mock axios get call
      mockedAxios.get.mockResolvedValueOnce(mockResponse);
      
      // Call method
      const results = await documasterController.searchDocuments('test query', 10, 'Rapport');
      
      // Verify API call
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/documents/search`,
        {
          headers: {
            'Authorization': mockAuthHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          params: {
            query: 'test query',
            limit: 10,
            documentType: 'Rapport'
          }
        }
      );
      
      // Verify results
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        id: 'doc-123',
        title: 'Test Dokument 1',
        documentType: 'Rapport',
        createdDate: '2023-05-15',
        summary: 'Dette er et testdokument',
        url: 'https://test.documaster.tech/documents/doc-123'
      });
    });
    
    it('should handle API errors properly', async () => {
      // Mock axios error
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 401,
          data: { 
            error: 'unauthorized',
            message: 'Ugyldig token' 
          }
        }
      };
      mockedAxios.get.mockRejectedValueOnce(axiosError);
      
      // Verify error is thrown with proper message
      await expect(documasterController.searchDocuments('test', 10))
        .rejects
        .toThrow('Feil ved søk i dokumenter: API returnerte 401. Ugyldig token');
    });
    
    it('should handle empty results', async () => {
      // Mock empty response
      mockedAxios.get.mockResolvedValueOnce({ data: { results: [] } });
      
      // Call method
      const results = await documasterController.searchDocuments('no results', 10);
      
      // Verify empty array returned
      expect(results).toEqual([]);
    });
  });
  
  describe('queryDocument', () => {
    it('should make correct API call and return formatted results', async () => {
      // Mock response data
      const mockResponse = {
        data: {
          documentTitle: 'Test Dokument 1',
          answer: 'Dette er svaret på spørringen.',
          confidence: 0.85
        }
      };
      
      // Mock axios post call
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      // Call method
      const result = await documasterController.queryDocument('doc-123', 'test query');
      
      // Verify API call
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockBaseUrl}/api/v1/documents/doc-123/query`,
        { query: 'test query' },
        {
          headers: {
            'Authorization': mockAuthHeader,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      // Verify results
      expect(result).toEqual({
        documentId: 'doc-123',
        documentTitle: 'Test Dokument 1',
        answer: 'Dette er svaret på spørringen.',
        confidence: 0.85
      });
    });
    
    it('should handle API errors properly', async () => {
      // Mock axios error
      const axiosError = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { 
            error: 'not_found',
            message: 'Dokumentet ble ikke funnet' 
          }
        }
      };
      mockedAxios.post.mockRejectedValueOnce(axiosError);
      
      // Verify error is thrown with proper message
      await expect(documasterController.queryDocument('invalid-id', 'test'))
        .rejects
        .toThrow('Feil ved spørring mot dokument: API returnerte 404. Dokumentet ble ikke funnet');
    });
    
    it('should handle minimal response data with fallbacks', async () => {
      // Mock minimal response
      mockedAxios.post.mockResolvedValueOnce({ 
        data: { 
          content: 'Minimalt svar uten andre felter'
        } 
      });
      
      // Call method
      const result = await documasterController.queryDocument('doc-123', 'test query');
      
      // Verify results with fallbacks
      expect(result).toEqual({
        documentId: 'doc-123',
        documentTitle: undefined,
        answer: 'Minimalt svar uten andre felter',
        confidence: undefined
      });
    });
  });

  describe('getApiBaseUrl', () => {
    it('should return the base URL from config', () => {
      const baseUrl = documasterController.getApiBaseUrl();
      expect(documasterConfig.getOAuth2Config).toHaveBeenCalled();
      expect(baseUrl).toBe('https://test.example.com/api');
    });
  });

  describe('testAuth', () => {
    it('should return success when authentication succeeds', async () => {
      const result = await documasterController.testAuth();
      expect(result.success).toBe(true);
      expect(result.message).toContain('Token-lengde:');
    });

    it('should return failure when authentication fails', async () => {
      (DocumentmasterOAuth2Service.prototype.getAccessToken as jest.Mock).mockRejectedValueOnce(
        new Error('Authentication failed')
      );
      
      const result = await documasterController.testAuth();
      expect(result.success).toBe(false);
      expect(result.message).toContain('Authentication failed');
    });
  });
}); 
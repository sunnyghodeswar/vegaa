import { html, text, file, HTML_RESPONSE, TEXT_RESPONSE, FILE_RESPONSE } from '../../../src/utils/response';

describe('Response Helpers', () => {
  describe('html()', () => {
    it('should return HTML response object', () => {
      const result = html('<h1>Test</h1>');
      expect(result._type).toBe(HTML_RESPONSE);
      expect(result.content).toBe('<h1>Test</h1>');
    });

    it('should handle empty string', () => {
      const result = html('');
      expect(result._type).toBe(HTML_RESPONSE);
      expect(result.content).toBe('');
    });
  });

  describe('text()', () => {
    it('should return text response object', () => {
      const result = text('Hello World');
      expect(result._type).toBe(TEXT_RESPONSE);
      expect(result.content).toBe('Hello World');
    });
  });

  describe('file()', () => {
    it('should return file response object', () => {
      const result = file('./public/index.html');
      expect(result._type).toBe(FILE_RESPONSE);
      expect(result.path).toBe('./public/index.html');
    });
  });
});


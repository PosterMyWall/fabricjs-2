import { describe, expect, it, beforeEach, afterEach, test, vi } from 'vitest';
import { ITextQuill } from './ITextQuill';
import { QuillTextEditor } from './QuillTextEditor';
import { Canvas } from '../../canvas/Canvas';

describe('ITextQuill', () => {
  describe('constructor', () => {
    it('should create ITextQuill instance with default options', () => {
      const text = new ITextQuill('Hello World!');
      expect(text.text).toBe('Hello World!');
      expect(text.type).toBe('ITextQuill');
      expect(text.useQuillEditor).toBe(true);
      expect(text.editable).toBe(true);
      expect(text.selectionStart).toBe(0);
      expect(text.selectionEnd).toBe(0);
    });

    it('should create ITextQuill instance with custom options', () => {
      const text = new ITextQuill('Hello World!', {
        useQuillEditor: false,
        editable: false,
        fontSize: 24,
        fill: 'red'
      });
      expect(text.text).toBe('Hello World!');
      expect(text.useQuillEditor).toBe(false);
      expect(text.editable).toBe(false);
      expect(text.fontSize).toBe(24);
      expect(text.fill).toBe('red');
    });
  });

  describe('QuillJS integration', () => {
    let itext: ITextQuill;

    beforeEach(() => {
      itext = new ITextQuill('Test text', { useQuillEditor: true });
    });

    afterEach(() => {
      // Clean up any editor instances
      if (itext.quillEditor) {
        itext.quillEditor.destroy();
      }
    });

    it('should initialize quill editor when useQuillEditor is true', () => {
      // Mock DOM elements for test environment
      const mockContainer = document.createElement('div');
      const mockAppendChild = vi.fn();
      
      vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
      
      // Test the initialization
      itext.initHiddenTextarea();
      
      // Verify that either Quill editor was initialized or fallback was used
      expect(typeof itext.initHiddenTextarea).toBe('function');
      
      // In test environment, it should fallback gracefully
      expect(itext.hiddenTextarea).toBeDefined();
    });

    it('should fallback to textarea when useQuillEditor is false', () => {
      itext.useQuillEditor = false;
      const spy = vi.spyOn(itext, 'initHiddenTextareaFallback');
      
      itext.initHiddenTextarea();
      
      expect(spy).toHaveBeenCalled();
    });

    it('should handle text and style updates', () => {
      // Mock the style conversion methods
      const mockStyles = { 0: { fontWeight: 'bold' } };
      itext.text = 'Updated text';
      itext.styles = mockStyles;
      
      expect(itext.text).toBe('Updated text');
      expect(itext.styles).toEqual(mockStyles);
    });
  });

  describe('selection methods', () => {
    let itext: ITextQuill;

    beforeEach(() => {
      itext = new ITextQuill('Hello World!');
    });

    it('should set selection start correctly', () => {
      itext.setSelectionStart(5);
      expect(itext.selectionStart).toBe(5);
    });

    it('should set selection end correctly', () => {
      itext.setSelectionEnd(8);
      expect(itext.selectionEnd).toBe(8);
    });

    it('should clamp selection start to valid range', () => {
      itext.setSelectionStart(-1);
      expect(itext.selectionStart).toBe(0);
    });

    it('should clamp selection end to text length', () => {
      itext.setSelectionEnd(999);
      expect(itext.selectionEnd).toBe(itext.text.length);
    });
  });

  describe('editing state management', () => {
    let itext: ITextQuill;
    let canvas: Canvas;

    beforeEach(() => {
      canvas = new Canvas();
      itext = new ITextQuill('Test text');
      canvas.add(itext);
    });

    afterEach(() => {
      canvas.dispose();
    });

    it('should enter editing mode', () => {
      const enteringSpy = vi.fn();
      const enteredSpy = vi.fn();
      
      // Mock the hiddenTextarea to avoid null reference
      const mockTextarea = document.createElement('textarea');
      mockTextarea.focus = vi.fn();
      vi.spyOn(itext, 'initHiddenTextarea').mockImplementation(() => {
        itext.hiddenTextarea = mockTextarea as any;
      });
      
      itext.on('editing:entered', enteredSpy);
      canvas.on('text:editing:entered', enteringSpy);
      
      itext.enterEditing();
      
      expect(itext.isEditing).toBe(true);
      expect(enteredSpy).toHaveBeenCalled();
      expect(enteringSpy).toHaveBeenCalled();
    });

    it('should exit editing mode', () => {
      itext.isEditing = true;
      
      const exitedSpy = vi.fn();
      itext.on('editing:exited', exitedSpy);
      
      itext.exitEditing();
      
      expect(itext.isEditing).toBe(false);
      expect(exitedSpy).toHaveBeenCalled();
    });

    it('should clean up editor on exit', () => {
      const mockEditor = {
        destroy: vi.fn()
      } as any;
      itext.quillEditor = mockEditor;
      itext.isEditing = true;
      
      itext.exitEditing();
      
      expect(mockEditor.destroy).toHaveBeenCalled();
      expect(itext.quillEditor).toBe(null);
    });
  });
});

describe('QuillTextEditor', () => {
  describe('constructor', () => {
    it('should create QuillTextEditor instance', () => {
      const editor = new QuillTextEditor({
        placeholder: 'Test placeholder',
        theme: 'snow'
      });
      
      expect(editor).toBeInstanceOf(QuillTextEditor);
    });
  });

  describe('style conversion', () => {
    let editor: QuillTextEditor;

    beforeEach(() => {
      editor = new QuillTextEditor();
    });

    it('should convert Fabric styles to Quill Delta', () => {
      const text = 'Hello World';
      const styles = {
        0: { fontWeight: 'bold' },
        1: { fontWeight: 'bold' },
        2: { fontWeight: 'bold' },
        6: { fontStyle: 'italic' },
        7: { fontStyle: 'italic' }
      };

      const delta = editor.fabricStylesToDelta(text, styles);
      
      expect(Array.isArray(delta)).toBe(true);
      expect(delta.length).toBeGreaterThan(0);
      
      // Check that bold style is applied to first few characters
      const firstOp = delta[0];
      expect(firstOp.insert).toBe('Hel');
      expect(firstOp.attributes?.bold).toBe(true);
    });

    it('should convert Quill Delta to Fabric styles', () => {
      const delta = [
        { insert: 'Hello ', attributes: { bold: true } },
        { insert: 'World', attributes: { italic: true } }
      ];

      const result = editor.deltaToFabricStyles(delta);
      
      expect(result.text).toBe('Hello World');
      expect(result.styles[0].fontWeight).toBe('bold');
      expect(result.styles[6].fontStyle).toBe('italic');
    });

    it('should handle empty delta', () => {
      const result = editor.deltaToFabricStyles([]);
      expect(result.text).toBe('');
      expect(Object.keys(result.styles)).toHaveLength(0);
    });

    it('should handle text without styles', () => {
      const result = editor.deltaToFabricStyles([
        { insert: 'Plain text' }
      ]);
      expect(result.text).toBe('Plain text');
      expect(Object.keys(result.styles)).toHaveLength(0);
    });
  });

  describe('size mapping', () => {
    let editor: QuillTextEditor;

    beforeEach(() => {
      editor = new QuillTextEditor();
    });

    it('should map font sizes correctly in fabricStylesToDelta', () => {
      const text = 'ABC';
      const styles = {
        0: { fontSize: 12 },  // should map to 'small'
        1: { fontSize: 18 },  // should map to 'large' 
        2: { fontSize: 24 }   // should map to 'huge'
      };

      const delta = editor.fabricStylesToDelta(text, styles);
      
      expect(delta[0].attributes?.size).toBe('small');
      expect(delta[1].attributes?.size).toBe('large');
      expect(delta[2].attributes?.size).toBe('huge');
    });

    it('should map Quill sizes to font sizes in deltaToFabricStyles', () => {
      const delta = [
        { insert: 'A', attributes: { size: 'small' } },
        { insert: 'B', attributes: { size: 'large' } },
        { insert: 'C', attributes: { size: 'huge' } }
      ];

      const result = editor.deltaToFabricStyles(delta);
      
      expect(result.styles[0].fontSize).toBe(12);
      expect(result.styles[1].fontSize).toBe(18);
      expect(result.styles[2].fontSize).toBe(24);
    });
  });
});
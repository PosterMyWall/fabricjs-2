import type { TextStyleDeclaration } from '../Text/StyledText';
import { getDocumentFromElement } from '../../util/dom_misc';
import { getFabricDocument } from '../../env';

// Dynamic import of Quill to handle environments where it's not available
let Quill: any = null;
try {
  // Try to import Quill, but handle gracefully if it fails
  if (typeof window !== 'undefined') {
    Quill = require('quill');
    require('quill/dist/quill.snow.css');
  }
} catch (error) {
  console.warn('QuillJS not available:', error);
}

export interface QuillTextEditorOptions {
  placeholder?: string;
  theme?: string;
  modules?: Record<string, any>;
  container?: HTMLElement;
}

export interface QuillTextChangeEvent {
  delta: any;
  oldDelta: any;
  source: string;
}

/**
 * QuillJS adapter for FabricJS IText editing
 * Provides rich text editing capabilities as a replacement for the hidden textarea approach
 */
export class QuillTextEditor {
  public quill: typeof Quill | null = null;
  public container: HTMLElement | null = null;
  private _onTextChangeCallback?: (event: QuillTextChangeEvent) => void;
  private _onSelectionChangeCallback?: (range: any) => void;
  private _onBlurCallback?: () => void;
  
  constructor(private options: QuillTextEditorOptions = {}) {}

  /**
   * Initialize the Quill editor
   */
  init(doc: Document = getFabricDocument()): HTMLElement {
    try {
      // Create container div
      this.container = doc.createElement('div');
      this.container.setAttribute('data-fabric', 'quill-editor');
      
      // Set up basic styling to position the editor
      this.container.style.cssText = `
        position: absolute;
        background: white;
        border: 1px solid #ccc;
        border-radius: 4px;
        min-width: 200px;
        min-height: 100px;
        z-index: 1000;
        font-family: Arial, sans-serif;
      `;

      // Initialize Quill
      const quillOptions = {
        theme: this.options.theme || 'snow',
        placeholder: this.options.placeholder || 'Enter text...',
        modules: {
          toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'align': [] }]
          ],
          ...this.options.modules
        }
      };

      // Check if Quill is available (might not be in test environment)
      if (typeof Quill !== 'undefined') {
        this.quill = new Quill(this.container, quillOptions);
        
        // Set up event listeners
        this.setupEventListeners();
      } else {
        // Fallback: create a basic div for test environments
        console.warn('Quill is not available, creating fallback element');
      }
      
      return this.container;
    } catch (error) {
      console.error('Failed to initialize Quill editor:', error);
      
      // Return a basic container as fallback
      this.container = doc.createElement('div');
      this.container.setAttribute('data-fabric', 'quill-editor-fallback');
      return this.container;
    }
  }

  /**
   * Set up Quill event listeners
   */
  private setupEventListeners() {
    if (!this.quill) return;

    // Text change event
    this.quill.on('text-change', (delta: any, oldDelta: any, source: any) => {
      if (this._onTextChangeCallback) {
        this._onTextChangeCallback({ delta, oldDelta, source });
      }
    });

    // Selection change event
    this.quill.on('selection-change', (range: any) => {
      if (this._onSelectionChangeCallback) {
        this._onSelectionChangeCallback(range);
      }
    });

    // Blur event - using the underlying editor element
    const editorElement = this.quill.root;
    editorElement.addEventListener('blur', () => {
      if (this._onBlurCallback) {
        this._onBlurCallback();
      }
    });
  }

  /**
   * Set the editor content
   */
  setText(text: string) {
    if (this.quill) {
      this.quill.setText(text);
    }
  }

  /**
   * Get the editor content as plain text
   */
  getText(): string {
    return this.quill ? this.quill.getText() : '';
  }

  /**
   * Get the editor content as Delta format
   */
  getContents() {
    return this.quill ? this.quill.getContents() : null;
  }

  /**
   * Set the editor content using Delta format
   */
  setContents(delta: any) {
    if (this.quill) {
      this.quill.setContents(delta);
    }
  }

  /**
   * Focus the editor
   */
  focus() {
    if (this.quill) {
      this.quill.focus();
    }
  }

  /**
   * Blur the editor
   */
  blur() {
    if (this.quill) {
      this.quill.blur();
    }
  }

  /**
   * Position the editor
   */
  setPosition(left: string, top: string) {
    if (this.container) {
      this.container.style.left = left;
      this.container.style.top = top;
    }
  }

  /**
   * Set selection range
   */
  setSelection(range: { index: number; length: number }) {
    if (this.quill) {
      this.quill.setSelection(range.index, range.length);
    }
  }

  /**
   * Get current selection
   */
  getSelection() {
    return this.quill ? this.quill.getSelection() : null;
  }

  /**
   * Convert Quill Delta to FabricJS TextStyleDeclaration
   * This is a simplified conversion - can be enhanced for more complex styling
   */
  deltaToFabricStyles(delta: any[]): { text: string; styles: any } {
    let text = '';
    const styles: Record<string, TextStyleDeclaration> = {};
    let currentIndex = 0;

    delta.forEach((op: any) => {
      if (op.insert && typeof op.insert === 'string') {
        const insertText = op.insert;
        text += insertText;
        
        // Apply styles if present
        if (op.attributes) {
          for (let i = 0; i < insertText.length; i++) {
            if (!styles[currentIndex]) {
              styles[currentIndex] = {};
            }
            
            // Map Quill attributes to Fabric styles
            if (op.attributes.bold) styles[currentIndex].fontWeight = 'bold';
            if (op.attributes.italic) styles[currentIndex].fontStyle = 'italic';
            if (op.attributes.underline) styles[currentIndex].underline = true;
            if (op.attributes.color) styles[currentIndex].fill = op.attributes.color;
            if (op.attributes.background) styles[currentIndex].textBackgroundColor = op.attributes.background;
            if (op.attributes.font) styles[currentIndex].fontFamily = op.attributes.font;
            if (op.attributes.size) {
              // Map Quill size to actual font size
              const sizeMap: Record<string, number> = {
                'small': 12,
                'large': 18,
                'huge': 24
              };
              styles[currentIndex].fontSize = sizeMap[op.attributes.size] || 14;
            }
            
            currentIndex++;
          }
        } else {
          currentIndex += insertText.length;
        }
      }
    });

    return { text, styles };
  }

  /**
   * Convert FabricJS styles to Quill Delta
   * This allows loading existing styled text into Quill
   */
  fabricStylesToDelta(text: string, styles: any = {}): any[] {
    const delta: any[] = [];
    let currentAttributes: any = {};
    let currentText = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const style = styles[i] || {};
      
      // Build Quill attributes from Fabric style
      const attributes: any = {};
      if (style.fontWeight === 'bold') attributes.bold = true;
      if (style.fontStyle === 'italic') attributes.italic = true;
      if (style.underline) attributes.underline = true;
      if (style.fill) attributes.color = style.fill;
      if (style.textBackgroundColor) attributes.background = style.textBackgroundColor;
      if (style.fontFamily) attributes.font = style.fontFamily;
      if (style.fontSize) {
        // Map font size to Quill size
        if (style.fontSize <= 12) attributes.size = 'small';
        else if (style.fontSize >= 18) attributes.size = style.fontSize >= 24 ? 'huge' : 'large';
      }

      // Check if attributes changed
      const attributesChanged = JSON.stringify(attributes) !== JSON.stringify(currentAttributes);
      
      if (attributesChanged) {
        // Push current text with current attributes
        if (currentText) {
          const op: any = { insert: currentText };
          if (Object.keys(currentAttributes).length > 0) {
            op.attributes = currentAttributes;
          }
          delta.push(op);
          currentText = '';
        }
        currentAttributes = attributes;
      }
      
      currentText += char;
    }

    // Push remaining text
    if (currentText) {
      const op: any = { insert: currentText };
      if (Object.keys(currentAttributes).length > 0) {
        op.attributes = currentAttributes;
      }
      delta.push(op);
    }

    return delta;
  }

  /**
   * Set event callbacks
   */
  onTextChange(callback: (event: QuillTextChangeEvent) => void) {
    this._onTextChangeCallback = callback;
  }

  onSelectionChange(callback: (range: any) => void) {
    this._onSelectionChangeCallback = callback;
  }

  onBlur(callback: () => void) {
    this._onBlurCallback = callback;
  }

  /**
   * Destroy the editor and clean up
   */
  destroy() {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.quill = null;
    this.container = null;
    this._onTextChangeCallback = undefined;
    this._onSelectionChangeCallback = undefined;
    this._onBlurCallback = undefined;
  }
}
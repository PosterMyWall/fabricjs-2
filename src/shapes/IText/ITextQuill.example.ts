/**
 * Example: Using QuillJS Rich Text Editing in FabricJS
 * 
 * This example demonstrates how to use the ITextQuill class for enhanced
 * rich text editing capabilities in FabricJS applications.
 */

// Import the necessary classes
import { Canvas } from './canvas/Canvas';
import { ITextQuill } from './shapes/IText/ITextQuill';

// Example 1: Basic Usage
console.log('=== QuillJS Integration Example ===');

// Create a FabricJS canvas
const canvas = new Canvas(null, { width: 800, height: 600 });

// Create a rich text object with QuillJS support
const richText = new ITextQuill('Click to edit with QuillJS!', {
  left: 100,
  top: 100,
  fontSize: 18,
  fontFamily: 'Arial',
  fill: '#333333',
  useQuillEditor: true, // Enable QuillJS (this is the default)
  editable: true
});

// Add to canvas
canvas.add(richText);

// Example 2: Rich Text with Pre-styled Content
const styledText = new ITextQuill('Rich Text Example', {
  left: 100,
  top: 200,
  fontSize: 24,
  fontWeight: 'bold',
  fill: '#007bff',
  useQuillEditor: true,
  editable: true,
  // You can also set initial styles
  styles: {
    0: { fontWeight: 'bold', fill: '#dc3545' }, // 'Rich' in red and bold
    5: { fontStyle: 'italic', fill: '#28a745' }, // 'Text' in green and italic
    10: { underline: true, fill: '#6f42c1' }      // 'Example' in purple and underlined
  }
});

canvas.add(styledText);

// Example 3: Fallback to Regular IText
const fallbackText = new ITextQuill('Fallback text (uses textarea)', {
  left: 100,
  top: 300,
  fontSize: 16,
  fill: '#666666',
  useQuillEditor: false, // Disable QuillJS, use textarea fallback
  editable: true
});

canvas.add(fallbackText);

// Example 4: Event Handling
richText.on('editing:entered', (e) => {
  console.log('Started editing with QuillJS');
});

richText.on('editing:exited', (e) => {
  console.log('Finished editing, text:', richText.text);
  console.log('Styles:', richText.styles);
});

richText.on('text:changed', (e) => {
  console.log('Text changed:', richText.text);
});

// Example 5: Programmatic Style Conversion
function demonstrateStyleConversion() {
  console.log('\n=== Style Conversion Example ===');
  
  // Sample Fabric styles
  const fabricStyles = {
    0: { fontWeight: 'bold', fontSize: 18 },
    5: { fontStyle: 'italic', fill: 'red' },
    10: { underline: true }
  };
  
  const text = 'Hello World Example';
  
  // Create QuillTextEditor for conversion utilities
  const editor = new (require('./shapes/IText/QuillTextEditor').QuillTextEditor)();
  
  // Convert Fabric styles to Quill Delta
  const delta = editor.fabricStylesToDelta(text, fabricStyles);
  console.log('Fabric → Quill Delta:', JSON.stringify(delta, null, 2));
  
  // Convert Quill Delta back to Fabric styles
  const converted = editor.deltaToFabricStyles(delta);
  console.log('Quill Delta → Fabric:');
  console.log('  Text:', converted.text);
  console.log('  Styles:', converted.styles);
}

// Example 6: Configuration Options
function createCustomQuillText() {
  return new ITextQuill('Custom Quill Configuration', {
    left: 400,
    top: 100,
    fontSize: 16,
    useQuillEditor: true,
    // Custom container for the Quill editor (optional)
    quillEditorContainer: document.getElementById('quill-container'), // if available
    editable: true,
    // Standard FabricJS text options work too
    textAlign: 'center',
    fontFamily: 'Georgia',
    fill: '#495057'
  });
}

// Example 7: Error Handling
richText.on('error', (e) => {
  console.error('Text editing error:', e);
});

// Example usage in a real application:
export function setupRichTextCanvas(canvasElement: HTMLCanvasElement) {
  const canvas = new Canvas(canvasElement);
  
  // Add a rich text object
  const richText = new ITextQuill('Double-click to edit with rich formatting!', {
    left: 50,
    top: 50,
    fontSize: 18,
    fontFamily: 'Arial',
    fill: '#333',
    useQuillEditor: true,
    editable: true
  });
  
  canvas.add(richText);
  
  // Return API for external use
  return {
    canvas,
    addRichText: (text: string, options: any = {}) => {
      const richTextObj = new ITextQuill(text, {
        useQuillEditor: true,
        editable: true,
        ...options
      });
      canvas.add(richTextObj);
      return richTextObj;
    },
    exportToJSON: () => canvas.toJSON(),
    loadFromJSON: (json: any) => canvas.loadFromJSON(json, () => canvas.renderAll())
  };
}

// Usage notes:
console.log(`
=== Usage Notes ===

1. QuillJS Features Available:
   - Bold, Italic, Underline formatting
   - Text colors and background colors
   - Font family selection
   - Font size (small, normal, large, huge)
   - Text alignment

2. Browser Support:
   - Works in all modern browsers with DOM support
   - Gracefully falls back to textarea in Node.js/server environments

3. Integration Benefits:
   - Seamless integration with existing FabricJS workflows
   - Style preservation across editing sessions
   - Full compatibility with FabricJS serialization/deserialization
   - Event system works exactly like regular IText

4. Performance:
   - Lazy loading of QuillJS editor (only when editing starts)
   - Proper cleanup when editing ends
   - Memory-efficient style conversion

5. Customization:
   - Configure QuillJS toolbar options
   - Custom theme support (Snow theme by default)
   - Extensible for additional Quill modules
`);

// Run the demo
if (typeof window !== 'undefined') {
  console.log('QuillJS integration ready for browser use!');
  demonstrateStyleConversion();
} else {
  console.log('Running in Node.js environment - QuillJS will use fallback mode');
}
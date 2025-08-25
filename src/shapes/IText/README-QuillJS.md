# QuillJS Integration for FabricJS

This implementation provides enhanced rich text editing capabilities for FabricJS by integrating QuillJS, a powerful rich text editor.

## Overview

The QuillJS integration consists of two main components:

- **`ITextQuill`**: An enhanced version of `IText` that supports QuillJS rich text editing
- **`QuillTextEditor`**: A wrapper around QuillJS that provides FabricJS compatibility

## Features

### Rich Text Editing
- **Formatting**: Bold, italic, underline text
- **Colors**: Text color and background color selection
- **Typography**: Font family and size selection
- **Alignment**: Text alignment options
- **Toolbar**: Visual toolbar for easy formatting

### Technical Benefits
- **Seamless Integration**: Works with existing FabricJS workflows
- **Style Preservation**: Converts between Quill Delta and FabricJS styles
- **Fallback Support**: Gracefully falls back to textarea when QuillJS is unavailable
- **Memory Management**: Proper cleanup and resource management
- **Event Compatibility**: Full compatibility with FabricJS event system

## Installation

QuillJS is already included as a dependency in this FabricJS fork:

```json
{
  "dependencies": {
    "quill": "^2.0.3"
  }
}
```

## Usage

### Basic Usage

```javascript
import { Canvas } from 'fabric';
import { ITextQuill } from 'fabric';

// Create canvas
const canvas = new Canvas('my-canvas');

// Create rich text with QuillJS support
const richText = new ITextQuill('Click to edit with rich formatting!', {
  left: 100,
  top: 100,
  fontSize: 18,
  useQuillEditor: true, // Enable QuillJS (default)
  editable: true
});

canvas.add(richText);
```

### Advanced Configuration

```javascript
// Custom QuillJS configuration
const advancedText = new ITextQuill('Advanced rich text', {
  left: 200,
  top: 200,
  fontSize: 16,
  useQuillEditor: true,
  // Custom container for Quill editor (optional)
  quillEditorContainer: document.getElementById('editor-container'),
  // Standard FabricJS options work too
  fontFamily: 'Georgia',
  fill: '#333333',
  textAlign: 'center'
});
```

### Fallback Mode

```javascript
// Use textarea fallback (no QuillJS)
const simpleText = new ITextQuill('Simple text editing', {
  left: 300,
  top: 300,
  useQuillEditor: false, // Disable QuillJS
  editable: true
});
```

## API Reference

### ITextQuill Class

Extends `IText` with QuillJS integration.

#### Constructor

```javascript
new ITextQuill(text, options)
```

##### Parameters
- `text` (string): Initial text content
- `options` (object): Configuration options

##### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useQuillEditor` | boolean | `true` | Enable/disable QuillJS editor |
| `quillEditorContainer` | HTMLElement | `null` | Custom container for Quill editor |

All standard `IText` options are also supported.

#### Methods

All `IText` methods are available, plus:

| Method | Description |
|--------|-------------|
| `initHiddenTextarea()` | Initialize the text editor (Quill or textarea) |
| `updateTextareaPosition()` | Update editor position when text object moves |

#### Events

All `IText` events are supported:

```javascript
richText.on('editing:entered', (e) => {
  console.log('Started editing');
});

richText.on('editing:exited', (e) => {
  console.log('Finished editing');
});

richText.on('text:changed', (e) => {
  console.log('Text changed:', richText.text);
});
```

### QuillTextEditor Class

Wrapper around QuillJS for FabricJS integration.

#### Constructor

```javascript
new QuillTextEditor(options)
```

##### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `placeholder` | string | `'Enter text...'` | Placeholder text |
| `theme` | string | `'snow'` | QuillJS theme |
| `modules` | object | Custom toolbar | QuillJS modules configuration |

#### Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `init(document)` | `document?: Document` | `HTMLElement` | Initialize the editor |
| `setText(text)` | `text: string` | `void` | Set editor text |
| `getText()` | none | `string` | Get editor text |
| `getContents()` | none | `Delta` | Get Quill Delta |
| `setContents(delta)` | `delta: Delta` | `void` | Set Quill Delta |
| `focus()` | none | `void` | Focus the editor |
| `blur()` | none | `void` | Blur the editor |
| `setPosition(left, top)` | `left: string, top: string` | `void` | Position the editor |
| `destroy()` | none | `void` | Clean up the editor |

#### Style Conversion Methods

| Method | Parameters | Returns | Description |
|--------|------------|---------|-------------|
| `fabricStylesToDelta(text, styles)` | `text: string, styles: object` | `Delta[]` | Convert FabricJS styles to Quill Delta |
| `deltaToFabricStyles(delta)` | `delta: Delta[]` | `{text, styles}` | Convert Quill Delta to FabricJS styles |

## Style Mapping

The integration automatically converts between QuillJS and FabricJS text styles:

### QuillJS → FabricJS

| Quill Attribute | FabricJS Property | Notes |
|-----------------|-------------------|--------|
| `bold: true` | `fontWeight: 'bold'` | |
| `italic: true` | `fontStyle: 'italic'` | |
| `underline: true` | `underline: true` | |
| `color: '#ff0000'` | `fill: '#ff0000'` | |
| `background: '#ffff00'` | `textBackgroundColor: '#ffff00'` | |
| `font: 'Arial'` | `fontFamily: 'Arial'` | |
| `size: 'large'` | `fontSize: 18` | Mapped values |

### Size Mapping

| Quill Size | FabricJS fontSize |
|------------|-------------------|
| `'small'` | `12` |
| default | `14` |
| `'large'` | `18` |
| `'huge'` | `24` |

## Browser Support

- **Modern Browsers**: Full QuillJS rich text editing support
- **Node.js/Server**: Graceful fallback to textarea mode
- **Legacy Browsers**: Automatic fallback to textarea mode

## Error Handling

The integration includes robust error handling:

```javascript
// QuillJS not available - falls back to textarea
const text = new ITextQuill('Fallback text', {
  useQuillEditor: true // Will fallback if Quill fails
});

// Explicit fallback
const fallbackText = new ITextQuill('Simple text', {
  useQuillEditor: false // Force textarea mode
});
```

## Customization

### Custom Toolbar

```javascript
const editor = new QuillTextEditor({
  theme: 'snow',
  modules: {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'font': [] }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'align': [] }],
      ['clean']
    ]
  }
});
```

### Custom Container

```javascript
const text = new ITextQuill('Custom container text', {
  quillEditorContainer: document.getElementById('my-editor-container'),
  useQuillEditor: true
});
```

## Testing

The integration includes comprehensive test coverage:

```bash
# Run QuillJS tests
npm run test:vitest -- src/shapes/IText/ITextQuill.test.ts
```

Test coverage includes:
- Constructor and configuration
- QuillJS editor initialization
- Fallback mechanisms
- Selection management
- Editing state management
- Style conversion
- Memory cleanup

## Performance Considerations

- **Lazy Loading**: QuillJS is only initialized when editing starts
- **Memory Management**: Proper cleanup when editing ends
- **Style Conversion**: Efficient bidirectional style conversion
- **DOM Updates**: Minimized DOM manipulations

## Migration from IText

The `ITextQuill` class is fully compatible with `IText`:

```javascript
// Before
const text = new IText('My text', options);

// After - with rich text support
const richText = new ITextQuill('My text', options);

// Or disable rich text for exact IText behavior
const simpleText = new ITextQuill('My text', {
  ...options,
  useQuillEditor: false
});
```

## Examples

See `ITextQuill.example.ts` for comprehensive usage examples.

## Troubleshooting

### QuillJS Not Available

If you see "QuillJS not available" warnings:

1. Ensure QuillJS is properly installed
2. Check that you're running in a browser environment
3. The integration will automatically fallback to textarea mode

### Styling Issues

If text styles aren't preserved:

1. Check the style conversion in browser dev tools
2. Ensure you're using supported style properties
3. Review the style mapping table above

### Performance Issues

If experiencing slow performance:

1. Limit the number of concurrent ITextQuill objects
2. Use `useQuillEditor: false` for simple text editing
3. Consider lazy loading of text objects

## Contributing

When contributing to the QuillJS integration:

1. Run tests: `npm run test:vitest -- src/shapes/IText/ITextQuill.test.ts`
2. Check TypeScript: `npx tsc --noEmit`
3. Test in both browser and Node.js environments
4. Update this documentation for API changes
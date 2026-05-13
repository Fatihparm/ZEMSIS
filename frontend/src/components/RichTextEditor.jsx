import { useEffect, useRef } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import './RichTextEditor.css';

/**
 * Quill tabanlı zengin metin editörü.
 * Yalnızca "sarı alan" — kullanıcının serbestçe düzenlediği bölümler için kullanılır.
 */
function RichTextEditor({ value, onChange, placeholder = 'Buraya yazın...' }) {
  const editorRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      // Init Quill
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        placeholder: placeholder,
        modules: {
          toolbar: [
            [{ 'header': [3, 4, false] }],
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            ['blockquote', 'link'],
            ['clean']
          ]
        }
      });

      // Set initial HTML content safely
      if (value) {
        const delta = quillRef.current.clipboard.convert({ html: value });
        quillRef.current.setContents(delta, 'silent');
      }

      // Listen for text changes
      quillRef.current.on('text-change', () => {
        onChange(quillRef.current.root.innerHTML);
      });
    }
  }, []); // Run once on mount

  return (
    <div className="rich-editor-wrapper">
      <div className="rich-editor-badge">✏️ Düzenlenebilir Alan</div>
      <div ref={editorRef} className="quill-container" />
    </div>
  );
}

export default RichTextEditor;

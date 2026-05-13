import { useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';
import './RichTextEditor.css';

/**
 * CKEditor 5 tabanlı zengin metin editörü.
 * Yalnızca "sarı alan" — kullanıcının serbestçe düzenlediği bölümler için kullanılır.
 */
function RichTextEditor({ value, onChange, placeholder = 'Buraya yazın...' }) {
  // CKEditor's `data` prop should only be set initially.
  // Constantly changing it causes the cursor to jump or the editor to lose focus.
  const [initialData] = useState(value || '');

  return (
    <div className="rich-editor-wrapper">
      <div className="rich-editor-badge">✏️ Düzenlenebilir Alan</div>
      <CKEditor
        editor={ClassicEditor}
        data={initialData}
        config={{
          placeholder,
          language: 'tr',
          toolbar: [
            'heading', '|',
            'bold', 'italic', 'underline', '|',
            'bulletedList', 'numberedList', '|',
            'outdent', 'indent', '|',
            'blockQuote', 'link', '|',
            'undo', 'redo',
          ],
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragraf', class: 'ck-heading_paragraph' },
              { model: 'heading3', view: 'h3', title: 'Alt Başlık', class: 'ck-heading_heading3' },
              { model: 'heading4', view: 'h4', title: 'Küçük Başlık', class: 'ck-heading_heading4' },
            ],
          },
        }}
        onChange={(_event, editor) => {
          onChange(editor.getData());
        }}
      />
    </div>
  );
}

export default RichTextEditor;

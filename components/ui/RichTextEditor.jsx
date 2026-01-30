'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { Bold, Italic, Strikethrough, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

// Toolbar button component
const ToolbarButton = ({ onClick, active, children, title, colorClass }) => (
    <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClick}
        className={`h-7 w-7 p-0 ${active ? 'bg-gray-200' : 'hover:bg-gray-100'} ${colorClass || ''}`}
        title={title}
    >
        {children}
    </Button>
);

export default function RichTextEditor({
    value = '',
    onChange,
    placeholder = 'Digite aqui...',
    className = '',
    minHeight = '80px'
}) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                // Disable features we don't need
                heading: false,
                blockquote: false,
                codeBlock: false,
                horizontalRule: false,
            }),
            TextStyle,
            Color,
        ],
        content: value,
        editorProps: {
            attributes: {
                class: `prose prose-sm max-w-none focus:outline-none min-h-[${minHeight}] p-3 border border-gray-200 rounded-md bg-white text-sm`,
            },
        },
        onUpdate: ({ editor }) => {
            const html = editor.getHTML();
            // Return empty string if only contains empty paragraph
            const cleanHtml = html === '<p></p>' ? '' : html;
            onChange?.(cleanHtml);
        },
    });

    // Sync external value changes
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className={`rich-text-editor ${className}`}>
            {/* Compact Toolbar */}
            <div className="flex gap-1 items-center bg-gray-50 border border-b-0 border-gray-200 rounded-t-md p-1">
                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleBold().run()}
                    active={editor.isActive('bold')}
                    title="Negrito"
                >
                    <Bold className="w-3.5 h-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleItalic().run()}
                    active={editor.isActive('italic')}
                    title="Itálico"
                >
                    <Italic className="w-3.5 h-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().toggleStrike().run()}
                    active={editor.isActive('strike')}
                    title="Tachado"
                >
                    <Strikethrough className="w-3.5 h-3.5" />
                </ToolbarButton>

                <div className="h-4 border-l border-gray-300 mx-1" />

                <ToolbarButton
                    onClick={() => editor.chain().focus().setColor('#dc2626').run()}
                    active={editor.isActive('textStyle', { color: '#dc2626' })}
                    title="Texto Vermelho"
                    colorClass="text-red-600 hover:bg-red-50"
                >
                    <Palette className="w-3.5 h-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().setColor('#2563eb').run()}
                    active={editor.isActive('textStyle', { color: '#2563eb' })}
                    title="Texto Azul"
                    colorClass="text-blue-600 hover:bg-blue-50"
                >
                    <Palette className="w-3.5 h-3.5" />
                </ToolbarButton>

                <ToolbarButton
                    onClick={() => editor.chain().focus().unsetColor().run()}
                    title="Remover Cor"
                    colorClass="text-gray-400"
                >
                    <span className="text-xs font-mono">Aa</span>
                </ToolbarButton>
            </div>

            {/* Editor Content */}
            <div className="[&_.ProseMirror]:min-h-[80px] [&_.ProseMirror]:p-3 [&_.ProseMirror]:border [&_.ProseMirror]:border-gray-200 [&_.ProseMirror]:rounded-b-md [&_.ProseMirror]:bg-white [&_.ProseMirror]:text-sm [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:focus:ring-2 [&_.ProseMirror]:focus:ring-gray-900 [&_.ProseMirror_p]:my-1">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

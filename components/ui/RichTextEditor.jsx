'use client';

import { useEditor, EditorContent, NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle, Color } from '@tiptap/extension-text-style';
import { Bold, Italic, Strikethrough, Palette, Settings2, Trash2, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core'; // TipTap Core imports
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

// === POP NODE EXTENSION ===
const PopNode = Node.create({
    name: 'popNode',
    group: 'inline',
    inline: true,
    atom: true, // It's a single unit

    addAttributes() {
        return {
            id: {
                default: null,
                parseHTML: element => element.getAttribute('data-pop-id')
            },
            name: {
                default: 'POP',
                parseHTML: element => element.textContent || 'POP'
            },
            code: { default: '' },
            type: {
                default: 'standard',
                parseHTML: element => element.getAttribute('data-type') || 'standard'
            },
            cost: {
                default: 0,
                parseHTML: element => parseFloat(element.getAttribute('data-cost')) || 0
            },
            duration: {
                default: 0,
                parseHTML: element => parseFloat(element.getAttribute('data-duration')) || 0
            },
            color: {
                default: '#3b82f6',
                parseHTML: element => {
                    // Try to extract color from style
                    const style = element.getAttribute('style') || '';
                    const colorMatch = style.match(/color:\s*(#[a-fA-F0-9]{6})/);
                    return colorMatch ? colorMatch[1] : '#3b82f6';
                }
            },
            calculatedCost: {
                default: 0,
                parseHTML: element => parseFloat(element.getAttribute('data-calculated-cost')) || 0
            },
            role: {
                default: '',
                parseHTML: element => element.getAttribute('data-role') || ''
            },
            capacity: {
                default: 0,
                parseHTML: element => parseFloat(element.getAttribute('data-capacity')) || 0
            },
            recipeYield: {
                default: 1,
                parseHTML: element => parseFloat(element.getAttribute('data-recipe-yield')) || 1
            }
        }
    },

    parseHTML() {
        return [{ tag: 'span[data-pop-id]' }]
    },

    renderHTML({ HTMLAttributes }) {
        return ['span', mergeAttributes(HTMLAttributes, {
            'data-pop-id': HTMLAttributes.id,
            'data-type': HTMLAttributes.type,
            'data-cost': HTMLAttributes.cost,
            'data-calculated-cost': HTMLAttributes.calculatedCost,
            'data-duration': HTMLAttributes.duration,
            'data-role': HTMLAttributes.role,
            'data-capacity': HTMLAttributes.capacity,
            'data-recipe-yield': HTMLAttributes.recipeYield,
            style: `background-color: ${HTMLAttributes.color}20; color: ${HTMLAttributes.color}; border: 1px solid ${HTMLAttributes.color}40; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; font-weight: 500; display: inline-block; vertical-align: middle; margin: 0 2px;`
        }), HTMLAttributes.name]
    },

    addNodeView() {
        return ReactNodeViewRenderer(PopNodeView)
    },
});

// === POP NODE VIEW (The React Component inside Editor) ===
const PopNodeView = ({ node, getPos, editor }) => {
    const { name, code, type, calculatedCost, color, cost } = node.attrs;
    const [isOpen, setIsOpen] = useState(false);

    return (
        <NodeViewWrapper as="span" className="inline-flex items-center align-middle mx-1">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded textxs font-medium cursor-pointer border hover:opacity-80 transition-opacity select-none"
                        style={{
                            backgroundColor: `${color}20`,
                            color: color,
                            borderColor: `${color}40`,
                            fontSize: '0.85em'
                        }}
                    >
                        {type === 'equipment' && <span className="mr-1">⚡</span>}
                        {name}
                    </span>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-3 z-50" align="center" side="top">
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm border-b pb-1 mb-1">{name}</h4>
                        <div className="text-xs text-gray-500 space-y-1">
                            <div className="flex justify-between">
                                <span className="font-semibold">Código:</span>
                                <span>{code || '-'}</span>
                            </div>
                            {type === 'equipment' && (
                                <>
                                    <div className="flex justify-between text-green-700 bg-green-50 p-1 rounded">
                                        <span className="font-semibold">Custo Calculado:</span>
                                        <span>R$ {parseFloat(calculatedCost || 0).toFixed(4)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="font-semibold">Custo Base:</span>
                                        <span>R$ {parseFloat(cost || 0).toFixed(2)}/h</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="pt-2 border-t mt-2 flex justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsOpen(false);
                                const pos = typeof getPos === 'function' ? getPos() : getPos;
                                console.log("🔘 [RichTextEditor] 'Editar' clicked", { attrs: node.attrs, pos, targetId: editor.options.editorProps.targetId, hasHandler: !!editor.options.editorProps.onEditPop });
                                if (editor.options.editorProps.onEditPop) {
                                    editor.options.editorProps.onEditPop(node.attrs, pos, editor.options.editorProps.targetId);
                                }
                            }}
                        >
                            <Edit2 className="w-3 h-3 mr-1" />
                            Editar
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={() => {
                                setIsOpen(false);
                                const pos = typeof getPos === 'function' ? getPos() : getPos;
                                if (typeof pos === 'number') {
                                    editor.commands.deleteRange({ from: pos, to: pos + 1 });
                                }
                            }}
                        >
                            <Trash2 className="w-3 h-3 mr-1" />
                            Remover
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </NodeViewWrapper>
    );
};


// === TOOLBAR BUTTON ===
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
    minHeight = '80px',
    onDropPop, // Callback for when a POP is dropped (to handle modals outside)
    onEditPop, // Callback for editing existing POPs
    command, // New prop for external commands
    recipeYield = 1, // Recebe o rendimento atual para passar ao modal
    id // Unique ID for this editor instance
}) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: false,
                blockquote: false,
                codeBlock: false,
                horizontalRule: false,
            }),
            TextStyle,
            Color,
            PopNode // Add custom node
        ],
        content: value,
        editorProps: {
            attributes: {
                class: `prose prose-sm max-w-none focus:outline-none min-h-[${minHeight}] p-3 border border-gray-200 rounded-md bg-white text-sm`,
            },
            targetId: id,
            onEditPop: onEditPop,
            // Handle Drop
            handleDrop: (view, event, slice, moved) => {
                if (!moved && event.dataTransfer && event.dataTransfer.getData('application/react-pop-data')) {
                    event.preventDefault();
                    console.log("🟦 [RichTextEditor] Drop event detected.");

                    const popDataRaw = event.dataTransfer.getData('application/react-pop-data');
                    if (!popDataRaw) return false;

                    const popData = JSON.parse(popDataRaw);
                    console.log("📦 [RichTextEditor] Parsed POP Data:", popData);

                    const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });

                    if (onDropPop) {
                        // Delegate to parent to handle modal logic, passing the insertion point AND editor ID
                        onDropPop(popData, coordinates?.pos, id);
                    } else {
                        // Direct insertion for simple POPs if no handler
                        editor.chain().focus().insertContentAt(coordinates?.pos, {
                            type: 'popNode',
                            attrs: {
                                id: popData.id,
                                name: popData.name,
                                code: popData.code,
                                color: popData.color,
                                type: popData.type
                            }
                        }).run();
                    }
                    return true;
                }
                return false;
            }
        },
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
    });

    // Sync external props into TipTap state
    useEffect(() => {
        if (editor && !editor.isDestroyed) {
            editor.setOptions({
                editorProps: {
                    ...editor.options.editorProps,
                    onEditPop,
                    onDropPop,
                    targetId: id
                }
            });
        }
    }, [editor, onEditPop, onDropPop, id]);

    // ... (Sync external value effect omitted - unchanged)
    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value || '');
        }
    }, [value, editor]);


    // Handle external commands (e.g., insertPop from Drop/Modal)
    useEffect(() => {
        if (editor && command && command.timestamp) {
            // Check if command is intended for THIS editor
            if (command.targetId && id && command.targetId !== id) {
                return;
            }

            if (command.type === 'insertPop') {
                editor.chain().focus().insertContentAt(command.pos, {
                    type: 'popNode',
                    attrs: {
                        id: command.payload.id,
                        name: command.payload.name,
                        code: command.payload.code,
                        color: command.payload.color,
                        type: command.payload.type,
                        cost: command.payload.cost,
                        calculatedCost: command.payload.calculatedCost,
                        duration: command.payload.duration,
                        role: command.payload.role,
                        capacity: command.payload.capacity,
                        recipeYield: command.payload.recipeYield
                    }
                }).insertContent(' ').run(); // Add space after
            } else if (command.type === 'updatePop') {
                // Delete the old node and insert the new one
                editor.chain().focus()
                    .deleteRange({ from: command.pos, to: command.pos + 1 })
                    .insertContentAt(command.pos, {
                        type: 'popNode',
                        attrs: {
                            id: command.payload.id,
                            name: command.payload.name,
                            code: command.payload.code,
                            color: command.payload.color,
                            type: command.payload.type,
                            cost: command.payload.cost,
                            calculatedCost: command.payload.calculatedCost,
                            duration: command.payload.duration,
                            role: command.payload.role,
                            capacity: command.payload.capacity,
                            recipeYield: command.payload.recipeYield
                        }
                    }).run();
            }
        }
    }, [command, editor, id]); // Added id dependency

    if (!editor) {
        return null;
    }

    // We need a way to insert content from the parent AFTER the modal confirms.
    // The parent can maintain a ref to this component, but since it's a functional component,
    // we might need to export a helper function or pass command explicitly.
    // Hacky but effective: Attach to window or a shared object if useRef isn't passed.
    // Better: Pass a "commandRef" prop.

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

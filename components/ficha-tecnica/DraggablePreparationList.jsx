import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Card, CardContent, CardHeader, CardTitle, CardFooter,
    Button, Input, Label, Textarea
} from "@/components/ui";
import {
    List, ChevronDown, ChevronUp, Check, X, Edit, Trash2, StickyNote, CookingPot, Settings2, RefreshCw, Link2
} from "lucide-react";
import IngredientTable from "./IngredientTable";
import { RECIPE_TYPES } from "@/lib/recipeConstants";
import { toast } from "@/components/ui/use-toast";

const DraggablePreparationList = ({
    preparations,
    setPreparations,
    onDirty,
    isProduct,
    onOpenIngredientModal,
    onOpenRecipeModal,
    onOpenProcessEditModal, // New prop
    onSyncPreparation, // New prop
    onOpenAddAssemblyItemModal,
    // Helper functions passed from parent (from useRecipeOperations)
    onRemovePreparation, // (preparations, setPreparations, id)
    onUpdatePreparation, // (preparations, setPreparations, id, field, value) -> wait, RecipeTechnical uses inline setPreparations for local updates sometimes?
    // Actually, RecipeTechnical passed:
    // onUpdatePreparation={(prepIdx, field, value) => setPreparations(...)}
    // I should check the props I plan to pass.
    // Let's assume standard callbacks:
    // onUpdatePreparation(prepIndex, field, value)
    // onUpdateIngredient(prepIndex, ingIdx, field, value)
    // onRemoveIngredient(prepIndex, ingIdx)
    // onUpdateRecipe(prepIndex, recIdx, field, value)
    // onRemoveRecipe(prepIndex, recIdx)

    // Handlers needed for operations that require full state access (like removePreparation which takes preparationsData)
    // or I can handle them here if I have setPreparations.

    // To keep it simple and consistent with RecipeTechnical's patterns:
    // I will accept "operations" object or individual props.
    // RecipeTechnical used `updateIngredient(preparationsData, setPreparationsData, ...)`
    // So I need to pass raw functions AND preparations/setPreparations?
    // No, better to pass wrappers.

    updateIngredientWrapper,
    removeIngredientWrapper,
    updateRecipeWrapper,
    removeRecipeWrapper,
    removePreparationWrapper
}) => {
    // ==== LOCAL UI STATE ====
    const [expandedCards, setExpandedCards] = useState({});
    const [editingTitle, setEditingTitle] = useState(null); // Index being edited
    const [tempTitle, setTempTitle] = useState('');

    // Notes State
    const [editingNote, setEditingNote] = useState(null); // { prepIndex, noteIndex }
    const [noteTitle, setNoteTitle] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [editingNoteTitle, setEditingNoteTitle] = useState(false);
    const [tempNoteTitle, setTempNoteTitle] = useState('');

    // ==== HANDLERS ====

    // Toggle Card
    const toggleCardExpansion = (prepId) => {
        setExpandedCards(prev => ({
            ...prev,
            [prepId]: prev[prepId] === undefined ? false : !prev[prepId]
        }));
    };

    // Drag End
    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(preparations);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        const reorderedWithNewTitles = items.map((item, index) => {
            // Check if title starts with "Xº Etapa: "
            const prefixRegex = /^\d+º Etapa: /;
            const hasStandardPrefix = prefixRegex.test(item.title);

            let newTitle = item.title;
            if (hasStandardPrefix) {
                // Replace existing prefix with new index
                newTitle = item.title.replace(prefixRegex, `${index + 1}º Etapa: `);
            } else {
                const currentContent = item.title.replace(prefixRegex, '');
                newTitle = `${index + 1}º Etapa: ${currentContent}`;
            }

            return {
                ...item,
                title: newTitle
            };
        });

        // CRITICAL FIX: Sync sub_components names in OTHER preparations
        // When steps are reordered/renamed, any portioning steps referencing them must be updated
        const finalPreparations = reorderedWithNewTitles.map(prep => {
            if (!prep.sub_components || prep.sub_components.length === 0) return prep;

            const updatedSubComponents = prep.sub_components.map(sub => {
                // If this sub-component comes from another preparation (has source_id)
                if (sub.source_id) {
                    // Find the source preparation in our NEWLY reordered list
                    const sourcePrep = reorderedWithNewTitles.find(p => p.id === sub.source_id);
                    if (sourcePrep) {
                        return {
                            ...sub,
                            name: sourcePrep.title // Update name to match new title
                        };
                    }
                }
                return sub;
            });

            // SORT the sub-components to match the order of the preparations
            updatedSubComponents.sort((a, b) => {
                // Should only sort items that came from preparations (have source_id)
                // Items without source_id (manual additions?) should probably stay or be pushed to end?
                // Use MAX_SAFE_INTEGER for items without source_id to push them to end, or keep relative order?
                // Let's assume items with source_id should be ordered by their source index.

                const indexA = a.source_id ? reorderedWithNewTitles.findIndex(p => p.id === a.source_id) : -1;
                const indexB = b.source_id ? reorderedWithNewTitles.findIndex(p => p.id === b.source_id) : -1;

                // If both have source_id, compare indices
                if (indexA !== -1 && indexB !== -1) return indexA - indexB;

                // If only one has source_id, what to do? 
                // Maybe keep non-sourced items at the end?
                if (indexA === -1 && indexB !== -1) return 1;
                if (indexA !== -1 && indexB === -1) return -1;

                return 0; // Keep relative order of non-sourced items
            });

            return {
                ...prep,
                sub_components: updatedSubComponents
            };
        });

        setPreparations(finalPreparations);
        onDirty(true);
    };

    // Title Editing
    const startEditingTitle = (index, currentTitle) => {
        // Remove "Xº Etapa: " prefix if exists
        const prefixRegex = /^\d+º Etapa: /;
        const cleanTitle = currentTitle.replace(prefixRegex, '');
        setTempTitle(cleanTitle);
        setEditingTitle(index);
    };

    const cancelEditingTitle = () => {
        setEditingTitle(null);
        setTempTitle('');
    };

    const saveTitle = (prepIndex) => {
        if (tempTitle.trim()) {
            setPreparations(prev => {
                const newData = [...prev];
                if (newData[prepIndex]) {
                    newData[prepIndex].title = `${prepIndex + 1}º Etapa: ${tempTitle.trim()}`;
                }
                return newData;
            });
            onDirty(true);
        }
        setEditingTitle(null);
        setTempTitle('');
    };

    // Notes Helpers
    const getAutoNoteTitle = (noteIndex) => `${noteIndex + 1}º Passo`;

    // Note Editing
    const startEditingNote = (prepIndex, noteIndex = null) => {
        // If we were editing a note and it's empty, remove it before switching
        if (editingNote && !noteContent.trim()) {
            setPreparations(prev => {
                const newData = [...prev];
                const prevPrep = newData[editingNote.prepIndex];
                if (prevPrep?.notes?.[editingNote.noteIndex]) {
                    const prevNote = prevPrep.notes[editingNote.noteIndex];
                    if (!prevNote.content?.trim()) {
                        prevPrep.notes.splice(editingNote.noteIndex, 1);
                    }
                }
                return newData;
            });
        }

        if (noteIndex !== null) {
            // Editing existing
            const prep = preparations[prepIndex];
            const note = prep.notes?.[noteIndex];
            if (note) {
                setNoteTitle(note.title || '');
                setNoteContent(note.content || '');
                setEditingNote({ prepIndex, noteIndex });
            }
        } else {
            // New note
            setPreparations(prev => {
                const newData = [...prev];
                if (!newData[prepIndex].notes) newData[prepIndex].notes = [];

                const newNoteIndex = newData[prepIndex].notes.length;
                newData[prepIndex].notes.push({
                    title: '', content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                });

                // Use timeout to set editing state after render cycle, or just set it here? 
                // Logic in RecipeTechnical was: setPreparations... then setEditingNote inside the callback? 
                // No, it was setEditingNote inside the setState callback? 
                // Actually RecipeTechnical set editingNote AFTER setPreparations call, but inside the same scoping block. 
                // Wait, RecipeTechnical line 1069: setEditingNote called inside setPreparations callback? NO. 
                // It was inside setPreparations callback: `setEditingNote(...)`. 
                // setPreparations expects a function that returns new state. Side effects inside it are bad practice (double invocation in strict mode).
                // I should better calculate new state, set it, THEN set editing note.

                // Correct approach:
                return newData;
            });

            // Need to know the index of the new note. It's the last one.
            // But setState is async. 
            // I'll trust that I can set editing note to the length.
            // Better: pass a callback or useEffect? 
            // Simplified:
            const noteIdx = preparations[prepIndex]?.notes?.length || 0; // This fetches CURRENT state, not future.
            // If I just called setPreparations, preparations prop hasn't updated yet.
            // So I should use the length of the current list + 0 (since it will be at the end).
            // Wait, if I add it, it will be at `length`.
            setTimeout(() => {
                setNoteTitle('');
                setNoteContent('');
                setEditingNote({ prepIndex, noteIndex: noteIdx });
                onDirty(true);
            }, 0);
            return;
        }
    };

    // Re-reading RecipeTechnical logic for New Note (line 1048):
    /*
      } else {
        // Nova nota - criar imediatamente
        setPreparationsData(prev => {
           // ... pushes to array ...
           // setEditingNote called inside here!
           return newData;
        });
      }
    */
    // React state setters inside state updaters is weird but works if outside the return.
    // I'll stick to safer pattern.

    const startEditingNoteTitle = () => {
        setEditingNoteTitle(true);
        setTempNoteTitle(noteTitle || '');
    };

    const cancelEditingNoteTitle = () => {
        setEditingNoteTitle(false);
        setTempNoteTitle('');
    };

    const saveNoteTitle = () => {
        const trimmedComplement = tempNoteTitle.trim();
        setNoteTitle(trimmedComplement);

        if (editingNote) {
            setPreparations(prev => {
                const newData = [...prev];
                if (newData[editingNote.prepIndex]?.notes?.[editingNote.noteIndex]) {
                    newData[editingNote.prepIndex].notes[editingNote.noteIndex].title = trimmedComplement;
                    newData[editingNote.prepIndex].notes[editingNote.noteIndex].updatedAt = new Date().toISOString();
                }
                return newData;
            });
            onDirty(true);
        }
        setEditingNoteTitle(false);
        setTempNoteTitle('');
    };

    const updateNoteContentHandler = (prepIndex, noteIndex, content) => {
        setNoteContent(content);
        setPreparations(prev => {
            const newData = [...prev];
            if (newData[prepIndex]?.notes?.[noteIndex]) {
                newData[prepIndex].notes[noteIndex].content = content;
                newData[prepIndex].notes[noteIndex].updatedAt = new Date().toISOString();
            }
            return newData;
        });
        onDirty(true);
    };

    const deleteNote = (prepIndex, noteIndex) => {
        setPreparations(prev => {
            const newData = [...prev];
            if (newData[prepIndex]?.notes) {
                newData[prepIndex].notes.splice(noteIndex, 1);
            }
            return newData;
        });
        onDirty(true);
        toast({ title: "Nota removida", description: "A nota foi removida com sucesso." });
    };

    const cancelEditingNote = () => {
        setEditingNote(null);
        setNoteTitle('');
        setNoteContent('');
        setEditingNoteTitle(false);
        setTempNoteTitle('');
    };


    return (
        <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="preparations">
                {(provided) => (
                    <div
                        className="space-y-6"
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                    >
                        {preparations.length === 0 ? (
                            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 text-center">
                                <div className="flex flex-col items-center gap-3">
                                    <CookingPot className="h-10 w-10 text-blue-500" />
                                    <h3 className="text-lg font-medium text-blue-800">Comece sua ficha técnica</h3>
                                    <p className="text-blue-600 max-w-md mx-auto">
                                        Para iniciar, adicione um novo processo utilizando o botão acima.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            preparations.map((prep, index) => {
                                const isExpanded = expandedCards[prep.id] !== false;
                                const isEditingThisTitle = editingTitle === index;

                                return (
                                    <Draggable key={prep.id} draggableId={prep.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                            >
                                                <Card
                                                    className={`border-l-4 border-l-blue-400 ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-400' : ''}`}
                                                >
                                                    <CardHeader className="bg-blue-50 border-b">
                                                        <div className="flex justify-between items-center gap-3">
                                                            <div
                                                                {...provided.dragHandleProps}
                                                                className="cursor-move p-1 hover:bg-blue-100 rounded"
                                                            >
                                                                <List className="h-4 w-4 text-blue-600" />
                                                            </div>

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => toggleCardExpansion(prep.id)}
                                                                className="text-blue-600 hover:bg-blue-100"
                                                            >
                                                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                            </Button>

                                                            <div className="flex-1 flex items-center gap-2">
                                                                {isEditingThisTitle ? (
                                                                    <>
                                                                        <Input
                                                                            value={tempTitle}
                                                                            onChange={(e) => setTempTitle(e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') saveTitle(index);
                                                                                else if (e.key === 'Escape') cancelEditingTitle();
                                                                            }}
                                                                            className="text-lg font-semibold"
                                                                            autoFocus
                                                                        />
                                                                        <Button variant="ghost" size="sm" onClick={() => saveTitle(index)} className="text-green-600 hover:bg-green-50">
                                                                            <Check className="h-4 w-4" />
                                                                        </Button>
                                                                        <Button variant="ghost" size="sm" onClick={cancelEditingTitle} className="text-gray-600 hover:bg-gray-100">
                                                                            <X className="h-4 w-4" />
                                                                        </Button>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <CardTitle className="text-lg text-blue-800">{prep.title}</CardTitle>
                                                                        <Button variant="ghost" size="sm" onClick={() => startEditingTitle(index, prep.title)} className="text-blue-600 hover:bg-blue-100">
                                                                            <Edit className="h-3 w-3" />
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </div>



                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => onOpenProcessEditModal(index, prep.processes)}
                                                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                                                                title="Editar Processos"
                                                            >
                                                                <Settings2 className="h-4 w-4" />
                                                            </Button>

                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removePreparationWrapper(prep.id)}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </CardHeader>

                                                    {isExpanded && (
                                                        <>
                                                            <CardContent className="p-6">
                                                                <div className="space-y-4">
                                                                    <IngredientTable
                                                                        prep={prep}
                                                                        prepIndex={index}
                                                                        onOpenIngredientModal={onOpenIngredientModal}
                                                                        onOpenRecipeModal={onOpenRecipeModal}
                                                                        onOpenAddAssemblyItemModal={onOpenAddAssemblyItemModal}
                                                                        isProduct={isProduct}
                                                                        onUpdatePreparation={(prepIdx, field, value) => {
                                                                            setPreparations(prev => {
                                                                                const newData = [...prev];
                                                                                if (newData[prepIdx]) newData[prepIdx][field] = value;
                                                                                return newData;
                                                                            });
                                                                            onDirty(true);
                                                                        }}
                                                                        onUpdateIngredient={updateIngredientWrapper}
                                                                        onUpdateRecipe={updateRecipeWrapper}
                                                                        onRemoveIngredient={removeIngredientWrapper}
                                                                        onRemoveRecipe={removeRecipeWrapper}
                                                                        preparations={preparations}
                                                                        readOnly={!!prep.origin_id || (prep.sub_components && prep.sub_components.some(sc => !!sc.origin_id))}
                                                                    />
                                                                </div>
                                                            </CardContent>

                                                            <CardFooter className="flex flex-col gap-3 p-4 pt-0">
                                                                {editingNote?.prepIndex === index ? (
                                                                    <div className="w-full space-y-3 p-4 border-l-4 border-l-orange-400 bg-white rounded">
                                                                        <div className="flex items-center gap-2 mb-2">
                                                                            {editingNoteTitle ? (
                                                                                <>
                                                                                    <div className="flex items-center gap-2 flex-1">
                                                                                        <span className="text-sm font-semibold text-orange-700 whitespace-nowrap">
                                                                                            {editingNote ? getAutoNoteTitle(editingNote.noteIndex) : 'New Note'}
                                                                                        </span>
                                                                                        <span className="text-sm font-medium text-gray-500">-</span>
                                                                                        <Input
                                                                                            value={tempNoteTitle}
                                                                                            onChange={(e) => setTempNoteTitle(e.target.value)}
                                                                                            onKeyDown={(e) => {
                                                                                                if (e.key === 'Enter') saveNoteTitle();
                                                                                                else if (e.key === 'Escape') cancelEditingNoteTitle();
                                                                                            }}
                                                                                            placeholder="adicione um complemento (opcional)"
                                                                                            className="text-sm font-medium flex-1"
                                                                                            autoFocus
                                                                                        />
                                                                                    </div>
                                                                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); saveNoteTitle(); }} className="text-green-600 hover:bg-green-50 h-7 w-7 p-0">
                                                                                        <Check className="h-3 w-3" />
                                                                                    </Button>
                                                                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); cancelEditingNoteTitle(); }} className="text-gray-600 hover:bg-gray-100 h-7 w-7 p-0">
                                                                                        <X className="h-3 w-3" />
                                                                                    </Button>
                                                                                </>
                                                                            ) : (
                                                                                <>
                                                                                    <Label className="text-sm font-medium text-gray-700 flex-1">
                                                                                        <span className="font-semibold text-orange-700">
                                                                                            {editingNote ? getAutoNoteTitle(editingNote.noteIndex) : '1º Passo'}
                                                                                        </span>
                                                                                        {noteTitle && <span className="text-gray-700"> - {noteTitle}</span>}
                                                                                    </Label>
                                                                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); startEditingNoteTitle(); }} className="text-orange-600 hover:bg-orange-50 h-7 w-7 p-0">
                                                                                        <Edit className="h-3 w-3" />
                                                                                    </Button>
                                                                                    <Button variant="ghost" size="sm"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            if (confirm('Deseja excluir esta nota?')) {
                                                                                                deleteNote(index, editingNote.noteIndex);
                                                                                                cancelEditingNote();
                                                                                            }
                                                                                        }}
                                                                                        className="text-red-500 hover:bg-red-50 h-7 w-7 p-0"
                                                                                    >
                                                                                        <Trash2 className="h-3 w-3" />
                                                                                    </Button>
                                                                                </>
                                                                            )}
                                                                        </div>

                                                                        <div className="space-y-2">
                                                                            <Textarea
                                                                                placeholder="Descreva as informações importantes desta etapa..."
                                                                                value={noteContent}
                                                                                onChange={(e) => updateNoteContentHandler(index, editingNote.noteIndex, e.target.value)}
                                                                                rows={4}
                                                                                className="border-gray-200 focus:border-orange-400 resize-none"
                                                                            />
                                                                            <div className="flex justify-end">
                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (noteContent.trim()) {
                                                                                            cancelEditingNote();
                                                                                            toast({ title: "Nota salva", description: "A nota foi salva com sucesso." });
                                                                                        } else {
                                                                                            deleteNote(index, editingNote.noteIndex);
                                                                                            cancelEditingNote();
                                                                                        }
                                                                                    }}
                                                                                    className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
                                                                                >
                                                                                    <Check className="h-4 w-4 mr-2" />
                                                                                    Concluir Edição
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {Array.isArray(prep.notes) && prep.notes.filter(note => note.content).length > 0 && (
                                                                            <div className="w-full space-y-2">
                                                                                {prep.notes
                                                                                    .map((note, noteIndex) => ({ note, noteIndex }))
                                                                                    .filter(({ note }) => note.content)
                                                                                    .map(({ note, noteIndex }) => (
                                                                                        <div
                                                                                            key={noteIndex}
                                                                                            className="bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                                                                                            onClick={() => startEditingNote(index, noteIndex)}
                                                                                        >
                                                                                            <h4 className="font-semibold text-amber-900 text-sm mb-1">
                                                                                                <span className="text-orange-700">{getAutoNoteTitle(noteIndex)}</span>
                                                                                                {note.title && <span className="text-amber-900"> - {note.title}</span>}
                                                                                            </h4>
                                                                                            {note.content && <p className="text-amber-800 text-xs whitespace-pre-wrap">{note.content}</p>}
                                                                                            <div className="flex justify-end items-center mt-2">
                                                                                                <Button
                                                                                                    variant="ghost"
                                                                                                    size="sm"
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        if (confirm('Deseja remover esta nota?')) deleteNote(index, noteIndex);
                                                                                                    }}
                                                                                                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                                                >
                                                                                                    <Trash2 className="h-3 w-3" />
                                                                                                </Button>
                                                                                            </div>
                                                                                        </div>
                                                                                    ))}
                                                                            </div>
                                                                        )}
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={(e) => { e.stopPropagation(); startEditingNote(index); }}
                                                                            className="w-full text-orange-600 border-orange-300 hover:bg-orange-50 hover:text-orange-700"
                                                                        >
                                                                            <StickyNote className="h-4 w-4 mr-2" />
                                                                            Adicionar Nota
                                                                        </Button>
                                                                    </>
                                                                )}
                                                            </CardFooter>
                                                        </>
                                                    )}
                                                </Card>
                                            </div>
                                        )}
                                    </Draggable>
                                );
                            })
                        )}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
};

export default DraggablePreparationList;

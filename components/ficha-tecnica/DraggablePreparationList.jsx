import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
    Card, CardContent, CardHeader, CardTitle, CardFooter,
    Button, Input, Label, Textarea
} from "@/components/ui";
import {
    List, ChevronDown, ChevronUp, Check, X, Edit, Trash2, StickyNote,
    CookingPot, Settings2, RefreshCw, Link2, Camera
} from "lucide-react";
import IngredientTable from "./IngredientTable";
import RichTextEditor from '@/components/ui/RichTextEditor';
import { RECIPE_TYPES } from "@/lib/recipeConstants";
import { toast } from "@/components/ui/use-toast";

const DraggablePreparationList = ({
    preparations,
    setPreparations,
    onDirty,
    isProduct,
    onOpenIngredientModal,
    onOpenPackagingModal,
    onOpenRecipeModal,
    onOpenIngredientReplacementModal,
    onOpenProcessEditModal,
    onUnlockPreparation,
    onSyncPreparation,
    onOpenAddAssemblyItemModal,
    
    // Handlers passed down to IngredientTable
    onUpdatePreparation,
    onBatchUpdatePreparations,
    updateIngredientWrapper,
    updateRecipeWrapper,
    removeIngredientWrapper,
    removeRecipeWrapper,
    removePreparationWrapper,
    
    // POP Handlers
    onDropPop,
    onEditPop,
    prioritizedCommand
}) => {
    // ==== LOCAL UI STATE ====
    const [expandedCards, setExpandedCards] = useState(() => {
        const initial = {};
        preparations.forEach(p => {
            if (p.id) initial[p.id] = true;
        });
        return initial;
    });
    const [editingTitle, setEditingTitle] = useState(null); // Index being edited
    const [tempTitle, setTempTitle] = useState('');

    // Assegura que novas preparações ou ao carregar a receita abram expandidas
    React.useEffect(() => {
        setExpandedCards(prev => {
            const next = { ...prev };
            let changed = false;
            preparations.forEach(p => {
                if (p.id && next[p.id] === undefined) {
                    next[p.id] = true;
                    changed = true;
                }
            });
            return changed ? next : prev;
        });
    }, [preparations]);

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
            [prepId]: !prev[prepId]
        }));
    };

    // Drag End
    const handleDragEnd = (result) => {
        if (!result.destination) return;

        const items = Array.from(preparations);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        const reorderedWithNewTitles = items.map((item, index) => {
            // Check if title starts with standard prefix format
            const prefixRegex = /^\d+[º°]?\s*Etapa:\s*/i;
            const hasStandardPrefix = prefixRegex.test(item.title);

            let newTitle = item.title;
            if (hasStandardPrefix) {
                // Replace existing prefix with new index correctly
                newTitle = item.title.replace(prefixRegex, `${index + 1}º Etapa: `);
            }
            // If the user manually removed the prefix, DO NOT force it back!

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
        // Remove "Xº Etapa: " prefix if exists, capturing optional space after colon
        const prefixRegex = /^\d+º Etapa:\s*/;
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
                    newData[prepIndex] = {
                        ...newData[prepIndex],
                        title: `${prepIndex + 1}º Etapa: ${tempTitle.trim()}`
                    };
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
                if (newData[editingNote.prepIndex]) {
                    const prevPrep = { ...newData[editingNote.prepIndex] };
                    if (prevPrep.notes?.[editingNote.noteIndex]) {
                        const prevNote = prevPrep.notes[editingNote.noteIndex];
                        if (!prevNote.content?.trim()) {
                            const newNotes = [...prevPrep.notes];
                            newNotes.splice(editingNote.noteIndex, 1);
                            prevPrep.notes = newNotes;
                            newData[editingNote.prepIndex] = prevPrep;
                        }
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
            const noteIdx = preparations[prepIndex]?.notes?.length || 0;

            setPreparations(prev => {
                const newData = [...prev];
                if (newData[prepIndex]) {
                    const newPrep = { ...newData[prepIndex] };
                    const newNotes = newPrep.notes ? [...newPrep.notes] : [];
                    newNotes.push({
                        title: '', content: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
                    });
                    newPrep.notes = newNotes;
                    newData[prepIndex] = newPrep;
                }
                return newData;
            });

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
                if (newData[editingNote.prepIndex]) {
                    const newPrep = { ...newData[editingNote.prepIndex] };
                    if (newPrep.notes && newPrep.notes[editingNote.noteIndex]) {
                        const newNotes = [...newPrep.notes];
                        newNotes[editingNote.noteIndex] = {
                            ...newNotes[editingNote.noteIndex],
                            title: trimmedComplement,
                            updatedAt: new Date().toISOString()
                        };
                        newPrep.notes = newNotes;
                        newData[editingNote.prepIndex] = newPrep;
                    }
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
            if (newData[prepIndex]) {
                const newPrep = { ...newData[prepIndex] };
                if (newPrep.notes && newPrep.notes[noteIndex]) {
                    const newNotes = [...newPrep.notes];
                    newNotes[noteIndex] = {
                        ...newNotes[noteIndex],
                        content: content,
                        updatedAt: new Date().toISOString()
                    };
                    newPrep.notes = newNotes;
                    newData[prepIndex] = newPrep;
                }
            }
            return newData;
        });
        onDirty(true);
    };

    const deleteNote = (prepIndex, noteIndex) => {
        setPreparations(prev => {
            const newData = [...prev];
            if (newData[prepIndex]) {
                const newPrep = { ...newData[prepIndex] };
                if (newPrep.notes) {
                    const newNotes = [...newPrep.notes];
                    newNotes.splice(noteIndex, 1);
                    newPrep.notes = newNotes;
                    newData[prepIndex] = newPrep;
                }
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


    // --- UPLOAD LOGIC ---
    const uploadToVercelBlob = async (file, pathPrefix) => {
        const filename = `${pathPrefix}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch(`/api/upload?filename=${filename}`, { method: 'POST', body: formData });
        if (!response.ok) throw new Error('Falha no upload');
        const newBlob = await response.json();
        return newBlob.url;
    };

    const handleNoteImageUpload = async (prepIndex, noteIndex, event) => {
        const file = event.target.files[0];
        if (!file) return;

        console.log('📸 [NoteImageUpload] Starting upload for prep:', prepIndex, 'note:', noteIndex, 'file:', file.name);

        // Using a safe fallback
        const recipeId = "current_editing";

        try {
            const pathPrefix = `recipes/${recipeId}/notes/${prepIndex}_note_${noteIndex}`;
            const downloadURL = await uploadToVercelBlob(file, pathPrefix);
            console.log('📸 [NoteImageUpload] Upload success, URL:', downloadURL);

            // Update State
            setPreparations(prev => {
                const newData = [...prev];
                if (newData[prepIndex]) {
                    const newPrep = { ...newData[prepIndex] };
                    if (newPrep.notes && newPrep.notes[noteIndex]) {
                        const newNotes = [...newPrep.notes];
                        newNotes[noteIndex] = {
                            ...newNotes[noteIndex],
                            photo: downloadURL,
                            updatedAt: new Date().toISOString()
                        };
                        newPrep.notes = newNotes;
                        newData[prepIndex] = newPrep;
                        console.log('📸 [NoteImageUpload] State updated with photo URL');
                    } else {
                        console.warn('📸 [NoteImageUpload] Note not found at index:', noteIndex, 'notes:', newPrep.notes);
                    }
                } else {
                    console.warn('📸 [NoteImageUpload] Prep not found at index:', prepIndex);
                }
                return newData;
            });
            onDirty(true);
            toast({ title: "Foto enviada", description: "Imagem anexada à nota." });

        } catch (error) {
            console.error("📸 [NoteImageUpload] Erro upload:", error);
            toast({ title: "Erro", description: "Falha ao enviar imagem.", variant: "destructive" });
        }
    };

    const deleteNotePhoto = (prepIndex, noteIndex) => {
        setPreparations(prev => {
            const newData = [...prev];
            if (newData[prepIndex]) {
                const newPrep = { ...newData[prepIndex] };
                if (newPrep.notes && newPrep.notes[noteIndex]) {
                    const newNotes = [...newPrep.notes];
                    newNotes[noteIndex] = {
                        ...newNotes[noteIndex],
                        photo: null,
                        updatedAt: new Date().toISOString()
                    };
                    newPrep.notes = newNotes;
                    newData[prepIndex] = newPrep;
                }
            }
            return newData;
        });
        onDirty(true);
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
                                const isExpanded = !!expandedCards[prep.id];
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
                                                                        onOpenPackagingModal={onOpenPackagingModal}
                                                                        onOpenRecipeModal={onOpenRecipeModal}
                                                                        onOpenIngredientReplacementModal={onOpenIngredientReplacementModal}
                                                                        onOpenAddAssemblyItemModal={onOpenAddAssemblyItemModal}
                                                                        isProduct={isProduct}
                                                                        onUpdatePreparation={onUpdatePreparation}
                                                                        onBatchUpdatePreparations={onBatchUpdatePreparations}
                                                                        onUpdateIngredient={updateIngredientWrapper}
                                                                        onUpdateRecipe={updateRecipeWrapper}
                                                                        onRemoveIngredient={removeIngredientWrapper}
                                                                        onRemoveRecipe={removeRecipeWrapper}
                                                                        onUnlockPreparation={onUnlockPreparation}
                                                                        preparations={preparations}
                                                                         readOnly={
                                                                             !!prep.origin_id || 
                                                                             (prep.sub_components && prep.sub_components.some(sc => !!sc.origin_id)) ||
                                                                             (prep.ingredients && prep.ingredients.some(ing => ing.locked))
                                                                         }
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

                                                                            <RichTextEditor
                                                                                value={noteContent}
                                                                                onChange={(content) => updateNoteContentHandler(index, editingNote.noteIndex, content)}
                                                                                placeholder="Descreva as informações importantes desta etapa (use @ para mencionar POPs ou arraste da barra lateral)..."
                                                                                minHeight="150px"
                                                                                onDropPop={onDropPop}
                                                                                onEditPop={onEditPop}
                                                                                id={`prep-${index}-note-${editingNote.noteIndex}`} // Unique ID for targeting
                                                                                command={prioritizedCommand?.targetId === `prep-${index}-note-${editingNote.noteIndex}` ? prioritizedCommand : null}
                                                                                recipeYield={1} // Pass yield if available
                                                                            />

                                                                            {/* UPLOAD NA EDIÇÃO */}
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-2">
                                                                                    <input
                                                                                        type="file"
                                                                                        accept="image/*"
                                                                                        id={`upload-edit-note-${index}-${editingNote.noteIndex}`}
                                                                                        className="hidden"
                                                                                        onChange={(e) => handleNoteImageUpload(index, editingNote.noteIndex, e)}
                                                                                    />
                                                                                    <label
                                                                                        htmlFor={`upload-edit-note-${index}-${editingNote.noteIndex}`}
                                                                                        className="cursor-pointer text-gray-500 hover:text-orange-500 flex items-center gap-1 text-xs"
                                                                                    >
                                                                                        <Camera className="h-4 w-4" /> Adicionar Foto
                                                                                    </label>
                                                                                </div>

                                                                                <Button
                                                                                    variant="outline"
                                                                                    size="sm"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        // Allow saving if content exists OR photo exists (we need to check photo in real data)
                                                                                        const currentNote = preparations[index]?.notes?.[editingNote.noteIndex];
                                                                                        if (noteContent.trim() || currentNote?.photo) {
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
                                                                                    Concluir
                                                                                </Button>
                                                                            </div>

                                                                            {/* Preview da Foto na Edição */}
                                                                            {preparations[index]?.notes?.[editingNote.noteIndex]?.photo && (
                                                                                <div className="relative w-32 h-20 rounded overflow-hidden border">
                                                                                    <img src={preparations[index].notes[editingNote.noteIndex].photo} className="w-full h-full object-cover" />
                                                                                </div>
                                                                            )}

                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        {Array.isArray(prep.notes) && prep.notes.filter(note => note.content || note.photo).length > 0 && (
                                                                            <div className="w-full space-y-2">
                                                                                {prep.notes
                                                                                    .map((note, noteIndex) => ({ note, noteIndex }))
                                                                                    .filter(({ note }) => note.content || note.photo)
                                                                                    .map(({ note, noteIndex }) => (
                                                                                        <div
                                                                                            key={noteIndex}
                                                                                            className="bg-amber-50 border border-amber-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow group/note"
                                                                                            onClick={() => startEditingNote(index, noteIndex)}
                                                                                        >
                                                                                            <div className="flex justify-between items-start">
                                                                                                <h4 className="font-semibold text-amber-900 text-sm mb-1">
                                                                                                    <span className="text-orange-700">{getAutoNoteTitle(noteIndex)}</span>
                                                                                                    {note.title && <span className="text-amber-900"> - {note.title}</span>}
                                                                                                </h4>

                                                                                                <div className="flex items-center gap-1">
                                                                                                    {/* Botão Foto Lista */}
                                                                                                    <div onClick={e => e.stopPropagation()}>
                                                                                                        <input
                                                                                                            type="file"
                                                                                                            accept="image/*"
                                                                                                            id={`upload-list-note-${index}-${noteIndex}`}
                                                                                                            className="hidden"
                                                                                                            onChange={(e) => handleNoteImageUpload(index, noteIndex, e)}
                                                                                                        />
                                                                                                        <label
                                                                                                            htmlFor={`upload-list-note-${index}-${noteIndex}`}
                                                                                                            className="p-1 text-gray-400 hover:text-orange-500 cursor-pointer block"
                                                                                                        >
                                                                                                            <Camera className="h-4 w-4" />
                                                                                                        </label>
                                                                                                    </div>

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

                                                                                            {note.content && (
                                                                                                <div
                                                                                                    className="text-amber-800 text-xs whitespace-pre-wrap prose prose-sm max-w-none [&_p]:m-0 [&_p]:inline"
                                                                                                    dangerouslySetInnerHTML={{ __html: note.content }}
                                                                                                />
                                                                                            )}

                                                                                            {note.photo && (
                                                                                                <div className="mt-2 relative w-full rounded overflow-hidden border border-amber-200">
                                                                                                    <img src={note.photo} alt="Nota" className="w-full h-auto object-contain" />
                                                                                                    <button
                                                                                                        onClick={(e) => { e.stopPropagation(); deleteNotePhoto(index, noteIndex); }}
                                                                                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover/note:opacity-100 transition-opacity"
                                                                                                    >
                                                                                                        <X className="h-3 w-3" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            )}

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
                                                                            Adicionar Nota (Passo)
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

'use client';

import React, { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useProducts } from "@/hooks/catalog/useProducts";
import { CategoryTree, Recipe, MenuConfig, CategoryType } from "@/app/api/entities";
import { APP_CONSTANTS } from "@/lib/constants";
import { toTitleCase } from "@/lib/textUtils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Trash, MoreVertical, Pencil, Box, Plus, Settings, FileText, Printer, Eye, EyeOff } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProductFormModal from "./ProductFormModal";
import ProductSettingsDialog from "./ProductSettingsDialog";

export default function ProductsList() {
    const searchParams = useSearchParams();
    const { products, loading, error, deleteProduct, addProduct, updateProduct, fetchProducts } = useProducts();
    const [searchTerm, setSearchTerm] = useState("");
    const [activeCategory, setActiveCategory] = useState("all");
    const [viewMode, setViewMode] = useState("grid");
    const [fullCategoryTree, setFullCategoryTree] = useState([]);
    const [productCategories, setProductCategories] = useState([]);
    const [activeSubCategory, setActiveSubCategory] = useState(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const [activeType, setActiveType] = useState("produtos");
    const [categoryTypes, setCategoryTypes] = useState([]);
    const [visibleTypes, setVisibleTypes] = useState({});
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    useEffect(() => {
        loadCategoryTree();
        loadCategoryTypes();
        loadVisibilitySettings();
        checkExportParam();
    }, []);

    const loadCategoryTypes = async () => {
        try {
            const types = await CategoryType.list();
            setCategoryTypes(types.sort((a, b) => (a.order || 0) - (b.order || 0)));
        } catch (error) {
            console.error("Error loading category types:", error);
        }
    };

    const loadVisibilitySettings = async () => {
        try {
            const mockUserId = APP_CONSTANTS.MOCK_USER_ID;
            const configs = await MenuConfig.query([
                { field: 'user_id', operator: '==', value: mockUserId },
                { field: 'is_default', operator: '==', value: true }
            ]);

            if (configs && configs.length > 0 && configs[0].product_visible_types) {
                setVisibleTypes(configs[0].product_visible_types);
            } else {
                // Seeh default logic is to only show 'produtos'
                const initial = {};
                // will be populated correctly once we have categoryTypes, or we just trust the map
                setVisibleTypes({});
            }
        } catch (e) {
            console.error("Failed to load visibility settings", e);
        }
    };

    const visibleCategoryTypes = categoryTypes.filter(type => {
        if (Object.keys(visibleTypes).length > 0) {
            return visibleTypes[type.value] === true;
        }
        return type.value === 'produtos'; // Default fallback
    });

    const checkExportParam = async () => {
        if (!searchParams) return;
        const exportId = searchParams.get('export');
        if (exportId) {
            try {
                const recipeToExport = await Recipe.getById(exportId);
                if (recipeToExport) {
                    setEditingProduct({
                        id: null, // forces creation instead of update
                        name: recipeToExport.name,
                        code: '',
                        unit_type: 'un',
                        shelf_life_days: '',
                        components: [{
                            recipe_id: recipeToExport.id,
                            weight_kg: recipeToExport.yield_weight || 0
                        }]
                    });
                    setIsModalOpen(true);
                }
            } catch (e) {
                console.error("Error loading recipe for export", e);
            }
        }
    };

    useEffect(() => {
        if (fullCategoryTree.length > 0) {
            const cats = fullCategoryTree
                .filter(cat => cat.type === activeType && cat.active !== false && cat.level === 1)
                .sort((a, b) => (a.order || 0) - (b.order || 0));

            setProductCategories(cats.map(cat => ({
                id: cat.id, name: cat.name, label: cat.name, value: cat.name,
            })));
        }
    }, [fullCategoryTree, activeType]);

    const loadCategoryTree = async () => {
        try {
            const allCategories = await CategoryTree.list();
            setFullCategoryTree(allCategories);
        } catch (error) {
            console.error("Error loading categories", error);
        }
    };

    const handleDelete = async (id, name) => {
        if (window.confirm(`Tem certeza que deseja excluir o produto comercial "${name}"?`)) {
            await deleteProduct(id);
        }
    };

    const handleOpenNew = () => {
        setEditingProduct(null);
        setIsModalOpen(true);
    };

    const handleOpenEdit = (product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    const handleSaveProduct = async (formData) => {
        try {
            if (editingProduct) {
                await updateProduct(editingProduct.id, formData);
            } else {
                // Criar o produto
                const newProduct = await addProduct(formData);

                // Auto-criar Recipe vinculada para aparecer na Ficha Técnica
                if (newProduct && newProduct.id) {
                    try {
                        const recipeData = {
                            name: formData.name || '',
                            category: formData.category || '',
                            type: 'produtos',
                            source_product_id: newProduct.id,
                            active: true,
                            total_weight: 0,
                            yield_weight: 0,
                            total_cost: 0,
                            ingredients: [],
                            preparations: [],
                            dependencies: [],
                            createdAt: new Date(),
                            updatedAt: new Date()
                        };
                        const newRecipe = await Recipe.create(recipeData);

                        // Vincular produto à receita
                        await updateProduct(newProduct.id, {
                            components: [{ recipe_id: newRecipe.id, weight_kg: 0 }],
                            recipe_link_id: newRecipe.id
                        });
                    } catch (recipeErr) {
                        console.error('Erro ao auto-criar receita para produto:', recipeErr);
                    }
                }
            }
            setIsModalOpen(false);
            fetchProducts();
        } catch (e) {
            alert("Erro ao salvar produto: " + e.message);
        }
    };

    const getFilteredProducts = () => {
        let filtered = products;

        // 0. Filter by Active Type (The main tab)
        // Products are associated with exactly ONE category. So we find which ones belong to `activeType`.
        // If a product has no category, we can show it in the default 'produtos' tab, or 'Todas'
        const typeCategories = fullCategoryTree.filter(c => c.type === activeType);
        const typeCategoryNames = typeCategories.map(c => c.name);
        const typeCategoryIds = typeCategories.map(c => c.id);

        filtered = filtered.filter(p => {
            if (!p.category && !p.category_id) {
                // If it has no category, only show it if we are in the default "produtos" tab.
                return activeType === 'produtos';
            }
            return (
                (p.category_id && typeCategoryIds.includes(p.category_id)) ||
                (p.category && typeCategoryNames.includes(p.category)) ||
                // if somehow the category name matches activeType directly? not likely, but just in case
                p.category === activeType
            );
        });

        if (searchTerm) {
            filtered = filtered.filter(p =>
                (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()))
            );
            return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
        }

        if (activeCategory !== "all") {
            let targetNames = [activeCategory];
            let targetCategoryIds = [];

            if (activeSubCategory) {
                targetNames = [activeSubCategory.name];
                targetCategoryIds = [activeSubCategory.id];
            } else {
                const rootCat = fullCategoryTree.find(c => c.name === activeCategory && c.level === 1);
                if (rootCat) {
                    targetCategoryIds = [rootCat.id];
                }
            }

            const getAllDescendants = (ids) => {
                let allIds = [...ids];
                let allNames = [];
                const traverse = (parentId) => {
                    const children = fullCategoryTree.filter(c => c.parent_id === parentId);
                    children.forEach(c => {
                        allIds.push(c.id);
                        allNames.push(c.name);
                        traverse(c.id);
                    });
                };
                ids.forEach(id => traverse(id));
                return { ids: allIds, names: allNames };
            };

            const descendantsData = getAllDescendants(targetCategoryIds);
            const finalNames = [...targetNames, ...descendantsData.names];
            const finalIds = descendantsData.ids;

            filtered = filtered.filter(p =>
                (p.category_id && finalIds.includes(p.category_id)) ||
                (p.category && finalNames.includes(p.category))
            );
        }

        return [...filtered].sort((a, b) => a.name?.localeCompare(b.name || ""));
    };

    const filteredProducts = getFilteredProducts();

    let visibleBadgesParentId = null;
    const rootCatForBadges = fullCategoryTree.find(c => c.name === activeCategory && c.level === 1);
    if (rootCatForBadges) {
        visibleBadgesParentId = rootCatForBadges.id;
    }

    const subCategoriesToShow = visibleBadgesParentId
        ? fullCategoryTree.filter(c => c.parent_id === visibleBadgesParentId).sort((a, b) => (a.order || 0) - (b.order || 0))
        : [];

    const handleSubCategoryClick = (cat) => {
        if (activeSubCategory?.id === cat.id) {
            setActiveSubCategory(null);
        } else {
            setActiveSubCategory(cat);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="p-4">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6"
                    >
                        <div>
                            <h1 className="text-2xl font-bold text-blue-900">Produtos (SKU)</h1>
                            <p className="text-gray-600">Catálogo de itens comerciais (marmitas, porções) com preços e integração VR.</p>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    placeholder="Buscar produtos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8 bg-white"
                                />
                            </div>
                            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenNew}>
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Produto
                            </Button>
                        </div>
                    </motion.div>

                    <div className="mb-6 space-y-4">
                        {/* Header com Configuração */}
                        <div className="flex justify-between items-center mb-2">
                            {visibleCategoryTypes.length > 0 && (
                                <Tabs value={activeType} onValueChange={setActiveType} className="w-full max-w-3xl">
                                    <TabsList className="bg-blue-50 p-1 flex-wrap h-auto">
                                        {visibleCategoryTypes.map(type => (
                                            <TabsTrigger
                                                key={type.id || type.value}
                                                value={type.value}
                                                className="min-w-[100px]"
                                            >
                                                {type.label || type.value}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </Tabs>
                            )}

                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setIsSettingsOpen(true)}
                                title="Configurar Abas"
                                className="ml-2"
                            >
                                <Settings className="h-4 w-4 text-gray-600" />
                            </Button>
                        </div>

                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <Tabs defaultValue="all" value={activeCategory} onValueChange={(val) => { setActiveCategory(val); setActiveSubCategory(null); }}>
                                <TabsList className="w-full justify-start border-b border-blue-200 bg-transparent p-0 h-auto space-x-1 flex-wrap">
                                    <TabsTrigger
                                        value="all"
                                        className="rounded-t-lg border-t border-x border-b-0 border-transparent px-4 py-2 data-[state=active]:bg-blue-50 data-[state=active]:border-blue-200 data-[state=active]:text-blue-700 data-[state=active]:shadow-none relative -mb-[1px]"
                                    >
                                        Todas
                                    </TabsTrigger>
                                    {productCategories.map(category => (
                                        <TabsTrigger
                                            key={category.id}
                                            value={category.name}
                                            className="rounded-t-lg border-t border-x border-b-0 border-transparent px-4 py-2 relative group data-[state=active]:bg-blue-50 data-[state=active]:border-blue-200 data-[state=active]:text-blue-700 data-[state=active]:shadow-none -mb-[1px]"
                                        >
                                            {category.name}
                                        </TabsTrigger>
                                    ))}
                                </TabsList>
                            </Tabs>

                            <div className="flex items-center gap-4">
                                <div className="flex border rounded-md">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn("rounded-r-none", viewMode === "grid" && "bg-white")}
                                        onClick={() => setViewMode("grid")}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                                            <path d="M6 2H2V6H6V2ZM13 2H9V6H13V2ZM6 9H2V13H6V9ZM13 9H9V13H13V9Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                        </svg>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn("rounded-l-none", viewMode === "list" && "bg-white")}
                                        onClick={() => setViewMode("list")}
                                    >
                                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                                            <path d="M2 3.5C2 3.22386 2.22386 3 2.5 3H12.5C12.7761 3 13 3.22386 13 3.5C13 3.77614 12.7761 4 12.5 4H2.5C2.22386 4 2 3.77614 2 3.5ZM2 7.5C2 7.22386 2.22386 7 2.5 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H2.5C2.22386 8 2 7.77614 2 7.5ZM2 11.5C2 11.2239 2.22386 11 2.5 11H12.5C12.7761 11 13 11.2239 13 11.5C13 11.7761 12.7761 12 12.5 12H2.5C2.22386 12 2 11.7761 2 11.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                                        </svg>
                                    </Button>
                                </div>
                            </div>
                        </div>

                        <AnimatePresence>
                            {subCategoriesToShow.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="bg-blue-50 border-x border-b border-blue-200 rounded-b-lg p-4 flex flex-wrap gap-2 -mt-4 pt-6 z-0 relative"
                                >
                                    {subCategoriesToShow.map(cat => (
                                        <Badge
                                            key={cat.id}
                                            variant="outline"
                                            className={cn(
                                                "cursor-pointer px-3 py-1.5 text-sm transition-all shadow-sm border",
                                                activeSubCategory?.id === cat.id
                                                    ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                                                    : "bg-white text-blue-900 border-blue-200 hover:bg-white hover:border-blue-300 hover:shadow-md"
                                            )}
                                            onClick={() => handleSubCategoryClick(cat)}
                                        >
                                            {cat.name}
                                        </Badge>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {error ? (
                        <div className="p-8 text-center text-red-500">Erro: {error}</div>
                    ) : (
                        <div className={cn(
                            "gap-4",
                            viewMode === "grid"
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                                : "flex flex-col space-y-4"
                        )}>
                            {filteredProducts.map((product) => (
                                <motion.div
                                    key={product.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Card className="hover:shadow-md transition-all duration-200">
                                        <div className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col flex-1 mr-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-medium text-base flex items-center gap-2">
                                                            {product.code && <span className="text-blue-600 text-sm font-mono mr-1">#{String(product.code).padStart(6, '0')}</span>}
                                                            <Box className="h-4 w-4 text-blue-500" />
                                                            {toTitleCase(product.name)}
                                                        </h3>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">{product.unit_type || 'un'}</Badge>
                                                        <span className="text-xs text-gray-500">
                                                            {toTitleCase(product.category) || 'Sem Categoria'}
                                                        </span>
                                                    </div>
                                                </div>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuItem
                                                            onClick={() => handleOpenEdit(product)}
                                                            className="flex items-center cursor-pointer"
                                                        >
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Editar
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem
                                                            onClick={() => {
                                                                setEditingProduct({
                                                                    ...product,
                                                                    id: null,
                                                                    name: product.name + " (Cópia)",
                                                                    code: ''
                                                                });
                                                                setIsModalOpen(true);
                                                            }}
                                                            className="flex items-center cursor-pointer text-blue-600 focus:text-blue-600"
                                                        >
                                                            <Plus className="mr-2 h-4 w-4" />
                                                            Exportar para SKU
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                let recipeId = product.components?.[0]?.recipe_id;
                                                                if (!recipeId) {
                                                                    // Auto-criar receita vinculada ao produto
                                                                    try {
                                                                        const newRecipe = await Recipe.create({
                                                                            name: product.name,
                                                                            type: 'produtos',
                                                                            category: product.category || '',
                                                                            yield_weight: 0,
                                                                            preparations: [],
                                                                            source_product_id: product.id
                                                                        });
                                                                        recipeId = newRecipe.id;
                                                                        // Vincular ao produto
                                                                        await updateProduct(product.id, {
                                                                            components: [{ recipe_id: recipeId, weight_kg: 0 }]
                                                                        });
                                                                    } catch (e) {
                                                                        alert("Erro ao criar ficha técnica: " + e.message);
                                                                        return;
                                                                    }
                                                                }
                                                                window.location.href = `/ficha-tecnica?id=${recipeId}`;
                                                            }}
                                                            className="flex items-center cursor-pointer"
                                                        >
                                                            <FileText className="mr-2 h-4 w-4" />
                                                            Ficha Técnica
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                let recipeId = product.components?.[0]?.recipe_id;
                                                                if (!recipeId) {
                                                                    try {
                                                                        const newRecipe = await Recipe.create({
                                                                            name: product.name,
                                                                            type: 'produtos',
                                                                            category: product.category || '',
                                                                            yield_weight: 0,
                                                                            preparations: [],
                                                                            source_product_id: product.id
                                                                        });
                                                                        recipeId = newRecipe.id;
                                                                        await updateProduct(product.id, {
                                                                            components: [{ recipe_id: recipeId, weight_kg: 0 }]
                                                                        });
                                                                    } catch (e) {
                                                                        alert("Erro ao criar ficha técnica: " + e.message);
                                                                        return;
                                                                    }
                                                                }
                                                                window.location.href = `/ficha-tecnica?id=${recipeId}`;
                                                            }}
                                                            className="flex items-center cursor-pointer"
                                                        >
                                                            <Printer className="mr-2 h-4 w-4" />
                                                            Imprimir Receita
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem
                                                            onClick={async () => {
                                                                try {
                                                                    await updateProduct(product.id, {
                                                                        ...product,
                                                                        active: product.active === false ? true : false
                                                                    });
                                                                    fetchProducts();
                                                                } catch (e) {
                                                                    console.error(e);
                                                                }
                                                            }}
                                                            className="flex items-center cursor-pointer"
                                                        >
                                                            {product.active === false ? (
                                                                <>
                                                                    <Eye className="mr-2 h-4 w-4" />
                                                                    Marcar como Ativo
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <EyeOff className="mr-2 h-4 w-4" />
                                                                    Marcar como Inativo
                                                                </>
                                                            )}
                                                        </DropdownMenuItem>

                                                        <DropdownMenuItem
                                                            onClick={() => handleDelete(product.id, product.name)}
                                                            className="flex items-center text-red-600 focus:text-red-600 cursor-pointer"
                                                        >
                                                            <Trash className="mr-2 h-4 w-4" />
                                                            Excluir
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.div>
                            ))}
                            {filteredProducts.length === 0 && (
                                <div className="col-span-full p-12 text-center bg-white rounded-lg border border-dashed border-gray-300">
                                    <Box className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                    <h3 className="text-lg font-medium text-gray-900">Nenhum produto encontrado</h3>
                                    <p className="text-gray-500 mt-1">Sua vitrine comercial (SKU) está vazia ou a busca não encontrou resultados.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ProductFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveProduct}
                editingProduct={editingProduct}
                fullCategoryTree={fullCategoryTree}
            />

            <ProductSettingsDialog
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSave={(newSettings) => setVisibleTypes(newSettings)}
            />
        </div>
    );
}

'use client';


import React, { useState, useEffect } from "react";
import { Ingredient } from "@/app/api/entities";
import { Supplier } from "@/app/api/entities";
import { NutritionFood } from "@/app/api/entities";
import { Brand } from "@/app/api/entities";
import { Category, CategoryTree, PriceHistory } from "@/app/api/entities"; // Added Category, CategoryTree and PriceHistory import
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ArrowLeft,
  AlertCircle,
  CircleCheckBig,
  Plus,
  Trash2,
  Search,
  Eye,
  Package
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useRouter } from "next/navigation";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils"; // Assuming cn utility is available

export default function IngredientEditor() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [tacoFoods, setTacoFoods] = useState([]);
  const [categories, setCategories] = useState([]);

  // NOVOS ESTADOS para os campos inteligentes
  const [supplierOptions, setSupplierOptions] = useState([]);
  const [brandOptions, setBrandOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [openSupplierCombobox, setOpenSupplierCombobox] = useState(false);
  const [openBrandCombobox, setOpenBrandCombobox] = useState(false);
  const [openCategoryCombobox, setOpenCategoryCombobox] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    commercial_name: "",
    unit: "kg",
    current_price: "",
    last_update: new Date().toISOString().split('T')[0],
    active: true,
    notes: "",
    main_supplier: "",
    supplier_id: "",
    supplier_code: "",
    brand: "",
    brand_id: "",
    category: "",
    current_stock: "0",
    min_stock: "",
    ingredient_type: "both",
    taco_variations: []
  });

  const [isEditing, setIsEditing] = useState(false);
  const [currentIngredientId, setCurrentIngredientId] = useState(null);
  const [activeTab, setActiveTab] = useState("general");
  const [tacoSearchTerm, setTacoSearchTerm] = useState("");
  const [loadingTaco, setLoadingTaco] = useState(false); // ✅ Novo estado para loading TACO
  const [initialPrice, setInitialPrice] = useState(null); // Store initial price for comparison
  const [itemType, setItemType] = useState("ingrediente"); // ingrediente ou embalagem


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const loadSuppliers = async () => {
    try {
      const suppliersData = await Supplier.list();
      const activeSuppliers = Array.isArray(suppliersData) ? suppliersData.filter(s => s.active) : [];
      setSuppliers(activeSuppliers);

      // Criar opções para o combobox
      const supplierOptions = activeSuppliers.map(s => ({
        value: s.company_name || s.name,
        label: s.company_name || s.name,
        supplier_id: s.id,
        supplier_code: s.supplier_code || null
      }));
      setSupplierOptions(supplierOptions);
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: "Erro ao carregar fornecedores" });
    }
  };

  const loadBrands = async () => {
    try {
      const brandsData = await Brand.list();
      const activeBrands = Array.isArray(brandsData) ? brandsData.filter(b => b.active) : [];
      setBrands(activeBrands);

      // Criar opções para o combobox
      const brandOptions = activeBrands.map(b => ({
        value: b.name,
        label: b.name,
        brand_id: b.id,
        manufacturer: b.manufacturer
      }));
      setBrandOptions(brandOptions);
    } catch (err) {
    }
  };

  // ✅ OTIMIZAÇÃO: Lazy loading - só carrega quando necessário
  const loadTacoFoods = async () => {
    // Se já carregou, não carregar novamente
    if (tacoFoods.length > 0 || loadingTaco) return;

    try {
      setLoadingTaco(true);
      const tacoData = await NutritionFood.list();
      setTacoFoods(Array.isArray(tacoData) ? tacoData.filter(f => f.active) : []);
    } catch (err) {
      toast({ variant: "destructive", title: "Erro ao carregar TACO", description: err.message });
    } finally {
      setLoadingTaco(false);
    }
  };

  const loadCategories = async (forType = 'ingrediente') => {
    try {
      console.log(`🔍 Iniciando loadCategories para tipo: ${forType}`);
      const categoryTreeData = await CategoryTree.list();

      let filteredCats;

      if (forType === 'embalagem') {
        // Para embalagens, usar o novo tipo "embalagens" (aba separada)
        filteredCats = categoryTreeData.filter(cat =>
          cat.type === "embalagens" && cat.active
        );

        // Se não encontrar nenhuma, fallback
        if (filteredCats.length === 0) {
          setCategories(['Embalagem']);
          setCategoryOptions([{ value: 'Embalagem', label: 'Embalagem' }]);
          return;
        }
      } else {
        // Para ingredientes, filtrar tipo ingredientes
        filteredCats = categoryTreeData.filter(cat =>
          (cat.type === "ingredient" || cat.type === "ingredientes") && cat.active
        );
      }

      // 2. Encontrar categorias raiz (nível 1) e construir hierarquia como no BulkRecipeCreator
      const roots = filteredCats
        .filter(c => c.level === 1 || !c.parent_id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));

      // Função para achatar os descendentes de cada raiz
      const buildDescendants = (cats, parentId, prefix) => {
        let list = [];
        const children = cats
          .filter(c => c.parent_id === parentId)
          .sort((a, b) => (a.order || 0) - (b.order || 0));

        for (const child of children) {
          const label = `${prefix} > ${child.name}`;
          list.push({
            value: label,
            label: label,
            originalName: child.name,
            id: child.id
          });
          list = [...list, ...buildDescendants(cats, child.id, label)];
        }
        return list;
      };

      // Construir todas as opções
      let allOptions = [];
      for (const root of roots) {
        // O próprio raiz é uma opção
        allOptions.push({
          value: root.name,
          label: root.name,
          originalName: root.name,
          id: root.id,
          isRoot: true
        });
        // Adicionar descendentes
        allOptions = [...allOptions, ...buildDescendants(filteredCats, root.id, root.name)];
      }

      if (allOptions.length === 0) {
        console.warn("⚠️ Nenhuma categoria encontrada. Usando padrões.");
        if (forType === 'embalagem') {
          setCategories(['Embalagem']);
          setCategoryOptions([{ value: 'Embalagem', label: 'Embalagem' }]);
        } else {
          const defaultCategories = ['Laticínios', 'Carnes', 'Vegetais', 'Frutas', 'Grãos', 'Temperos', 'Massas', 'Molhos', 'Outros'];
          setCategories(defaultCategories);
          setCategoryOptions(defaultCategories.map(c => ({ value: c, label: c })));
        }
      } else {
        setCategories(allOptions.map(o => o.value));
        setCategoryOptions(allOptions);
      }

    } catch (err) {
      console.error("Erro ao carregar categorias:", err);
      if (forType === 'embalagem') {
        setCategories(['Embalagem']);
        setCategoryOptions([{ value: 'Embalagem', label: 'Embalagem' }]);
      } else {
        const defaultCategories = ['Laticínios', 'Carnes', 'Vegetais', 'Frutas', 'Grãos', 'Temperos', 'Massas', 'Molhos', 'Outros'];
        setCategories(defaultCategories);
        setCategoryOptions(defaultCategories.map(cat => ({ value: cat, label: cat })));
      }
    }
  };


  // FUNÇÃO para selecionar fornecedor
  const handleSupplierSelect = (selectedValue) => {
    const selectedSupplier = supplierOptions.find(s => s.value === selectedValue);

    if (selectedSupplier) {
      // Fornecedor existente - usar código do cadastro
      setFormData(prev => ({
        ...prev,
        main_supplier: selectedSupplier.value,
        supplier_id: selectedSupplier.supplier_id,
        supplier_code: selectedSupplier.supplier_code || ''
      }));
    } else {
      // Novo fornecedor (usuário digitou algo que não existe)
      setFormData(prev => ({
        ...prev,
        main_supplier: selectedValue,
        supplier_id: '',
        supplier_code: '' // Sem código pois não existe no cadastro
      }));
    }
    setOpenSupplierCombobox(false);
  };

  // FUNÇÃO para selecionar marca
  const handleBrandSelect = (selectedValue) => {
    const selectedBrand = brandOptions.find(b => b.value === selectedValue);

    if (selectedBrand) {
      // Marca existente
      setFormData(prev => ({
        ...prev,
        brand: selectedBrand.value,
        brand_id: selectedBrand.brand_id
      }));
    } else {
      // Nova marca
      setFormData(prev => ({
        ...prev,
        brand: selectedValue,
        brand_id: '' // Limpar ID pois é nova
      }));
    }
    setOpenBrandCombobox(false);
  };

  // FUNÇÃO para selecionar categoria
  const handleCategorySelect = (selectedValue) => {
    setFormData(prev => ({
      ...prev,
      category: selectedValue
    }));
    setOpenCategoryCombobox(false);
  };

  const resetFormForNewIngredient = () => {
    setFormData({
      name: "",
      commercial_name: "",
      unit: "kg",
      current_price: "",
      base_price: "",
      last_update: new Date().toISOString().split('T')[0],
      active: true,
      notes: "",
      main_supplier: "",
      supplier_id: "",
      supplier_code: "",
      brand: "",
      brand_id: "",
      category: "",
      current_stock: "0",
      min_stock: "",
      ingredient_type: "both",
      taco_variations: []
    });
    setIsEditing(false);
    setCurrentIngredientId(null);
  };

  const loadIngredient = async (id) => {
    try {
      setLoading(true);
      setError(null);

      // Validar ID antes de buscar
      if (!id || id.trim() === '' || id === 'undefined' || id === 'null') {
        console.error('❌ ID inválido detectado:', id);
        setError("ID do ingrediente é inválido. Este item pode ter sido deletado ou está corrompido.");
        toast({
          variant: "destructive",
          title: "Erro ao carregar ingrediente",
          description: "O ingrediente que você tentou editar não existe mais ou está com ID inválido.",
        });
        setTimeout(() => router.push(itemType === 'embalagem' ? '/ingredientes?tab=embalagens' : '/ingredientes'), 2000);
        return;
      }

      const ingredient = await Ingredient.get(id);

      if (!ingredient) {
        setError("Ingrediente não encontrado no banco de dados. Ele pode ter sido deletado.");
        toast({
          variant: "destructive",
          title: "Ingrediente não encontrado",
          description: "O ingrediente que você tentou editar não existe mais no banco de dados. Retornando para a lista...",
        });
        setTimeout(() => router.push(itemType === 'embalagem' ? '/ingredientes?tab=embalagens' : '/ingredientes'), 2000);
        return;
      }

      const safeString = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined')) return '';
        return String(value).trim();
      };

      const safeNumber = (value) => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.toLowerCase() === 'null' || value.toLowerCase() === 'undefined' || value.trim() === '')) return '';
        const num = parseFloat(value);
        return isNaN(num) ? '' : num.toString();
      };

      const mappedData = {
        name: safeString(ingredient.name),
        unit: ingredient.unit || 'kg',
        current_price: safeNumber(ingredient.current_price),
        last_update: ingredient.last_update || new Date().toISOString().split('T')[0],
        active: ingredient.active !== false,
        notes: safeString(ingredient.notes),
        main_supplier: safeString(ingredient.main_supplier),
        supplier_id: safeString(ingredient.supplier_id),
        supplier_code: safeString(ingredient.supplier_code),
        brand: safeString(ingredient.brand),
        brand_id: safeString(ingredient.brand_id),
        category: safeString(ingredient.category),
        current_stock: safeNumber(ingredient.current_stock),
        min_stock: safeNumber(ingredient.min_stock),
        taco_id: safeString(ingredient.taco_id),
        taco_variations: Array.isArray(ingredient.taco_variations) ? ingredient.taco_variations : [],
        ingredient_type: ingredient.ingredient_type || 'both'
      };

      setFormData(mappedData);
      setInitialPrice(safeNumber(ingredient.current_price)); // Set initial price
      setCurrentIngredientId(id);

    } catch (err) {
      setError('Erro ao carregar ingrediente: ' + err.message);
      router.push('/ingredienteditor?id=new');
      resetFormForNewIngredient();
    } finally {
      setLoading(false);
    }
  };

  // Função para adicionar variação TACO
  const addTacoVariation = (tacoFood, variationName = "Cru", lossPercentage = 0) => {
    const newVariation = {
      taco_id: tacoFood.id,
      taco_name: tacoFood.name,
      variation_name: variationName,
      loss_percentage: lossPercentage,
      calculated_price: formData.current_price ? parseFloat(formData.current_price) / (1 - lossPercentage / 100) : 0,
      is_base: formData.taco_variations.length === 0, // Primeira variação é base
      active: true
    };

    const updatedVariations = [...formData.taco_variations, newVariation];

    setFormData(prev => ({
      ...prev,
      taco_variations: updatedVariations,
      // 🎯 AUTO-PREENCHIMENTO DA CATEGORIA baseado na TACO
      category: tacoFood.category_name || prev.category
    }));

    // Toast de sucesso
    toast({
      title: "Variação TACO adicionada",
      description: `${tacoFood.name} (${variationName}) foi vinculado ao ingrediente. Categoria atualizada para "${tacoFood.category_name}".`
    });
  };

  // Função para remover variação TACO
  const removeTacoVariation = (index) => {
    const updatedVariations = formData.taco_variations.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      taco_variations: updatedVariations
    }));
  };

  // Verificar se categoria deve ser somente leitura
  const isCategoryReadOnly = formData.taco_variations.length > 0;

  // ✅ OTIMIZAÇÃO: Carregar dados essenciais primeiro, TACO sob demanda
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Obter ingredientId e type da URL usando window.location.search (client-side)
        const urlParams = new URLSearchParams(window.location.search);
        const ingredientId = urlParams.get('id');
        const typeParam = urlParams.get('type');

        // Definir tipo do item (ingrediente ou embalagem)
        const currentType = typeParam === 'embalagem' ? 'embalagem' : 'ingrediente';
        setItemType(currentType);

        // ✅ Carregar dados essenciais com tipo correto
        await Promise.all([
          loadSuppliers(),
          loadBrands(),
          loadCategories(currentType)
        ]);

        if (ingredientId && ingredientId !== 'new') {
          setIsEditing(true);
          await loadIngredient(ingredientId);
        } else {
          setIsEditing(false);
          resetFormForNewIngredient();
          // Para embalagens, pré-selecionar categoria Embalagem
          if (currentType === 'embalagem') {
            setFormData(prev => ({ ...prev, category: 'Embalagem' }));
          }
        }
      } catch (error) {
        setError('Erro ao carregar dados iniciais: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []); // ✅ Array vazio - carrega apenas uma vez ao montar

  // ✅ LAZY LOADING: Carregar TACO apenas quando usuário acessar aba TACO
  useEffect(() => {
    if (activeTab === 'taco') {
      loadTacoFoods();
    }
  }, [activeTab]);

  const handleSave = async (e) => {
    e.preventDefault();

    setError(null);
    if (!formData.name.trim()) {
      setError("Nome principal é obrigatório");
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const ingredientDataToSave = {
        name: formData.name,
        supplier_id: formData.supplier_id,
        main_supplier: formData.main_supplier,
        current_price: parseFloat(formData.current_price) || 0,
        brand: formData.brand,
        unit: formData.unit,
        current_stock: parseFloat(formData.current_stock) || 0,
        category: formData.category,
        notes: formData.notes,
        active: formData.active,
        last_update: formData.last_update || new Date().toISOString().split('T')[0],
        ingredient_type: formData.ingredient_type,
        min_stock: parseFloat(formData.min_stock) || 0,
        supplier_code: formData.supplier_code,
        brand_id: formData.brand_id,
        taco_variations: formData.taco_variations,
        item_type: itemType, // 'ingrediente' ou 'embalagem'
      };

      const itemLabel = itemType === 'embalagem' ? 'embalagem' : 'ingrediente';

      let result;
      if (isEditing && currentIngredientId) {
        // Atualizar item existente
        result = await Ingredient.update(currentIngredientId, ingredientDataToSave);
        toast({
          title: `${itemType === 'embalagem' ? 'Embalagem atualizada' : 'Ingrediente atualizado'}`,
          description: `${itemType === 'embalagem' ? 'A embalagem' : 'O ingrediente'} "${formData.name}" foi atualizado com sucesso.`
        });
      } else {
        // Criar novo ingrediente
        result = await Ingredient.create(ingredientDataToSave);

        // Criar histórico inicial para novo ingrediente (Opcional, mas bom para consistência)
        if (ingredientDataToSave.current_price > 0) {
          try {
            await PriceHistory.create({
              ingredient_id: result.id,
              old_price: 0,
              new_price: ingredientDataToSave.current_price,
              date: ingredientDataToSave.last_update,
              supplier: ingredientDataToSave.main_supplier,
              supplier_id: ingredientDataToSave.supplier_id || null,
              brand: ingredientDataToSave.brand,
              brand_id: ingredientDataToSave.brand_id || null,
              category: ingredientDataToSave.category,
              unit: ingredientDataToSave.unit,
              ingredient_name: ingredientDataToSave.name,
              change_type: 'initial_creation',
              change_source: 'ingredient_editor',
              user_id: 'mock-user-id',
              notes: 'Preço inicial no cadastro',
              timestamp: new Date().toISOString()
            });
          } catch (histError) {
            console.error("Erro ao criar histórico inicial:", histError);
          }
        }

        toast({
          title: itemType === 'embalagem' ? "Embalagem criada" : "Ingrediente criado",
          description: `${itemType === 'embalagem' ? 'A embalagem' : 'O ingrediente'} "${formData.name}" foi criado com sucesso.`
        });
      }

      // Check for price change and create history if editing
      if (isEditing && currentIngredientId) {
        const newPrice = parseFloat(formData.current_price) || 0;
        const oldPrice = parseFloat(initialPrice) || 0;

        if (Math.abs(newPrice - oldPrice) >= 0.01) {
          try {
            await PriceHistory.create({
              ingredient_id: currentIngredientId,
              old_price: oldPrice,
              new_price: newPrice,
              date: formData.last_update,
              supplier: formData.main_supplier,
              supplier_id: formData.supplier_id || null,
              brand: formData.brand,
              brand_id: formData.brand_id || null,
              category: formData.category,
              unit: formData.unit,
              ingredient_name: formData.name,
              change_type: 'manual_update',
              change_source: 'ingredient_editor',
              user_id: 'mock-user-id', // Should be dynamic in real app
              notes: formData.notes || `Atualização de preço no editor: ${oldPrice.toFixed(2)} -> ${newPrice.toFixed(2)}`,
              timestamp: new Date().toISOString()
            });
          } catch (histError) {
            console.error("Erro ao salvar histórico de preço:", histError);
            // Don't block the main flow if history fails, but maybe warn?
            // For now, just log.
          }
        }
      }

      // Redirecionar para a lista com a aba correta
      const tabParam = itemType === 'embalagem' ? '?tab=embalagens' : '';
      router.push(`/ingredientes${tabParam}`);

    } catch (err) {
      setError(err.message || "Erro desconhecido ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="text-center max-w-md">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600 mx-auto mb-4"></div>
            <Package className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {isEditing ? 'Carregando ingrediente' : 'Preparando formulário'}
          </h3>
          <p className="text-sm text-gray-600">
            Carregando fornecedores, marcas e categorias...
          </p>
        </div>
      </div>
    );
  }

  const filteredTacoFoods = tacoFoods.filter(food =>
    food.name.toLowerCase().includes(tacoSearchTerm.toLowerCase()) ||
    food.description.toLowerCase().includes(tacoSearchTerm.toLowerCase())
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <Button
            variant="outline"
            onClick={() => router.push(itemType === 'embalagem' ? '/ingredientes?tab=embalagens' : '/ingredientes')}
            size="sm"
            className="h-8 text-xs border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <ArrowLeft className="w-3 h-3 mr-2" />
            Voltar
          </Button>
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {isEditing
              ? `Editar ${itemType === 'embalagem' ? 'Embalagem' : 'Ingrediente'}: ${formData.name}`
              : itemType === 'embalagem' ? 'Nova Embalagem' : 'Novo Ingrediente'
            }
          </h1>
          <p className="text-gray-600 mt-1 text-xs">
            {itemType === 'embalagem'
              ? 'Gerencie os detalhes da sua embalagem.'
              : 'Gerencie os detalhes do seu ingrediente consolidado.'
            }
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive" className="mb-4 py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      {/* Formulário principal */}
      <form onSubmit={handleSave} className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {itemType !== 'embalagem' && (
            <TabsList className="grid w-full grid-cols-3 mb-4 h-9 bg-gradient-to-r from-slate-100 to-slate-50">
              <TabsTrigger value="general" className="flex items-center gap-2 text-xs h-7 data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white data-[state=active]:shadow-md">
                <CircleCheckBig className="h-3 w-3" />
                <span className="hidden sm:inline">Dados Gerais</span>
                <span className="sm:hidden">Dados</span>
              </TabsTrigger>

              <TabsTrigger value="taco" className="flex items-center gap-2 text-xs h-7 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md">
                <Package className="h-3 w-3" />
                <span className="hidden sm:inline">Variações TACO</span>
                <span className="sm:hidden">TACO</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2 text-xs h-7 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-md">
                <Eye className="h-3 w-3" />
                Preview
              </TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="general" className="space-y-4 mt-0">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label htmlFor="name" className="text-xs font-medium">Nome Principal *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={itemType === 'embalagem' ? 'Ex: Marmita 750ml' : 'Ex: Muçarela'}
                    required
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Fornecedor e Categoria */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* Fornecedor Principal - Combobox Inteligente */}
                <div>
                  <Label className="text-xs font-medium">Fornecedor Principal</Label>
                  <Popover open={openSupplierCombobox} onOpenChange={setOpenSupplierCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openSupplierCombobox}
                        className="w-full justify-between mt-1 h-8 text-sm"
                      >
                        <span className="truncate">
                          {formData.main_supplier || "Selecione um fornecedor"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar..." className="h-8 text-xs" />
                        <CommandEmpty>
                          <div className="py-2 text-center text-xs text-muted-foreground">
                            Nenhum fornecedor encontrado.
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {supplierOptions.map((supplier) => (
                            <CommandItem
                              key={supplier.value}
                              value={supplier.value}
                              onSelect={handleSupplierSelect}
                              className="cursor-pointer text-xs"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 w-3",
                                  formData.main_supplier === supplier.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <span className="truncate">{supplier.label}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Categoria - Combobox Inteligente (ReadOnly se TACO) */}
                <div>
                  <Label className="text-xs font-medium flex items-center gap-2">
                    Categoria
                    {isCategoryReadOnly && <Badge variant="secondary" className="text-[10px] px-1 h-4">Auto (TACO)</Badge>}
                  </Label>
                  {isCategoryReadOnly ? (
                    <div className="mt-1">
                      <Input
                        value={formData.category}
                        readOnly
                        className="bg-gray-100 h-8 text-sm"
                        placeholder="Categoria será preenchida..."
                      />
                    </div>
                  ) : (
                    <Popover open={openCategoryCombobox} onOpenChange={setOpenCategoryCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCategoryCombobox}
                          className="w-full justify-between mt-1 h-8 text-sm"
                        >
                          <span className="truncate">
                            {formData.category || "Selecione uma categoria"}
                          </span>
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Buscar..." className="h-8 text-xs" />
                          <CommandEmpty>
                            <div className="py-2 text-center text-xs text-muted-foreground">
                              Nenhuma categoria encontrada.
                            </div>
                          </CommandEmpty>
                          <CommandGroup className="max-h-[200px] overflow-auto">
                            {categoryOptions.map((category) => (
                              <CommandItem
                                key={category.value}
                                value={category.value}
                                onSelect={handleCategorySelect}
                                className="cursor-pointer text-xs"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-3 w-3",
                                    formData.category === category.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {category.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>

              {/* Unidade, Preços */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium">Unidade de Compra *</Label>
                  <Select
                    value={formData.unit}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, unit: value }))}
                  >
                    <SelectTrigger className="mt-1 h-8 text-sm">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Quilograma (kg)</SelectItem>
                      <SelectItem value="g">Grama (g)</SelectItem>
                      <SelectItem value="l">Litro (l)</SelectItem>
                      <SelectItem value="ml">Mililitro (ml)</SelectItem>
                      <SelectItem value="unidade">Unidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="current_price" className="text-xs font-medium">Preço Atual (R$)</Label>
                  <Input
                    id="current_price"
                    name="current_price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.current_price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Marca, Código Fornecedor, Data */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Marca - Combobox Inteligente */}
                <div>
                  <Label className="text-xs font-medium">Marca</Label>
                  <Popover open={openBrandCombobox} onOpenChange={setOpenBrandCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openBrandCombobox}
                        className="w-full justify-between mt-1 h-8 text-sm"
                      >
                        <span className="truncate">
                          {formData.brand || "Selecione uma marca"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar..." className="h-8 text-xs" />
                        <CommandEmpty>
                          <div className="py-2 text-center text-xs text-muted-foreground">
                            Nenhuma marca encontrada.
                            <p className="text-xs text-muted-foreground mt-1">
                              Digite para criar uma nova marca
                            </p>
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-auto">
                          {brandOptions.map((brand) => (
                            <CommandItem
                              key={brand.value}
                              value={brand.value}
                              onSelect={handleBrandSelect}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.brand === brand.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {brand.label}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Código do Fornecedor - Somente Leitura (vem do cadastro) */}
                <div>
                  <Label htmlFor="supplier_code" className="text-xs font-medium">Código do Fornecedor</Label>
                  <Input
                    id="supplier_code"
                    name="supplier_code"
                    value={formData.supplier_code}
                    readOnly
                    placeholder="Definido no cadastro do fornecedor"
                    className="bg-gray-100 mt-1 h-8 text-sm cursor-not-allowed"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Este código vem do cadastro em "Fornecedores e Serviços"
                  </p>
                </div>

                <div>
                  <Label htmlFor="last_update" className="text-xs font-medium">Última Atualização</Label>
                  <Input
                    id="last_update"
                    name="last_update"
                    type="date"
                    value={formData.last_update}
                    onChange={handleInputChange}
                    className="mt-1 h-8 text-sm"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <Label htmlFor="notes" className="text-xs font-medium">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Observações sobre o ingrediente"
                  rows={2}
                  className="mt-1 resize-none text-xs"
                />
              </div>

              {/* Switch Ativo */}
              <div className="flex items-center space-x-3 p-3 rounded-lg border bg-gradient-to-r from-slate-50 to-white">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                  className={`scale-90 ${formData.active ? 'data-[state=checked]:bg-emerald-500' : 'data-[state=unchecked]:bg-gray-300'}`}
                />
                <div className="flex flex-col">
                  <Label htmlFor="active" className="text-xs font-medium cursor-pointer">
                    Ingrediente ativo
                  </Label>
                  <span className={`text-[10px] font-medium ${formData.active ? 'text-emerald-600' : 'text-gray-400'}`}>
                    {formData.active ? '✓ Visível no sistema' : '✗ Oculto do sistema'}
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="taco" className="space-y-4 mt-0">
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base">Vincular Alimentos TACO</CardTitle>
                <p className="text-xs text-gray-600">
                  Vincule alimentos da tabela TACO para cálculo nutricional automático.
                </p>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4">
                {/* ✅ Loading state para TACO */}
                {loadingTaco ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 mx-auto mb-3"></div>
                      <p className="text-sm text-gray-600">Carregando alimentos TACO...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Busca de alimentos TACO */}
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar alimentos TACO..."
                        value={tacoSearchTerm}
                        onChange={(e) => setTacoSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </>
                )}

                {/* Lista de alimentos TACO para adicionar */}
                {!loadingTaco && tacoSearchTerm && (
                  <div className="max-h-40 overflow-y-auto border rounded-lg">
                    {filteredTacoFoods.slice(0, 5).map(food => (
                      <div key={food.id} className="p-3 border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() => addTacoVariation(food)}>
                        <div className="font-medium">{food.name}</div>
                        <div className="text-sm text-gray-500">{food.description}</div>
                        <Badge variant="outline" className="mt-1">{food.category_name}</Badge>
                      </div>
                    ))}
                    {filteredTacoFoods.length === 0 && (
                      <div className="p-3 text-sm text-gray-500 text-center">Nenhum alimento TACO encontrado.</div>
                    )}
                  </div>
                )}

                {/* Variações TACO vinculadas */}
                {!loadingTaco && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Variações Vinculadas</Label>
                    {formData.taco_variations.length === 0 ? (
                      <p className="text-sm text-gray-500">Nenhuma variação TACO vinculada ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {formData.taco_variations.map((variation, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{variation.taco_name}</div>
                              <div className="text-sm text-gray-500">
                                Variação: {variation.variation_name} | Perda: {variation.loss_percentage}%
                              </div>
                              {variation.is_base && <Badge variant="outline" className="mt-1 text-gray-700">Base</Badge>}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTacoVariation(index)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 mt-0">
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-base">Preview do Ingrediente</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Nome</Label>
                    <p className="font-medium">{formData.name || "Não informado"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Categoria</Label>
                    <p className="font-medium">{formData.category || "Não informado"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Fornecedor</Label>
                    <p className="font-medium truncate">{formData.main_supplier || "Não informado"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Preço Atual</Label>
                    <p className="font-medium">R$ {formData.current_price || "0,00"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Variações TACO</Label>
                    <p className="font-medium">{formData.taco_variations.length} vinculada(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Botões de ação */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(itemType === 'embalagem' ? '/ingredientes?tab=embalagens' : '/ingredientes')}
            className="w-full sm:w-auto h-8 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={saving || loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 w-full sm:w-auto h-8 text-xs shadow-md hover:shadow-lg transition-all"
          >
            {saving ? "Salvando..." : (isEditing
              ? (itemType === 'embalagem' ? "Atualizar Embalagem" : "Atualizar Ingrediente")
              : (itemType === 'embalagem' ? "Criar Embalagem" : "Criar Ingrediente")
            )}
          </Button>
        </div>
      </form >
    </div >
  );
}

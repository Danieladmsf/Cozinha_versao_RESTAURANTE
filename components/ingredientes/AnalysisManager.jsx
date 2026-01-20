
import React, { useState, useEffect, useCallback } from "react";
import { Ingredient, PriceHistory, Category } from "@/app/api/entities";
import { Supplier } from "@/app/api/entities";
import { Brand } from "@/app/api/entities";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingDown,
  TrendingUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  Download,
  FileText,
  FileSpreadsheet,
  LineChart,
  Star,
  Filter,
  Eye,
  EyeOff,
  Search,
  Folder,
  Check,
  ChevronsUpDown,
  X,
  Plus,
  Package,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { format, subDays, parseISO, differenceInDays, startOfMonth, endOfMonth, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover, PopoverContent, PopoverTrigger
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar
} from "recharts";
import { Label } from "@/components/ui/label";
import DatePicker from "@/components/ui/date-picker";
import { useToast } from "@/components/ui/use-toast";
import { Switch } from "@/components/ui/switch";

export default function AnalysisManager() {
  const [ingredients, setIngredients] = useState([]);
  const [filteredIngredients, setFilteredIngredients] = useState([]);
  const [priceHistory, setPriceHistory] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 365),
    end: new Date()
  });
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("cards");
  const [itemType, setItemType] = useState("ingrediente");
  const [suppliers, setSuppliers] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedIngredient, setSelectedIngredient] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState("line");
  const [chartStyle, setChartStyle] = useState("default");
  const [expandedHistories, setExpandedHistories] = useState(new Set());
  const { toast } = useToast();

  // State for Chart Comparison
  const [selectedComparisonIds, setSelectedComparisonIds] = useState([]);
  const [openCombobox, setOpenCombobox] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ingredientsData, historyData, categoriesData, suppliersData, brandsData] = await Promise.all([
        Ingredient.list(),
        PriceHistory.list(),
        Category.list(),
        Supplier.list(),
        Brand.list()
      ]);

      setPriceHistory(historyData || []);
      setIngredients((ingredientsData || []).filter(ingredient => ingredient && ingredient.active !== false));

      if (historyData && historyData.length > 0) {
        try {
          const dates = historyData
            .map(h => new Date(h.date + 'T00:00:00'))
            .filter(date => !isNaN(date.getTime()))
            .sort((a, b) => a.getTime() - b.getTime());

          if (dates.length > 0) {
            setDateRange({ start: dates[0], end: dates[dates.length - 1] });
          }
        } catch (error) { }
      }

      setCategories((categoriesData || [])
        .filter(cat => cat && cat.type === "ingredient" && cat.active !== false)
        .map(cat => ({ value: cat.name || '', label: cat.name || '' }))
        .filter(cat => cat.value)
        .sort((a, b) => a.label.localeCompare(b.label))
      );

      // CORREÇÃO: Carregar fornecedores do histórico de preços
      const uniqueSuppliers = [...new Set(
        (historyData || [])
          .map(h => h.supplier)
          .filter(Boolean)
      )].sort().map(s => ({ value: s, label: s })); setSuppliers(uniqueSuppliers);

      // CORREÇÃO: Carregar marcas de MÚLTIPLAS fontes
      const brandsFromHistory = [...new Set(
        (historyData || [])
          .map(h => h.brand)
          .filter(Boolean) // Remove valores null/undefined/vazios
      )];

      const brandsFromIngredients = [...new Set(
        (ingredientsData || [])
          .map(ing => ing.brand)
          .filter(Boolean) // Remove valores null/undefined/vazios
      )];

      const brandsFromBrandEntity = (brandsData || [])
        .filter(brand => brand && brand.active && brand.name)
        .map(brand => brand.name);

      // Combinar todas as fontes de marcas e remover duplicatas
      const allUniqueBrands = [...new Set([
        ...brandsFromHistory,
        ...brandsFromIngredients,
        ...brandsFromBrandEntity
      ])].sort().map(b => ({ value: b, label: b })); setBrands(allUniqueBrands);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Process ingredients with history analysis
  useEffect(() => {
    if (loading) return;// Filter history by period, supplier and brand
    const historyFilteredByPeriodSupplierBrand = priceHistory.filter(record => {
      try {
        const recordDate = new Date(record.date + 'T00:00:00');
        const isInDateRange = recordDate >= dateRange.start && recordDate <= dateRange.end;
        const supplierMatch = selectedSupplier === "all" || record.supplier === selectedSupplier;
        let brandMatch = true;
        if (selectedBrand !== "all") {
          brandMatch = record.brand && record.brand === selectedBrand;
        }
        return isInDateRange && supplierMatch && brandMatch;
      } catch (e) {
        return false;
      }
    });

    // Create indices for history search
    const historyByIngredientId = {};
    const historyByIngredientName = {};

    historyFilteredByPeriodSupplierBrand.forEach(historyRecord => {
      if (!historyRecord) return;

      if (historyRecord.ingredient_id) {
        if (!historyByIngredientId[historyRecord.ingredient_id]) {
          historyByIngredientId[historyRecord.ingredient_id] = [];
        }
        historyByIngredientId[historyRecord.ingredient_id].push(historyRecord);
      }

      if (historyRecord.ingredient_name) {
        const normalizedName = historyRecord.ingredient_name.toLowerCase().trim();
        if (!historyByIngredientName[normalizedName]) {
          historyByIngredientName[normalizedName] = [];
        }
        historyByIngredientName[normalizedName].push(historyRecord);
      }
    });

    // Filter ingredients by category
    let ingredientsFilteredByCategory = ingredients;
    if (selectedCategory !== "all") {
      ingredientsFilteredByCategory = ingredientsFilteredByCategory.filter(ing => ing.category === selectedCategory);
    }

    // Filter by Item Type (Ingrediente vs Embalagem)
    ingredientsFilteredByCategory = ingredientsFilteredByCategory.filter(ing => {
      if (itemType === 'embalagem') {
        return ing.item_type === 'embalagem';
      }
      return ing.item_type !== 'embalagem';
    });

    // Filter by Search Term
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      ingredientsFilteredByCategory = ingredientsFilteredByCategory.filter(ing =>
        ing.name?.toLowerCase().includes(lowerTerm)
      );
    }

    // Filter ingredients by history filters
    let ingredientsFilteredByHistory = ingredientsFilteredByCategory;

    if (selectedSupplier !== "all") {
      const ingredientIdsWithSupplier = new Set();
      const ingredientNamesWithSupplier = new Set();

      historyFilteredByPeriodSupplierBrand
        .filter(record => record.supplier === selectedSupplier)
        .forEach(record => {
          if (record.ingredient_id) ingredientIdsWithSupplier.add(record.ingredient_id);
          if (record.ingredient_name) ingredientNamesWithSupplier.add(record.ingredient_name.toLowerCase().trim());
        });

      ingredientsFilteredByHistory = ingredientsFilteredByHistory.filter(ingredient => {
        if (ingredient.id && ingredientIdsWithSupplier.has(ingredient.id)) return true;
        if (ingredient.name) {
          const normalizedName = ingredient.name.toLowerCase().trim();
          if (ingredientNamesWithSupplier.has(normalizedName)) return true;
        }
        if (ingredient.main_supplier === selectedSupplier) return true;
        return false;
      });
    }

    if (selectedBrand !== "all") {
      const ingredientIdsWithBrand = new Set();
      const ingredientNamesWithBrand = new Set();

      historyFilteredByPeriodSupplierBrand
        .filter(record => record.brand === selectedBrand)
        .forEach(record => {
          if (record.ingredient_id) ingredientIdsWithBrand.add(record.ingredient_id);
          if (record.ingredient_name) ingredientNamesWithBrand.add(record.ingredient_name.toLowerCase().trim());
        });

      ingredientsFilteredByHistory = ingredientsFilteredByHistory.filter(ingredient => {
        if (ingredient.id && ingredientIdsWithBrand.has(ingredient.id)) return true;
        if (ingredient.name) {
          const normalizedName = ingredient.name.toLowerCase().trim();
          if (ingredientNamesWithBrand.has(normalizedName)) return true;
        }
        if (ingredient.brand === selectedBrand) return true;
        return false;
      });
    }

    // Process each ingredient with analysis
    const processedIngredients = ingredientsFilteredByHistory.map(ingredient => {
      let historyForIngredient = [];

      // Search history by ID
      if (ingredient.id && historyByIngredientId[ingredient.id]) {
        historyForIngredient = historyByIngredientId[ingredient.id];
      }

      // Search by name if not found by ID
      if (historyForIngredient.length === 0 && ingredient.name) {
        const normalizedIngredientName = ingredient.name.toLowerCase().trim();
        if (historyByIngredientName[normalizedIngredientName]) {
          historyForIngredient = historyByIngredientName[normalizedIngredientName];
        }
      }

      // Additional search by name similarity
      if (historyForIngredient.length === 0 && ingredient.name) {
        const normalizedIngredientName = ingredient.name.toLowerCase().trim();

        const similarNameHistory = historyFilteredByPeriodSupplierBrand.filter(record => {
          if (!record.ingredient_name) return false;
          const normalizedRecordName = record.ingredient_name.toLowerCase().trim();

          return normalizedRecordName.includes(normalizedIngredientName) ||
            normalizedIngredientName.includes(normalizedRecordName);
        });

        if (similarNameHistory.length > 0) {
          historyForIngredient = similarNameHistory;
        }
      }

      // Sort history by date (most recent first)
      const sortedHistory = [...historyForIngredient].sort((a, b) => {
        try {
          return new Date(b.date + 'T00:00:00').getTime() - new Date(a.date + 'T00:00:00').getTime();
        } catch (e) {
          return 0;
        }
      });

      // Calculate statistics
      let lastVariationDisplay = 'Sem histórico';
      let lastVariationValue = 0;
      let bestSupplierName = 'Não disponível';
      let bestSupplierPrice = null;
      let volatility = 0;
      let currentPrice = ingredient.current_price;

      if (sortedHistory.length > 0) {
        currentPrice = parseFloat(sortedHistory[0].new_price) || ingredient.current_price;

        if (sortedHistory.length >= 2) {
          const lastPrice = parseFloat(sortedHistory[0].new_price) || 0;
          const prevPrice = parseFloat(sortedHistory[1].new_price) || 0;
          if (prevPrice > 0) {
            const change = ((lastPrice - prevPrice) / prevPrice) * 100;
            lastVariationValue = change;
            lastVariationDisplay = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
          } else {
            lastVariationDisplay = 'Primeiro registro';
          }
        } else {
          lastVariationDisplay = 'Apenas 1 registro';
        }

        // Calculate best supplier
        const supplierPrices = {};
        sortedHistory.forEach(r => {
          if (r.supplier && r.new_price != null) {
            if (!supplierPrices[r.supplier]) supplierPrices[r.supplier] = [];
            supplierPrices[r.supplier].push(parseFloat(r.new_price));
          }
        });

        if (Object.keys(supplierPrices).length > 0) {
          let minAvgPrice = Infinity;
          Object.keys(supplierPrices).forEach(s => {
            const avg = supplierPrices[s].reduce((a, b) => a + b, 0) / supplierPrices[s].length;
            if (avg < minAvgPrice) {
              minAvgPrice = avg;
              bestSupplierName = s;
            }
          });
          bestSupplierPrice = minAvgPrice;
        }

        // Calculate volatility
        if (sortedHistory.length > 1) {
          const prices = sortedHistory.map(h => parseFloat(h.new_price)).filter(p => !isNaN(p));
          if (prices.length > 1) {
            const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
            if (avg > 0) {
              const variance = prices.reduce((acc, p) => acc + Math.pow(p - avg, 2), 0) / prices.length;
              volatility = (Math.sqrt(variance) / avg) * 100;
            }
          }
        }
      }

      return {
        ...ingredient,
        last_variation_display: lastVariationDisplay,
        last_variation_value: lastVariationValue,
        best_supplier_name: bestSupplierName,
        best_supplier_price: bestSupplierPrice,
        volatility: volatility,
        history: sortedHistory,
        has_history: sortedHistory.length > 0,
        current_price: currentPrice,
        history_count: sortedHistory.length
      };
    });

    setFilteredIngredients(processedIngredients);

  }, [ingredients, priceHistory, dateRange, selectedCategory, selectedSupplier, selectedBrand, loading, itemType, searchTerm]);


  // Preparar dados para o gráfico
  const chartData = React.useMemo(() => {
    // Determine source ingredients: Comparison (priority) or Filtered
    const isComparisonMode = selectedComparisonIds.length > 0;
    let sourceIngredients = isComparisonMode
      ? ingredients.filter(i => selectedComparisonIds.includes(i.id))
      : filteredIngredients;

    if (!sourceIngredients || sourceIngredients.length === 0) return [];

    // 1. Coletar todas as datas de histórico disponíveis
    const allDates = new Set();
    sourceIngredients.forEach(ing => {
      if (ing.history) {
        ing.history.forEach(h => {
          if (h.date) allDates.add(h.date);
        });
      }
    });

    if (allDates.size === 0) return [];

    const sortedDates = Array.from(allDates).sort();

    // Se temos muitos ingredientes E NÃO estamos em modo manual, calcular apenas a média
    if (!isComparisonMode && sourceIngredients.length > 10) {
      return sortedDates.map(date => {
        let total = 0;
        let count = 0;

        filteredIngredients.forEach(ing => {
          const history = ing.history || [];
          // Encontrar o preço vigente (o mais recente <= date)
          // Assumindo history ordenado DESC (novo -> antigo)
          const effectiveRecord = history.find(h => h.date <= date);

          if (effectiveRecord) {
            total += parseFloat(effectiveRecord.new_price || 0);
            count++;
          }
        });

        return {
          date,
          displayDate: format(parseISO(date), 'dd/MM'),
          avgPrice: count > 0 ? (total / count).toFixed(2) : 0
        };
      });
    }

    // Se temos poucos ingredientes, mostrar linhas individuais
    return sortedDates.map(date => {
      const point = {
        date,
        displayDate: format(parseISO(date), 'dd/MM')
      };

      sourceIngredients.forEach(ing => {
        const history = ing.history || [];
        const effectiveRecord = history.find(h => h.date <= date);

        if (effectiveRecord) {
          point[ing.name] = parseFloat(effectiveRecord.new_price || 0);
        } else {
          point[ing.name] = null;
        }
      });
      return point;
    });

  }, [filteredIngredients, ingredients, selectedComparisonIds]);

  const CHART_COLORS = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#9333ea', '#0891b2', '#db2777', '#4b5563', '#84cc16', '#6366f1'];

  const sortedIngredientsList = React.useMemo(() => {
    return [...ingredients].sort((a, b) => a.name.localeCompare(b.name));
  }, [ingredients]);

  // Export functions
  const exportToPDF = () => {
    window.print();
  };

  const exportToExcel = () => {
    const csvData = filteredIngredients.map(ing => ({
      Nome: `"${ing.name}"`, // Quote strings to avoid issues
      Categoria: `"${ing.category || ''}"`,
      'Preço Atual': (ing.current_price || 0).toFixed(2).replace('.', ','), // Format for PT-BR Excel
      'Variação (%)': (ing.last_variation_value || 0).toFixed(2).replace('.', ','),
      'Melhor Fornecedor': `"${ing.best_supplier_name !== 'Não disponível' ? ing.best_supplier_name : ''}"`,
      'Preço Melhor Fornecedor': ing.best_supplier_price ? ing.best_supplier_price.toFixed(2).replace('.', ',') : '',
      'Volatilidade (%)': (ing.volatility || 0).toFixed(2).replace('.', ','),
      'Registros': ing.history_count
    }));

    const headers = Object.keys(csvData[0]).join(';'); // Use semicolon for PT-BR
    const rows = csvData.map(row => Object.values(row).join(';'));

    const csvContent = [headers, ...rows].join('\n');

    // Add BOM for Excel to recognize UTF-8
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analise-precos-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para toggle do histórico expandido
  const toggleHistoryExpansion = (ingredientId) => {
    setExpandedHistories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  };

  // Render ingredient card
  const renderIngredientCard = (ingredient) => {
    const isHistoryExpanded = expandedHistories.has(ingredient.id);
    const historyToShow = isHistoryExpanded ? ingredient.history : ingredient.history?.slice(0, 3);

    return (
      <Card key={ingredient.id} className="hover:shadow-lg transition-shadow duration-200 bg-white border border-gray-200">
        <CardContent className="p-4">
          {/* Header do Card */}
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {ingredient.name}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {ingredient.category || 'Sem categoria'}
                </Badge>
                {ingredient.has_history && (
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                    {ingredient.history_count} registro{ingredient.history_count !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                R$ {(ingredient.current_price || 0).toFixed(2).replace('.', ',')}
              </div>
              <div className="text-sm text-gray-500">Preço atual</div>
            </div>
          </div>

          {/* Última Variação */}
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-700 mb-1">Última Variação</div>
            <div className={`text-lg font-semibold flex items-center gap-1 ${ingredient.last_variation_value > 0 ? 'text-red-600' :
              ingredient.last_variation_value < 0 ? 'text-green-600' : 'text-gray-500'
              }`}>
              {ingredient.last_variation_display === 'Sem histórico' ? (
                <span className="text-gray-400 text-sm">Sem histórico</span>
              ) : (
                <>
                  {ingredient.last_variation_value > 0 ? <TrendingUp className="w-4 h-4" /> :
                    ingredient.last_variation_value < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                  {ingredient.last_variation_display}
                </>
              )}
            </div>
          </div>

          {/* Volatilidade */}
          <div className="mb-3">
            <div className="text-sm font-medium text-gray-700 mb-1">Volatilidade</div>
            <div className={`text-lg font-semibold ${ingredient.volatility > 20 ? 'text-red-600' :
              ingredient.volatility > 10 ? 'text-yellow-600' : 'text-green-600'
              }`}>
              {ingredient.volatility.toFixed(1)}%
            </div>
          </div>

          {/* Melhor Fornecedor */}
          {ingredient.best_supplier_name !== 'Não disponível' && (
            <div className="pt-3 border-t border-gray-100">
              <div className="text-sm font-medium text-gray-700 mb-1">Melhor fornecedor:</div>
              <div className="text-sm">
                <div className="font-medium text-gray-900">{ingredient.best_supplier_name}</div>
                {ingredient.best_supplier_price && (
                  <div className="text-gray-600">
                    R$ {ingredient.best_supplier_price.toFixed(2).replace('.', ',')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Histórico Resumido/Completo */}
          {ingredient.has_history && ingredient.history && ingredient.history.length > 0 && (
            <div className="pt-3 border-t border-gray-100 mt-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium text-gray-700">Histórico Recente:</div>
                {ingredient.history.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleHistoryExpansion(ingredient.id)}
                    className="text-xs h-6 px-2 text-blue-600 hover:text-blue-800"
                  >
                    {isHistoryExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Recolher
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Ver todos ({ingredient.history.length})
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="space-y-1 max-h-64 overflow-y-auto">
                {historyToShow?.map((historyRecord, index) => {
                  const recordDate = new Date(historyRecord.date + 'T00:00:00');
                  const formattedDate = format(recordDate, 'dd/MM/yyyy', { locale: ptBR });
                  const price = parseFloat(historyRecord.new_price) || 0;

                  return (
                    <div key={index} className="flex justify-between items-center text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-mono">{formattedDate}</span>
                        {historyRecord.supplier && (
                          <Badge variant="outline" className="text-xs py-0 px-1">
                            {historyRecord.supplier.length > 15 ?
                              historyRecord.supplier.substring(0, 15) + '...' :
                              historyRecord.supplier}
                          </Badge>
                        )}
                      </div>
                      <span className="font-medium font-mono">
                        R$ {price.toFixed(2).replace('.', ',')}
                      </span>
                    </div>
                  );
                })}
              </div>

              {!isHistoryExpanded && ingredient.history.length > 3 && (
                <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-100 mt-2">
                  + {ingredient.history.length - 3} registro{ingredient.history.length - 3 !== 1 ? 's' : ''} mais antigo{ingredient.history.length - 3 !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}

          {/* Indicador de sem histórico */}
          {!ingredient.has_history && (
            <div className="pt-3 border-t border-gray-100 mt-3">
              <div className="text-center text-sm text-gray-400 py-2">
                Nenhum histórico de preços disponível
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-700">Carregando análise...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Erro ao carregar dados: {error}</div>;

  return (
    <div className="space-y-6">

      {/* Item Type Tabs */}
      <Tabs value={itemType} onValueChange={setItemType} className="w-full">
        <TabsList className="w-full md:w-auto grid grid-cols-2 md:inline-flex bg-white p-1 rounded-lg shadow-sm border border-gray-200 gap-1 h-auto mb-8">
          <TabsTrigger
            value="ingrediente"
            className="md:w-[140px] data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md text-sm font-medium"
          >
            <Package className="w-4 h-4 mr-2" />
            Ingredientes
          </TabsTrigger>
          <TabsTrigger
            value="embalagem"
            className="md:w-[140px] data-[state=active]:bg-amber-500 data-[state=active]:text-white rounded-md text-sm font-medium"
          >
            <Package className="w-4 h-4 mr-2" />
            Embalagens
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Header da Análise */}


      {/* Filtros de Histórico */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <Label htmlFor="start-date" className="text-xs font-medium text-gray-700">Data inicial</Label>
            <DatePicker
              selected={dateRange.start}
              onChange={(date) => setDateRange(prev => ({ ...prev, start: date ? new Date(date + 'T12:00:00') : null }))}
              placeholder="Início"
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="end-date" className="text-xs font-medium text-gray-700">Data final</Label>
            <DatePicker
              selected={dateRange.end}
              onChange={(date) => setDateRange(prev => ({ ...prev, end: date ? new Date(date + 'T12:00:00') : null }))}
              placeholder="Fim"
              className="mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="supplier-filter" className="text-xs font-medium text-gray-700">
              Fornecedor
            </Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue placeholder="Fornecedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {suppliers.sort((a, b) => a.label.localeCompare(b.label)).map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="brand-filter" className="text-xs font-medium text-gray-700">
              Marca
            </Label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="mt-1 h-8 text-sm">
                <SelectValue placeholder="Marca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {brands.length > 0 ? (
                  brands.sort((a, b) => a.label.localeCompare(b.label)).map(b => (
                    <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-brands" disabled>
                    Nenhuma
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full gap-2 h-8 text-xs bg-slate-50 border-slate-200">
                  <Download className="h-3 w-3" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToPDF} className="cursor-pointer text-xs">
                  <FileText className="h-3 w-3 mr-2" />
                  PDF (Imprimir)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToExcel} className="cursor-pointer text-xs">
                  <FileSpreadsheet className="h-3 w-3 mr-2" />
                  Excel (CSV)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Resumo de resultados */}
      {/* Resumo de resultados e Busca */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 px-1">
        <div className="relative w-full md:w-[300px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9"
          />
        </div>

        <div className="text-sm text-gray-600">
          Mostrando {filteredIngredients.length} ingrediente{filteredIngredients.length !== 1 ? 's' : ''}
          {filteredIngredients.filter(ing => ing.has_history).length > 0 && (
            <span className="ml-2">
              ({filteredIngredients.filter(ing => ing.has_history).length} com histórico)
            </span>
          )}
        </div>
      </div>

      {/* Visualizações */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-white border border-gray-200 rounded-lg p-1">
          <TabsTrigger
            value="cards"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <Eye className="w-4 h-4 mr-2" />
            Cards
          </TabsTrigger>
          <TabsTrigger
            value="table"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Tabela
          </TabsTrigger>
          <TabsTrigger
            value="chart"
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all duration-200"
          >
            <LineChart className="w-4 h-4 mr-2" />
            Gráfico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cards" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIngredients.map(renderIngredientCard)}
          </div>
          {filteredIngredients.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <BarChart3 className="w-16 h-16 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum ingrediente encontrado</h3>
              <p className="text-gray-600">Ajuste os filtros para ver mais resultados.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-6">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Preço Atual</TableHead>
                      <TableHead>Última Variação</TableHead>
                      <TableHead>Melhor Fornecedor</TableHead>
                      <TableHead className="text-right">Volatilidade</TableHead>
                      <TableHead className="text-center">Registros</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIngredients.map((ingredient) => (
                      <TableRow key={ingredient.id}>
                        <TableCell className="font-medium">{ingredient.name}</TableCell>
                        <TableCell>{ingredient.category || 'N/A'}</TableCell>
                        <TableCell className="text-right font-mono">
                          R$ {(ingredient.current_price || 0).toFixed(2).replace('.', ',')}
                        </TableCell>
                        <TableCell>
                          {ingredient.last_variation_display === 'Sem histórico' ? (
                            <span className="text-gray-400">Sem histórico</span>
                          ) : (
                            <div className={`flex items-center gap-1 ${ingredient.last_variation_value > 0 ? 'text-red-600' :
                              ingredient.last_variation_value < 0 ? 'text-green-600' : 'text-gray-500'
                              }`}>
                              {ingredient.last_variation_value > 0 ? <TrendingUp className="w-4 h-4" /> :
                                ingredient.last_variation_value < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                              {ingredient.last_variation_display}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            {ingredient.best_supplier_name !== 'Não disponível' ? (
                              <>
                                <div className="font-medium">{ingredient.best_supplier_name}</div>
                                {ingredient.best_supplier_price && (
                                  <div className="text-sm text-gray-500">
                                    R$ {ingredient.best_supplier_price.toFixed(2).replace('.', ',')}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">Não disponível</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={`font-medium ${ingredient.volatility > 20 ? 'text-red-600' :
                            ingredient.volatility > 10 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                            {ingredient.volatility.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{ingredient.history_count}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="chart" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <CardTitle>
                    {selectedComparisonIds.length > 0
                      ? 'Comparação Personalizada'
                      : (filteredIngredients.length > 10
                        ? 'Média Geral de Preços'
                        : 'Evolução de Preços por Ingrediente')}
                  </CardTitle>
                  <CardDescription>
                    {selectedComparisonIds.length > 0
                      ? 'Comparando a evolução de preços dos ingredientes selecionados.'
                      : (filteredIngredients.length > 10
                        ? 'Exibindo média geral. Use a busca ao lado para comparar itens específicos.'
                        : 'Filtre por fornecedor ou use a busca para personalizar.')}
                  </CardDescription>
                </div>

                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                  {/* Toolbar de Comparação */}
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCombobox}
                          className="w-[250px] justify-between"
                        >
                          <span className="truncate">Confirmar ou buscar ingrediente...</span>
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[250px] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar ingrediente..." />
                          <CommandList>
                            <CommandEmpty>Nenhum ingrediente encontrado.</CommandEmpty>
                            <CommandGroup>
                              {sortedIngredientsList.map((ingredient) => (
                                <CommandItem
                                  key={ingredient.id}
                                  value={ingredient.name}
                                  onSelect={() => {
                                    if (!selectedComparisonIds.includes(ingredient.id)) {
                                      setSelectedComparisonIds([...selectedComparisonIds, ingredient.id]);
                                    }
                                    setOpenCombobox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedComparisonIds.includes(ingredient.id) ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {ingredient.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {selectedComparisonIds.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedComparisonIds([])}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        Limpar
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tags de Seleção */}
              {selectedComparisonIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedComparisonIds.map(id => {
                    const ing = ingredients.find(i => i.id === id);
                    if (!ing) return null;
                    return (
                      <Badge key={id} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                        {ing.name}
                        <button
                          onClick={() => setSelectedComparisonIds(selectedComparisonIds.filter(x => x !== id))}
                          className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

            </CardHeader>
            <CardContent className="h-[400px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="displayDate"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(value) => `R$ ${value}`}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value) => [`R$ ${parseFloat(value).toFixed(2)}`, 'Preço']}
                      labelFormatter={(label) => `Data: ${label}`}
                    />
                    <Legend />
                    {(!selectedComparisonIds.length && filteredIngredients.length > 10) ? (
                      <Line
                        type="monotone"
                        dataKey="avgPrice"
                        name="Média de Preço"
                        stroke="#2563eb"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ) : (
                      // Render lines for source keys (need to know which keys exist in chartData points)
                      // Actually, we can iterate filteredIngredients OR selectedComparisonIds
                      (selectedComparisonIds.length > 0
                        ? ingredients.filter(i => selectedComparisonIds.includes(i.id))
                        : filteredIngredients
                      ).map((ing, index) => (
                        <Line
                          key={ing.id || index}
                          connectNulls
                          type="monotone"
                          dataKey={ing.name}
                          name={ing.name}
                          stroke={CHART_COLORS[index % CHART_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      ))
                    )}
                  </RechartsLineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <BarChart3 className="w-12 h-12 mb-3 opacity-50" />
                  <p>Dados insuficientes para gerar o gráfico no período selecionado.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

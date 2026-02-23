import React, { useState, useEffect } from "react";
import { Brand, Ingredient } from "@/app/api/entities";
import { formatCapitalize } from "@/lib/textUtils";
import { Supplier } from "@/app/api/entities";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Star, StarOff, Pencil, Trash2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function BrandsManager() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentBrand, setCurrentBrand] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    manufacturer: "",
    description: "",
    active: true,
    preferred: false
  });
  const [activeTab, setActiveTab] = useState("ingrediente");
  const [ingredients, setIngredients] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setLoading(true);
      const [brandsData, ingredientsData] = await Promise.all([
        Brand.list(),
        Ingredient.list()
      ]);
      setBrands(brandsData || []);
      setIngredients(ingredientsData || []);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast({
        title: "Erro",
        description: "Nome da marca é obrigatório",
        variant: "destructive"
      });
      return;
    }

    try {
      if (currentBrand?.id) {
        await Brand.update(currentBrand.id, formData);
      } else {
        await Brand.create(formData);
      }

      setIsDialogOpen(false);
      setCurrentBrand(null);
      await loadData();

      toast({
        title: "Sucesso",
        description: currentBrand ? "Marca atualizada" : "Marca criada"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao salvar marca",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (brand) => {
    if (!window.confirm(`Deseja excluir a marca "${brand.name}"?`)) {
      return;
    }

    try {
      await Brand.delete(brand.id);
      await loadData();

      toast({
        title: "Sucesso",
        description: "Marca excluída"
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível excluir a marca",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (brand) => {
    setCurrentBrand(brand);
    setFormData({
      name: brand.name || "",
      manufacturer: brand.manufacturer || "",
      description: brand.description || "",
      active: brand.active ?? true,
      preferred: brand.preferred ?? false
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setCurrentBrand(null);
    setFormData({
      name: "",
      manufacturer: "",
      description: "",
      active: true,
      preferred: false
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredBrands = brands.filter(brand =>
    brand.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    brand.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter by Usage (Tabs)
  const brandsUsedInIngredients = new Set(ingredients.filter(i => i.item_type !== 'embalagem').map(i => i.brand));
  const brandsUsedInIngredientsIds = new Set(ingredients.filter(i => i.item_type !== 'embalagem').map(i => i.brand_id));

  const brandsUsedInPackaging = new Set(ingredients.filter(i => i.item_type === 'embalagem').map(i => i.brand));
  const brandsUsedInPackagingIds = new Set(ingredients.filter(i => i.item_type === 'embalagem').map(i => i.brand_id));

  const finalFilteredBrands = filteredBrands.filter(brand => {
    const isUsedInIng = brandsUsedInIngredientsIds.has(brand.id) || brandsUsedInIngredients.has(brand.name);
    const isUsedInPkg = brandsUsedInPackagingIds.has(brand.id) || brandsUsedInPackaging.has(brand.name);
    const isUnused = !isUsedInIng && !isUsedInPkg;

    if (activeTab === 'embalagem') {
      return isUsedInPkg || isUnused;
    }
    return isUsedInIng || isUnused;
  });

  return (
    <div className="space-y-6">

      {/* Header das Marcas e Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="grid w-full grid-cols-2 md:inline-flex bg-white p-1 rounded-lg shadow-sm border border-gray-200 gap-1 h-auto">
            <TabsTrigger
              value="ingrediente"
              className="flex-1 md:flex-none data-[state=active]:bg-orange-500 data-[state=active]:text-white rounded-md text-sm font-medium"
            >
              <Package className="w-4 h-4 mr-2" />
              Ingredientes
            </TabsTrigger>
            <TabsTrigger
              value="embalagem"
              className="flex-1 md:flex-none data-[state=active]:bg-amber-500 data-[state=active]:text-white rounded-md text-sm font-medium"
            >
              <Package className="w-4 h-4 mr-2" />
              Embalagens
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-3 w-full md:w-auto justify-end">
          <div className="relative w-full md:w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Buscar marcas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-full"
            />
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Marca
          </Button>
        </div>
      </div>

      {/* Lista de Marcas */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Marcas ({finalFilteredBrands.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Preferida</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {finalFilteredBrands.map((brand) => (
                  <TableRow key={brand.id}>
                    <TableCell className="font-medium font-mono">{formatCapitalize(brand.name)}</TableCell>
                    <TableCell className="font-mono">
                      <span className={brand.active ? "text-green-700 font-semibold" : "text-gray-500 font-semibold"}>
                        {brand.active ? "Ativa" : "Inativa"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {brand.preferred ? (
                        <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      ) : (
                        <StarOff className="h-4 w-4 text-gray-400" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(brand)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(brand)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredBrands.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchTerm ? "Nenhuma marca encontrada para a busca" : "Nenhuma marca cadastrada"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Criação/Edição de Marca */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {currentBrand ? "Editar Marca" : "Nova Marca"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Marca *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome da marca"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição ou observações sobre a marca"
                rows={3}
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Marca ativa</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="preferred"
                  checked={formData.preferred}
                  onCheckedChange={(checked) => setFormData({ ...formData, preferred: checked })}
                />
                <Label htmlFor="preferred">Marca preferida</Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                {currentBrand ? "Salvar Alterações" : "Criar Marca"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
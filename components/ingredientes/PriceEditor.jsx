import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/formatUtils";

export default function PriceEditor({ ingredient, onEdit }) {
  return (
    <div className="flex items-center gap-1 group/price font-mono text-xs">
      <span
        className="font-bold text-green-700 cursor-pointer hover:text-green-800 hover:underline decoration-green-800/50 underline-offset-2 transition-all"
        onClick={() => onEdit(ingredient)}
        title="Clique para atualizar preço"
      >
        R$ {formatCurrency(ingredient.displayPrice || 0).replace('R$ ', '').replace('R$', '')}
      </span>
    </div>
  );
}
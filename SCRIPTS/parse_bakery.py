import pandas as pd
import json
import re
import os

file_path = r"C:\Users\Administrador\Desktop\COZINHA RESTAURANTE\ESCALA DE PRODUÇÃO PADARIA.xlsx"
output_path = r"C:\Users\Administrador\Desktop\COZINHA RESTAURANTE\bakery_to_import.json"

# Keyword mapping for subcategories
SUBCATEGORIES_MAP = {
    "BOLOS PRODUCAO": ["BOLO", "MANTECAL", "BRIOCHE"],
    "BISCOITO DE POLVILHO": ["BISCOITO POLVILHO", "POCA"],
    "BISCOITOS ARTESANAIS TERC.": ["BISCOITO ARTESANAL", "TERCEIRIZADO"],
    "DOCES PRODUCAO": ["DOCE", "SONHO", "CAROLINA", "BOMBA", "TORTINHA"],
    "BROAS PRODUCAO": ["BROA"],
    "SALGADOS PRODUCAO": ["SALGADO", "COXINHA", "KIBE", "ENROLADINHO", "PASTEL", "EMPADINHA", "LANCHE NATURAL"],
    "ROSCAS": ["ROSCA"],
    "TORTAS": ["TORTA"],
    "TORRADAS PRODUCAO": ["TORRADA"],
    "SANDUICHES E LANCHES": ["SANDUICHE", "X-", "HAMBURGUER"],
    "QUEBRA PRODUCAO": ["QUEBRA"],
    "MASSA CONG": ["MASSA", "CONGELADA"],
    "PAES PRODUCAO": ["PAO", "PÃO", "BAGUETE", "CIABATTA", "MANTEIGA"],
    "PANETTONE E COLOMBA": ["PANETTONE", "CHOCOTONE", "COLOMBA"],
    "PRODUCAO PADARIA": [] # Fallback
}

def get_subcategory(name):
    name_upper = name.upper()
    for cat, keywords in SUBCATEGORIES_MAP.items():
        for kw in keywords:
            if kw in name_upper:
                return cat
    return "PRODUCAO PADARIA"

def extract_bakery(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    try:
        df = pd.read_excel(file_path, header=None)
        extracted_recipes = []
        
        # Iterate col-by-col looking for 'COD' and 'PRODUTO'
        columns = df.columns
        total_cols = len(columns)
        
        for i in range(total_cols - 1):
            # Check if headers match pattern in rows
            # We look for rows where Col[i] == 'COD' and Col[i+1] == 'PRODUTO'
            
            # Identify header rows for data blocks
            header_rows = df.index[df.iloc[:, i].astype(str).str.strip() == 'COD'].tolist()
            
            for start_row in header_rows:
                # Check next column for 'PRODUTO'
                if str(df.iloc[start_row, i+1]).strip() == 'PRODUTO':
                    # This is a block! Iterate downwards until empty or new block
                    # Actually, just iterate until end or empty cell
                    
                    # Data starts from start_row + 1
                    for r in range(start_row + 1, len(df)):
                        code_val = df.iloc[r, i]
                        name_val = df.iloc[r, i+1]
                        
                        # Stop if Code is NaN or 0 (sometimes 0 is valid? no, usually text uses 0 for spacing)
                        if pd.isna(code_val) or str(code_val).strip() == '' or str(code_val).strip() == '0' or str(code_val).strip() == 'nan':
                            # Check if name is also empty, if so, break block
                            if pd.isna(name_val) or str(name_val).strip() == 'nan':
                                break
                            continue # Skip empty code lines if name exists? Or maybe it's just a label?
                        
                        code_str = str(code_val).strip().replace('.0', '')
                        name_str = str(name_val).strip()
                        
                        # Validate Code is numeric-ish
                        if not re.match(r'^\d+$', code_str):
                            continue

                        # Clean Name (Remove "001234 - ")
                        clean_name = re.sub(r'^\d+\s*-\s*', '', name_str).strip()
                        clean_name = re.sub(r'^0*\d+\s*-\s*', '', clean_name).strip()
                        
                        full_name_formatted = f"{code_str} - {clean_name}"
                        
                        # Determine Subcategory
                        subcategory = get_subcategory(clean_name)
                        
                        recipe_obj = {
                            "code": code_str,
                            "name": full_name_formatted,
                            "original_name": name_str,
                            "clean_name": clean_name,
                            "category": subcategory, # Use leaf node name directly
                            "type": "receitas_-_base" 
                        }
                        
                        # Avoid duplicates in list
                        if not any(r['code'] == recipe_obj['code'] for r in extracted_recipes):
                            extracted_recipes.append(recipe_obj)

        print(f"Extracted {len(extracted_recipes)} unique recipes.")
        
        # Save to JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(extracted_recipes, f, indent=2, ensure_ascii=False)
            
        print(f"Saved to {output_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    extract_bakery(file_path)

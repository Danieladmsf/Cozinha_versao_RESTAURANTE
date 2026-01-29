import pandas as pd
import json
import re
import os

file_path = r"C:\Users\Administrador\Desktop\COZINHA RESTAURANTE\ESCALA DE PRODUÇÃO PROCESSADOS.xlsx"
output_path = r"C:\Users\Administrador\Desktop\COZINHA RESTAURANTE\processados_to_import.json"

# Target category
TARGET_CATEGORY = "PROCESSADOS"

def extract_processed(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    try:
        df = pd.read_excel(file_path, header=None)
        extracted_recipes = []
        
        # Same logic as bakery: look for COD/PRODUTO columns
        columns = df.columns
        total_cols = len(columns)
        
        for i in range(total_cols - 1):
            header_rows = df.index[df.iloc[:, i].astype(str).str.strip() == 'COD'].tolist()
            
            for start_row in header_rows:
                if str(df.iloc[start_row, i+1]).strip() == 'PRODUTO':
                    for r in range(start_row + 1, len(df)):
                        code_val = df.iloc[r, i]
                        name_val = df.iloc[r, i+1]
                        
                        if pd.isna(code_val) or str(code_val).strip() == '' or str(code_val).strip() == '0' or str(code_val).strip() == 'nan':
                            if pd.isna(name_val) or str(name_val).strip() == 'nan':
                                break
                            continue
                        
                        code_str = str(code_val).strip().replace('.0', '')
                        name_str = str(name_val).strip()
                        
                        if not re.match(r'^\d+$', code_str):
                            continue

                        clean_name = re.sub(r'^\d+\s*-\s*', '', name_str).strip()
                        clean_name = re.sub(r'^0*\d+\s*-\s*', '', clean_name).strip()
                        
                        full_name_formatted = f"{code_str} - {clean_name}"
                        
                        recipe_obj = {
                            "code": code_str,
                            "name": full_name_formatted,
                            "original_name": name_str,
                            "clean_name": clean_name,
                            "category": TARGET_CATEGORY,
                            "type": "receitas_-_base"
                        }
                        
                        if not any(r['code'] == recipe_obj['code'] for r in extracted_recipes):
                            extracted_recipes.append(recipe_obj)

        print(f"Extracted {len(extracted_recipes)} unique recipes.")
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(extracted_recipes, f, indent=2, ensure_ascii=False)
            
        print(f"Saved to {output_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    extract_processed(file_path)

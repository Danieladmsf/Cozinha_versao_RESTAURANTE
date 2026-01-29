import pandas as pd
import json
import re
import os

file_path = r"C:\Users\Administrador\Desktop\COZINHA RESTAURANTE\Planilha sem título.xlsx"
output_path = r"C:\Users\Administrador\Desktop\COZINHA RESTAURANTE\recipes_to_import.json"

def extract_recipes(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File not found at {file_path}")
        return

    try:
        df = pd.read_excel(file_path, header=None)
        
        extracted_recipes = []
        
        # We process the dataframe row by row, or column by column.
        # Based on previous analysis, there seem to be multiple blocks.
        # But a safe bet is to iterate through all cells or look for specific column patterns.
        # Step 40 showed columns:
        # Col 2 (C) -> 8321
        # Col 3 (D) -> 008321 - ROT.ESPAGUETE...
        #
        # Col 6 (G) -> 8037
        # Col 7 (H) -> 008037 - ROTISSERIA ARROZ...
        # 
        # It seems the pattern is: Col N (Code), Col N+1 (Description starting with '00' or similar)
        # Let's iterate through columns pairs.
        
        columns = df.columns
        total_cols = len(columns)
        
        for i in range(total_cols - 1):
            # Check if column i and i+1 form a Code-Name pair
            # We check a sample of non-null rows
            col_code = df.iloc[:, i]
            col_name = df.iloc[:, i+1]
            
            # Filter rows where both are non-null
            valid_rows = df[df.iloc[:, i].notna() & df.iloc[:, i+1].notna()]
            
            for index, row in valid_rows.iterrows():
                code_val = row.iloc[i]
                name_val = row.iloc[i+1]
                
                # Convert to string for regex checking
                code_str = str(code_val).strip()
                name_str = str(name_val).strip()
                
                # Check if name looks like "001234 - DESCRIPTION" or just matches the code
                # Regex for name: starts with digits, hyphen, then text?
                # Or just check if name contains the code?
                
                # From examples: Code "8321", Name "008321 - ..."
                # Code "8037", Name "008037 - ..."
                
                # Regex to match the Name pattern "00\d+ - .*"
                if re.match(r'^\d+\s*-\s*.*', name_str) or re.match(r'^0*\d+\s*-\s*.*', name_str):
                     # Try to clean the name
                     # Remove the leading code and dash
                     clean_name = re.sub(r'^0*\d+\s*-\s*', '', name_str).strip()
                     
                     # Code is code_str
                     # Ensure code_str is numeric-ish
                     if re.match(r'^\d+$', str(code_str)) or isinstance(code_val, (int, float)):
                         recipe_obj = {
                             "code": str(int(float(code_str))) if isinstance(code_val, (int, float)) else code_str,
                             "name": clean_name,
                             "full_name_original": name_str,
                             "category": "Produtos > marmitas 3 DV"
                         }
                         
                         # Avoid duplicates
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
    extract_recipes(file_path)

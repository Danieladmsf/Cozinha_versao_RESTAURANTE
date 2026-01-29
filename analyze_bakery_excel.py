import pandas as pd
import os

file_path = r"C:\Users\Administrador\Desktop\COZINHA RESTAURANTE\ESCALA DE PRODUÇÃO PADARIA.xlsx"

if not os.path.exists(file_path):
    print(f"Error: File not found at {file_path}")
    exit(1)

try:
    print(f"Reading file: {file_path}")
    # Read all sheets to see if categories are sheets
    xl = pd.ExcelFile(file_path)
    print(f"Sheets found: {xl.sheet_names}")

    # Read first sheet
    df = pd.read_excel(file_path, header=None)
    print(f"\n--- First Sheet Data Shape: {df.shape} ---")
    
    print("\n--- First 10 rows ---")
    print(df.head(10).to_markdown())

    print("\n--- Searching for Subcategory Names ---")
    subcategories = [
        "PRODUCAO PADARIA", "BOLOS PRODUCAO", "BISCOITO DE POLVILHO", 
        "BISCOITOS ARTESANAIS TERC.", "DOCES PRODUCAO", "BROAS PRODUCAO", 
        "SALGADOS PRODUCAO", "ROSCAS", "TORTAS", "TORRADAS PRODUCAO", 
        "SANDUICHES E LANCHES", "QUEBRA PRODUCAO", "MASSA CONG", 
        "PAES PRODUCAO", "PANETTONE E COLOMBA"
    ]
    
    # Check if these names appear in any cell to indicate sections
    found_cats = {}
    for cat in subcategories:
        # Search entire dataframe
        mask = df.apply(lambda x: x.astype(str).str.contains(cat, case=False, na=False))
        rows, cols = mask.to_numpy().nonzero()
        if len(rows) > 0:
            found_cats[cat] = list(zip(rows, cols))
            print(f"Found '{cat}' at locations: {found_cats[cat]}")
        else:
            print(f"'{cat}' NOT found.")

    # Check columns for Code/Description patterns
    print("\n--- Column Analysis ---")
    for col in df.columns[:20]: # Check first 20 cols (A:T)
        sample = df[col].dropna().head(5).tolist()
        print(f"Col {col}: {sample}")

except Exception as e:
    print(f"An error occurred: {e}")

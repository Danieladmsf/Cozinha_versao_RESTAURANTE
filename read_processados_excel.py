import pandas as pd
import os
import json

file_path = r"C:\Users\Administrador\Desktop\COZINHA RESTAURANTE\ESCALA DE PRODUÇÃO PROCESSADOS.xlsx"

if not os.path.exists(file_path):
    print(f"Error: File not found at {file_path}")
    exit(1)

try:
    # Read all sheets to understand the structure
    xlsx = pd.ExcelFile(file_path)
    print(f"Sheets found: {xlsx.sheet_names}")
    
    # Read first sheet
    df = pd.read_excel(file_path, sheet_name=0, header=None)
    
    print(f"\nTotal rows: {len(df)}")
    print(f"Total columns: {len(df.columns)}")
    
    print("\n=== First 30 rows (raw data) ===")
    pd.set_option('display.max_columns', None)
    pd.set_option('display.width', None)
    pd.set_option('display.max_colwidth', 50)
    print(df.head(30).to_string())
    
    print("\n=== Column info ===")
    for i, col in enumerate(df.columns):
        sample_values = df[col].dropna().head(5).tolist()
        print(f"Col {i}: {sample_values[:3]}")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

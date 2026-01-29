import pandas as pd
import os

file_path = r"C:\Users\Administrador\Desktop\COZINHA RESTAURANTE\Planilha sem título.xlsx"

if not os.path.exists(file_path):
    print(f"Error: File not found at {file_path}")
    exit(1)

try:
    df = pd.read_excel(file_path, header=None)
    
    print(f"Data Shape: {df.shape}")
    
    print("\n--- Column Analysis ---")
    for col in df.columns:
        non_null_count = df[col].count()
        if non_null_count > 0:
            sample = df[col].dropna().iloc[0]
            print(f"Col {col} ({chr(65+col) if col < 26 else 'AA+'}): {non_null_count} items. Sample: {sample}")

    print("\n--- Checking for Recipe Names ---")
    # Looking for strings starting with "00" and containing "-"
    for col in df.columns:
        # Check if column is object type
        if df[col].dtype == 'object':
            matches = df[col].astype(str).str.contains(r'^\d{6}\s-', regex=True).sum()
            if matches > 0:
                print(f"Col {col} seems to contain {matches} Recipe/Ingredient codes/names.")
                print(f"  Sample: {df[col].dropna().iloc[0]}")

except Exception as e:
    print(f"An error occurred: {e}")

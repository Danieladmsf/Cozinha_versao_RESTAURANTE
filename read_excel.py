import pandas as pd
import os

file_path = r"C:\Users\Administrador\Desktop\COZINHA RESTAURANTE\Planilha sem título.xlsx"

if not os.path.exists(file_path):
    print(f"Error: File not found at {file_path}")
    exit(1)

try:
    # Read the excel file. No header assumed initially to see everything, or header=0.
    # The user mentioned A:AB, so let's try to read all columns. 
    df = pd.read_excel(file_path, header=None)
    
    # Print the first few rows to get an idea
    print("First 20 rows:")
    print(df.head(20).to_markdown(index=False))

    print("\nFull Data Shape:", df.shape)
    
except ImportError as e:
    print(f"Missing library: {e}")
    print("Please install pandas and openpyxl: pip install pandas openpyxl")
except Exception as e:
    print(f"An error occurred: {e}")

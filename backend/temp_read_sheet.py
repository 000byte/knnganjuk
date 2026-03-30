import pandas as pd
import sys

url = "https://docs.google.com/spreadsheets/d/1fNJkBvTEuA73_WE2HiHxZ5EQfUz4bkmxZczqe2bUq8g/export?format=xlsx"
try:
    xls = pd.ExcelFile(url)
    print("Sheet names:", xls.sheet_names)
    for sheet in xls.sheet_names:
        df = pd.read_excel(xls, sheet_name=sheet)
        print(f"\n--- Sheet: {sheet} ---")
        print("Columns:", df.columns.tolist())
        print(df.head(2).to_dict('records'))
except Exception as e:
    print(f"Error fetching sheets: {e}")
    sys.exit(1)

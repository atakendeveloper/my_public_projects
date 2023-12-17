import pandas as pd

file_path = 'Washington_All_Grades_Conventional_Retail_Gasoline_Prices.csv'

df = pd.read_csv(file_path)

print("Columns:", df.columns)

df['Month'] = pd.to_datetime(df['Month'], format='%b-%y')

df = df.set_index('Month')

df_weekly = df.resample('W-MON').last()

df_weekly = df_weekly.ffill()

df_weekly['Week'] = df_weekly.index.strftime('%Y-%m-%d') + '/' + (df_weekly.index + pd.DateOffset(days=6)).strftime('%Y-%m-%d')


df_weekly = df_weekly.rename(columns={'Washington All Grades Conventional Retail Gasoline Prices Dollars per Gallon': 'Price'})


gas_df=df_weekly

print(gas_df)

# output_file_path = 'gas.csv'
# df_weekly.to_csv(output_file_path, index=False)

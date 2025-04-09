import argparse
import pandas as pd
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
import math
import os

# === Argument parsing ===
parser = argparse.ArgumentParser()
parser.add_argument('--csv', required=True, help="Path to input CSV file")
parser.add_argument('--output', required=True, help="Path to output PDF file")
parser.add_argument('--return_label_mode', action='store_true', help="Generate return labels instead of recipient labels")
args = parser.parse_args()

# === Layout constants ===
label_width = 1.75 * inch
label_height = 0.6875 * inch
labels_per_row = 4
labels_per_column = 15
labels_per_page = labels_per_row * labels_per_column

page_width, page_height = letter
margin_left = 0.5 * inch
margin_top = 0.5 * inch

font_size = 6.5
line_height = 8

# === Column X Positions ===
column_x_positions = {
    0: margin_left - 0.25 * inch,
    1: margin_left + 1.75 * inch + 0.25 * inch,
    2: margin_left + 4.0 * inch + 0.15 * inch,
    3: margin_left + 6.0 * inch + 0.25 * inch
}

# === Label content ===
label_lines_list = []

if args.return_label_mode:
    label_lines_list = [[
        "Joseph Sardella",
        "Obsidian Group",
        "36923 Cook St B101",
        "Palm Desert CA 92211"
    ]] * 999  # Fill pages with return address labels
else:
    df = pd.read_csv(args.csv)
    df = df.sort_values(by="Owner1LastName", key=lambda col: col.str.lower())

    for _, row in df.iterrows():
        name = str(row["Owner1FullName"]).strip()
        owner2 = row.get("Owner2FullName", "")
        if pd.notna(owner2) and str(owner2).strip():
            name += " and " + str(owner2).strip()

        if len(name) > 25:
            name_lines = [name[:25] + "-", name[25:]]
        else:
            name_lines = [name]

        street = str(row["MailStreetAddress"]).strip()
        city = str(row["MailCity"]).strip()
        state = str(row["MailState"]).strip()
        zip_code = str(row["MailZip"]).strip()
        line2 = f"{city}, {state} {zip_code}"

        label_lines = name_lines + [street, line2]
        label_lines_list.append(label_lines)

# === Build & export PDF ===
total_labels = len(label_lines_list)
num_pages = math.ceil(total_labels / labels_per_page)

# Ensure output directory exists
os.makedirs(os.path.dirname(args.output), exist_ok=True)
c = canvas.Canvas(args.output, pagesize=letter)

for page in range(num_pages):
    c.setFont("Helvetica", font_size)

    for i in range(labels_per_page):
        index = page * labels_per_page + i
        if index >= total_labels:
            break

        label_lines = label_lines_list[index]
        col = i % labels_per_row
        row_idx = i // labels_per_row

        x = column_x_positions[col]
        label_top_y = page_height - margin_top - row_idx * label_height

        total_text_height = len(label_lines) * line_height
        text_start_y = label_top_y - (label_height - total_text_height) / 2 - 2

        for line in label_lines:
            c.drawString(x + 4, text_start_y, line[:40])
            text_start_y -= line_height

    c.showPage()

c.save()
print(f"✅ Labels exported to: {args.output}")

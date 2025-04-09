import argparse
import csv
import os
import fitz  # PyMuPDF
from fpdf import FPDF

# === Parse command-line arguments ===
parser = argparse.ArgumentParser()
parser.add_argument('--csv', required=True, help="Path to the CSV file")
parser.add_argument('--output', required=True, help="Path to output directory")
parser.add_argument('--qr', required=True, help="Path to QR code image")
parser.add_argument('--background', required=True, help="Path to background PDF")
parser.add_argument('--about', required=True, help="Path to about page PDF")
parser.add_argument('--letter_text', required=True, help="Letter body text (use quotes)")

args = parser.parse_args()

# === Ensure output directory exists ===
os.makedirs(args.output, exist_ok=True)
master_pdf_path = os.path.join(args.output, "_master-farm.pdf")

# === Load and sort CSV data ===
with open(args.csv, 'r', encoding='utf-8') as file:
    reader = csv.DictReader(file)
    data = sorted(list(reader), key=lambda row: row.get("Owner1LastName", "").lower())

# === Load PDF assets ===
background = fitz.open(args.background)
about_pdf = fitz.open(args.about)

# === Track generated files ===
generated_files = []

for row in data:
    owner1 = row.get("Owner1FullName", "")
    owner2 = row.get("Owner2FullName", "")
    recipient_name = f"{owner1} and {owner2}" if owner2 else owner1

    address = row.get("PropertyStreetAddress", "")
    city = row.get("PropertyCity", "")
    state = row.get("PropertyState", "")
    zip_code = row.get("PropertyZip", "")

    file_name = f"{row.get('Owner1LastName', 'Letter')}_Letter.pdf"
    output_file = os.path.join(args.output, file_name)

    # === Create personalized letter PDF with FPDF ===
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    pdf.set_font("Arial", size=12)
    pdf.cell(0, 5, "", ln=True)

    pdf.multi_cell(0, 6, f"{address}\n{city}, {state} {zip_code}\n\n")
    pdf.cell(0, 6, f"Dear {recipient_name},", ln=True)
    pdf.ln(4)
    pdf.multi_cell(0, 6, args.letter_text.strip())
    pdf.ln(10)
    pdf.image(args.qr, x=pdf.l_margin, y=pdf.get_y(), w=50)

    # === Overlay FPDF content onto background ===
    pdf_bytes = pdf.output(dest='S').encode('latin1')
    overlay = fitz.open("pdf", pdf_bytes)

    background_copy = fitz.open()
    background_copy.insert_pdf(background, from_page=0, to_page=0)
    background_copy[0].show_pdf_page(background_copy[0].rect, overlay, 0)

    # === Add about page as second page ===
    background_copy.insert_pdf(about_pdf)

    # === Save individual file ===
    background_copy.save(output_file)
    generated_files.append(output_file)
    print(f"✅ Saved: {output_file}")

# === Create combined master PDF ===
master_pdf = fitz.open()
for file_path in generated_files:
    doc = fitz.open(file_path)
    master_pdf.insert_pdf(doc)
    doc.close()

master_pdf.save(master_pdf_path)
master_pdf.close()
print(f"📄 Combined all letters into: {master_pdf_path}")

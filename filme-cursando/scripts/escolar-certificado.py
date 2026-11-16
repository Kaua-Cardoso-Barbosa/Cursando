import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/pdf32'))
import pypdfium2 as pdfium
doc=pdfium.PdfDocument(str(ROOT/'engine/assets/escolar/certificado-demonstracao.pdf'))
doc[0].render(scale=2).to_pil().save(ROOT/'engine/assets/escolar/certificate.png')
print('Certificado emitido pelo sistema convertido para imagem de captura.')

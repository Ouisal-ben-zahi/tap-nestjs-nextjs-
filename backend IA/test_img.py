from rembg import remove
from PIL import Image

input_path = '../frontend/src/templates_modif/Hajar.jpg'
output_path = 'output.png'

with open(input_path, 'rb') as f:
    input_data = f.read()

output_data = remove(input_data)

with open(output_path, 'wb') as f:
    f.write(output_data)
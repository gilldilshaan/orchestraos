import re

with open("/app/app/services/objective_compiler.py") as f:
    content = f.read()

templates = re.findall(r'["\']([a-zA-Z_]+_v[0-9]+\.md)["\']', content)
print("Templates referenced:", templates)

calls = re.findall(r'(?:render|load_template|get_prompt_path)\(["\']([^"\']+)["\']', content)
print("Prompt calls:", calls)

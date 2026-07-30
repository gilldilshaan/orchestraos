import re, os

all_templates = set()

for root, dirs, files in os.walk("/app/app"):
    for f in files:
        if f.endswith(".py") and not f.startswith("__pycache__"):
            path = os.path.join(root, f)
            try:
                with open(path) as fh:
                    content = fh.read()
                    templates = re.findall(r'["\']([a-zA-Z_]+_v[0-9]+\.md)["\']', content)
                    all_templates.update(templates)
            except:
                pass

print("All referenced templates:")
for t in sorted(all_templates):
    print(f"  {t}")

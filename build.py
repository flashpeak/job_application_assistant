import os
import subprocess
import shutil
from pathlib import Path
import json
import sys

def minify_js(source_path, dest_path):
    """Minify and obfuscate JavaScript file using terser"""

    subprocess.run([
        'terser' if os.name == 'posix' else 'terser.cmd',
        str(source_path),
        '--compress',
        '--mangle',
        #'--toplevel',           # Enables top-level variable and function name mangling
        '--output', str(dest_path)
        ], check=True)
    print(f"Minified and obfuscated: {source_path.name} to {dest_path.name}")

def copy_file(source_path, dest_dir, new_name=None):
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest_path = dest_dir / (new_name if new_name else source_path.name)
    shutil.copy2(source_path, dest_path)
    print(f"Copied: {source_path.name} to {dest_path.name}")

def build_extension(browser):
    """Build the extension: copy files, minify JS, create ZIP"""
    build_dir = Path(f"build_{browser}")
    source_dir = Path(".")
    
    if not build_dir.exists():
        build_dir.mkdir()

    # Copy all JS files from current directory
    files=["popup.html", "options.html"]
    for file in files:
        copy_file(source_dir / file, build_dir)
    
    # Remove options_test.js script tag from options.html
    options_html = build_dir / 'options.html'
    with open(options_html, 'r') as f:
        content = f.read()
    content = content.replace('<script src="scripts/options_test.js"></script>\n', '')
    with open(options_html, 'w') as f:
        f.write(content)
    print("Removed options_test.js script tag from options.html")

    manifest_source = f"manifest_{browser}.json"
    copy_file(source_dir / manifest_source, build_dir, "manifest.json")

    #open manifest.json and remove reference to form_filler.js
    manifest_json = build_dir / 'manifest.json'
    with open(manifest_json, 'r') as f:
        manifest_data = json.load(f)
    
    manifest_data['name']=manifest_data['name'].replace(" (Dev)","")
    
    with open(manifest_json, 'w') as f:
        json.dump(manifest_data, f, indent=4)    

    # Copy all files from scripts directory if it exists
    scripts_dir = source_dir / 'scripts'
    for js_file in scripts_dir.glob('*.js'):
        if js_file.name not in ["unused.js"]:
            if not js_file.name.endswith('.min.js'):
                if js_file.name=="config_prod.js":
                    copy_file(js_file, build_dir / 'scripts', "config.js")
                else:
                    minify_js(js_file, build_dir / 'scripts' / js_file.name)
            else:
                copy_file(js_file, build_dir / 'scripts')

    # Copy all files from scripts directory if it exists
    scripts_dir = source_dir / 'scripts/background'
    for js_file in scripts_dir.glob('*.js'):
        if js_file.name not in []:
            if not js_file.name.endswith('.min.js'):
                minify_js(js_file, build_dir / 'scripts/background' / js_file.name)
            else:
                copy_file(js_file, build_dir / 'scripts/background')                

    #copy icons folder
    shutil.copytree(source_dir / 'icons', build_dir / 'icons', dirs_exist_ok=True)

    # Create ZIP file
    if os.path.exists(f'{browser}_extension.zip'):
        os.remove(f'{browser}_extension.zip')
    os.chdir(build_dir)
    subprocess.run(['7z', 'a', f'../{browser}_extension.zip', '*'], check=True)
    os.chdir('..')
    print(f"Created: {browser}_extension.zip")

if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ['chrome', 'firefox']:
        print("Usage: python build.py [chrome|firefox]")
        sys.exit(1)
    
    build_extension(sys.argv[1])
import os
import shutil

# Define source and destination directories
source_files = [
    './scripts',
    './icons',
    './images',
    './tutorial.html',
    './options.html',
    './popup.html',
    './manifest_firefox.json'
]
destination_dir = './firefox_dev'

# Create the destination directory if it doesn't exist
if not os.path.exists(destination_dir):
    os.makedirs(destination_dir)

# Copy files and directories
for item in source_files:
    if os.path.isdir(item):
        shutil.copytree(item, os.path.join(destination_dir, os.path.basename(item)), dirs_exist_ok=True)
    else:
        if item == './manifest_firefox.json':
            shutil.copy(item, os.path.join(destination_dir, 'manifest.json'))
        else:
            shutil.copy(item, destination_dir)

print("Files copied successfully to build_dev directory.")
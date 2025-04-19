# Firefox Branch

The `firefox_branch` is dedicated to ensuring compatibility and optimization of the Job Application Assistant extension for the Firefox browser. This branch includes specific configurations and adjustments necessary for the extension to function seamlessly in Firefox.

## Key Features
- **Manifest Adjustments**: Uses `manifest_firefox.json` tailored for Firefox.
- **Compatibility Fixes**: Includes any code changes required to address Firefox-specific issues.
- **Testing Environment**: Contains scripts and setup instructions for testing the extension in Firefox.

## Directory Structure
- `./scripts/`: JavaScript files for background and content scripts.
- `./job_assistant.png`: Icon for the extension.
- `./options.html`: Options page for user configuration.
- `./popup.html`: Popup interface for the extension.
- `./manifest.json`: Firefox-specific manifest file.

## How to Use
1. **Switch to the Branch**:
   ```sh
   git checkout firefox_branch

## Build and Test
    Run the build_firefox.py script to prepare the extension for testing in Firefox
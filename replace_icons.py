import os

def replace_in_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()
    
    if '<MaterialIcons name="verified"' in content or 'name="verified"' in content:
        # replace MaterialIcons with Ionicons if they specifically have name="verified"
        # actually, easier to just do a direct string replacement:
        new_content = content.replace('<MaterialIcons name="verified"', '<Ionicons name="checkmark-circle"')
        
        # also handle cases where they are split across lines
        if filepath.endswith('olx/[id].tsx') or filepath.endswith('profile.tsx'):
            new_content = new_content.replace('name="verified"', 'name="checkmark-circle"')
            new_content = new_content.replace('<MaterialIcons', '<Ionicons')

        # make sure Ionicons is imported
        if '<Ionicons' in new_content and 'import { Ionicons' not in new_content and 'import {Ionicons' not in new_content:
            if 'import { MaterialIcons } from "@expo/vector-icons"' in new_content:
                new_content = new_content.replace('import { MaterialIcons } from "@expo/vector-icons"', 'import { Ionicons, MaterialIcons } from "@expo/vector-icons"')
            elif 'import { MaterialIcons' in new_content:
                # Add Ionicons to the import
                new_content = new_content.replace('import { MaterialIcons', 'import { Ionicons, MaterialIcons')

        if new_content != content:
            with open(filepath, 'w') as f:
                f.write(new_content)
            print(f"Updated {filepath}")

def main():
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith('.tsx'):
                replace_in_file(os.path.join(root, file))

if __name__ == "__main__":
    main()

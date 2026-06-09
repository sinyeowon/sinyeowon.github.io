import os
import re

def fix_content(content):
    new_content = ""
    pos = 0
    while True:
        match = re.search(r'<div class="notion-callout" markdown="1">', content[pos:])
        if not match:
            new_content += content[pos:]
            break
        
        start_idx = pos + match.start()
        
        # Strip preceding whitespace on the same line
        line_start = content.rfind('\n', 0, start_idx) + 1
        preceding_text = content[line_start:start_idx]
        if preceding_text.isspace() or not preceding_text:
            new_content += content[pos:line_start]
        else:
            new_content += content[pos:start_idx]
        
        # Find the matching end tag
        current_pos = start_idx + len('<div class="notion-callout" markdown="1">')
        depth = 1
        while depth > 0 and current_pos < len(content):
            next_div = content.find('<div', current_pos)
            next_close_div = content.find('</div>', current_pos)
            
            if next_close_div == -1:
                current_pos = len(content)
                break
            
            if next_div != -1 and next_div < next_close_div:
                depth += 1
                current_pos = next_div + 4
            else:
                depth -= 1
                current_pos = next_close_div + 6
        
        block = content[start_idx:current_pos]
        
        # Extract icon
        icon_match = re.search(r'<span class="notion-callout-icon">(.*?)</span>', block)
        icon = icon_match.group(1).strip() if icon_match else '💡'
        
        # Extract title
        title_start_match = re.search(r'<div class="notion-callout-title"[^>]*>', block)
        if title_start_match:
            title_start = title_start_match.end()
            d = 1
            p = title_start
            while d > 0 and p < len(block):
                nd = block.find('<div', p)
                ncd = block.find('</div>', p)
                if ncd == -1: break
                if nd != -1 and nd < ncd:
                    d += 1
                    p = nd + 4
                else:
                    d -= 1
                    p = ncd + 6
            title = block[title_start:p-6].strip()
        else:
            title = ""
            
        # Extract body
        body_start_match = re.search(r'<div class="notion-callout-body"[^>]*>', block)
        if body_start_match:
            body_start = body_start_match.end()
            d = 1
            p = body_start
            while d > 0 and p < len(block):
                nd = block.find('<div', p)
                ncd = block.find('</div>', p)
                if ncd == -1: break
                if nd != -1 and nd < ncd:
                    d += 1
                    p = nd + 4
                else:
                    d -= 1
                    p = ncd + 6
            body = block[body_start:p-6].strip()
        else:
            # If no explicit body div, everything after title-div-close might be body
            # but in the old structure it was usually inside notion-callout-body.
            body = ""
            
        # Reconstruct
        new_block = '<div class="notion-callout" markdown="1">\n\n'
        new_block += '<div class="notion-callout-heading">\n'
        new_block += f'<span class="notion-callout-icon">{icon}</span> <span class="notion-callout-title">{title}</span>\n'
        new_block += '</div>\n\n'
        if body:
            new_block += f'{body}\n\n'
        new_block += '</div>'
        
        new_content += new_block
        pos = current_pos
        
    return new_content

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if 'notion-callout' not in content:
        return False
        
    new_content = fix_content(content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    dirs = ['_posts', 'en/posts']
    updated_files = []
    for d in dirs:
        if not os.path.exists(d):
            continue
        for root, _, files in os.walk(d):
            for file in files:
                if file.endswith('.md'):
                    filepath = os.path.join(root, file)
                    if process_file(filepath):
                        updated_files.append(filepath)
    
    print(f"Updated {len(updated_files)} files:")
    for f in updated_files:
        print(f" - {f}")

if __name__ == "__main__":
    main()

import json
import re

with open('data/content.json', 'r') as f:
    content = json.load(f)

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

def to_regex(val):
    if not isinstance(val, str) or len(val) < 5:
        return None
    val = re.escape(val)
    val = val.replace('\\ ', r'\s+')
    return val

def replace_val(path, val):
    global html
    if isinstance(val, dict):
        for k, v in val.items():
            if k == 'title' and path == 'hero':
                continue
            replace_val(f"{path}.{k}", v)
    elif isinstance(val, list):
        for i, item in enumerate(val):
            replace_val(f"{path}[{i}]", item)
    elif isinstance(val, str):
        is_image = val.startswith('./img/') or val.startswith('./team/') or val.endswith('.png') or val.endswith('.jpg')
        if is_image:
            html = html.replace(f'src="{val}"', f'src="<%= content.{path} %>"')
        elif len(val) > 10:
            escaped = val.replace('&', '&amp;')
            if escaped in html:
                html = html.replace(escaped, f'<%= content.{path} %>')

replace_val('content', content['hero']) # actually should start without content. prefix?
replace_val('hero', content['hero'])
replace_val('services', content['services'])
replace_val('process', content['process'])
replace_val('cases', content['cases'])
replace_val('about', content['about'])
replace_val('blog', content['blog'])
replace_val('team', content['team'])
replace_val('partnership', content['partnership'])
replace_val('careers', content['careers'])
replace_val('howWeWork', content['howWeWork'])
replace_val('contact', content['contact'])
replace_val('footer', content['footer'])

with open('views/index.ejs', 'w', encoding='utf-8') as f:
    f.write(html)

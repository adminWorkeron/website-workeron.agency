import json

with open("data/content.json", "r", encoding="utf-8") as f:
    initial_content = json.load(f)

js_code = f"""
(function() {{
    const initialContent = {json.dumps(initial_content)};
    
    // Flatten helper
    function flattenObject(ob) {{
        var toReturn = {{}};
        for (var i in ob) {{
            if (!ob.hasOwnProperty(i)) continue;
            if ((typeof ob[i]) == 'object' && ob[i] !== null) {{
                if (Array.isArray(ob[i])) {{
                    for(var j=0; j<ob[i].length; j++) {{
                        var flatObject = flattenObject(ob[i][j]);
                        for (var x in flatObject) {{
                            if (!flatObject.hasOwnProperty(x)) continue;
                            toReturn[i + '[' + j + '].' + x] = flatObject[x];
                        }}
                    }}
                }} else {{
                    var flatObject = flattenObject(ob[i]);
                    for (var x in flatObject) {{
                        if (!flatObject.hasOwnProperty(x)) continue;
                        toReturn[i + '.' + x] = flatObject[x];
                    }}
                }}
            }} else {{
                toReturn[i] = ob[i];
            }}
        }}
        return toReturn;
    }}

    const initialMap = flattenObject(initialContent);
    const revMap = {{}};
    for(let key in initialMap) {{
        let val = initialMap[key];
        if(typeof val === 'string' && val.trim().length > 0) {{
            let trimmed = val.trim();
            if(!revMap[trimmed]) revMap[trimmed] = [];
            revMap[trimmed].push(key);
        }}
    }}

    const nodeMapping = {{}};

    function traverse(node) {{
        if(node.nodeType === Node.TEXT_NODE) {{
            let text = node.nodeValue.trim();
            if(text.length > 0 && revMap[text]) {{
                revMap[text].forEach(path => {{
                    if(!nodeMapping[path]) nodeMapping[path] = [];
                    nodeMapping[path].push(node);
                }});
            }}
        }}
        else if(node.nodeType === Node.ELEMENT_NODE) {{
            if(node.tagName.toLowerCase() === 'img') {{
                let src = node.getAttribute('src');
                if(src && revMap[src]) {{
                    revMap[src].forEach(path => {{
                        if(!nodeMapping[path]) nodeMapping[path] = [];
                        nodeMapping[path].push(node);
                    }});
                }}
            }}
            node.childNodes.forEach(child => traverse(child));
        }}
    }}

    document.addEventListener('DOMContentLoaded', async () => {{
        traverse(document.body);
        
        try {{
            const res = await fetch('/api/content');
            const data = await res.json();
            const newData = flattenObject(data);

            // Update elements with data-cms attribute
            document.querySelectorAll('[data-cms]').forEach(el => {{
                const path = el.getAttribute('data-cms');
                if (newData[path] !== undefined) {{
                    if (el.tagName.toLowerCase() === 'img') {{
                        el.setAttribute('src', newData[path]);
                    }} else {{
                        el.textContent = newData[path];
                    }}
                }}
            }});

            // Update href attributes with data-cms-href
            document.querySelectorAll('[data-cms-href]').forEach(el => {{
                const path = el.getAttribute('data-cms-href');
                if (newData[path] !== undefined) {{
                    // Check if it's an email
                    if (newData[path].includes('@')) {{
                        el.setAttribute('href', 'mailto:' + newData[path]);
                    }} else {{
                        el.setAttribute('href', newData[path]);
                    }}
                }}
            }});

            // Build a map of old image src -> new image src for direct matching
            var imageUpdates = {{}};
            for (let path in newData) {{
                if (newData[path] !== initialMap[path]) {{
                    if (nodeMapping[path]) {{
                        let nodes = nodeMapping[path];
                        nodes.forEach(n => {{
                            if(n.nodeType === Node.TEXT_NODE) {{
                                n.nodeValue = newData[path];
                            }} else if(n.nodeType === Node.ELEMENT_NODE && n.tagName.toLowerCase() === 'img') {{
                                n.setAttribute('src', newData[path]);
                            }}
                        }});
                    }}
                    // Track image path changes for fallback
                    if (typeof initialMap[path] === 'string' && typeof newData[path] === 'string') {{
                        var oldVal = initialMap[path];
                        var newVal = newData[path];
                        if (oldVal.match(/\\.(png|jpg|jpeg|svg|gif|webp)$/i) || newVal.match(/\\.(png|jpg|jpeg|svg|gif|webp)$/i)) {{
                            imageUpdates[oldVal] = newVal;
                        }}
                    }}
                }}
            }}

            if (Object.keys(imageUpdates).length > 0) {{
                document.querySelectorAll('img').forEach(function(img) {{
                    var src = img.getAttribute('src');
                    if (src && imageUpdates[src]) {{
                        img.setAttribute('src', imageUpdates[src]);
                    }}
                }});
            }}
            
            const setRes = await fetch('/api/settings');
            const settings = await setRes.json();
            
            // Update form action URLs
            if(settings.consultationFormUrl) {{
                const forms = document.querySelectorAll('form');
                forms.forEach(f => {{
                    if(f.action && f.action.includes('google.com')) {{
                        f.action = settings.consultationFormUrl;
                    }}
                }});
            }}
            
            // Update Apply Form placeholders
            if(settings.applyFormFields) {{
                const applyForm = document.getElementById('applyForm');
                if(applyForm) {{
                    const nameInput = applyForm.querySelector('input[name="name"]');
                    const emailInput = applyForm.querySelector('input[name="email"]');
                    const linkedinInput = applyForm.querySelector('input[name="linkedin"]');
                    const submitBtn = applyForm.querySelector('button[type="submit"]');
                    
                    if(nameInput && settings.applyFormFields.namePlaceholder) {{
                        nameInput.placeholder = settings.applyFormFields.namePlaceholder;
                    }}
                    if(emailInput && settings.applyFormFields.emailPlaceholder) {{
                        emailInput.placeholder = settings.applyFormFields.emailPlaceholder;
                    }}
                    if(linkedinInput && settings.applyFormFields.linkedinPlaceholder) {{
                        linkedinInput.placeholder = settings.applyFormFields.linkedinPlaceholder;
                    }}
                    if(submitBtn && settings.applyFormFields.submitButton) {{
                        submitBtn.textContent = settings.applyFormFields.submitButton;
                    }}
                }}
            }}
            
            // Update Apply Form roles
            if(settings.applyRoles && Array.isArray(settings.applyRoles)) {{
                const applyForm = document.getElementById('applyForm');
                if(applyForm) {{
                    const roleSelect = applyForm.querySelector('select[name="role"]');
                    if(roleSelect) {{
                        // Keep the first option (placeholder)
                        const firstOption = roleSelect.querySelector('option[disabled]');
                        roleSelect.innerHTML = '';
                        if(firstOption) roleSelect.appendChild(firstOption);
                        
                        // Add roles from settings
                        settings.applyRoles.forEach(role => {{
                            const option = document.createElement('option');
                            option.value = role;
                            option.textContent = role;
                            roleSelect.appendChild(option);
                        }});
                    }}
                }}
            }}

            const artRes = await fetch('/api/articles');
            const articles = await artRes.json();
            
            const blogCarousel = document.getElementById('blog-carousel-slides');
            if(blogCarousel) {{
                blogCarousel.innerHTML = '';
                const topArticles = articles.slice(0, 3);
                topArticles.forEach(art => {{
                    let dateStr = new Date(art.date).toLocaleDateString('en-US', {{ month: 'short', day: 'numeric' }});
                    if(dateStr === 'Invalid Date') dateStr = art.date;
                    const html = `
                    <article class="blog-card blog-carousel-slide">
                        <div class="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm hover:border-core/50 transition-all duration-700 h-full w-full inline-block">
                            <div class="absolute inset-0 bg-gradient-to-br from-core/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                            <div class="absolute inset-[-2px] rounded-2xl bg-gradient-to-br from-core/30 via-core/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-xl"></div>
                            <a href="blog.html?article=${{art.slug}}" class="block relative h-full flex flex-col">
                                <div class="relative overflow-hidden aspect-[16/9]">
                                    <img src="${{art.image || './img/art1.png'}}" alt="Article" class="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-1000">
                                    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                                    <div class="absolute top-4 right-4 w-10 h-10 rounded-full bg-core/20 backdrop-blur-md border border-core/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500 group-hover:rotate-45 group-hover:scale-110">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="text-core"><path d="M7 17L17 7M17 7H8M17 7V16"></path></svg>
                                    </div>
                                </div>
                                <div class="p-6 flex-1 flex flex-col">
                                    <div class="flex items-center gap-2 mb-3">
                                        <span class="px-3 py-1 rounded-lg bg-core/15 border border-core/30 text-core text-[0.65rem] uppercase tracking-wider font-bold">${{art.category || 'Blog'}}</span>
                                        <span class="text-white/20 text-xs">•</span>
                                        <span class="text-white/40 text-xs font-body">${{dateStr}}</span>
                                    </div>
                                    <h4 class="font-body text-xl font-bold text-white mb-3 leading-tight group-hover:text-core transition-colors duration-500">${{art.title}}</h4>
                                    <p class="font-body text-white/60 text-sm leading-relaxed mb-4 flex-1">${{art.excerpt || ''}}</p>
                                    <div class="flex items-center gap-2 text-white/40 text-xs">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        <span class="font-body">5 min read</span>
                                    </div>
                                </div>
                            </a>
                        </div>
                    </article>
                    `;
                    blogCarousel.insertAdjacentHTML('beforeend', html);
                }});
                blogCarousel.dispatchEvent(new CustomEvent('cms-blog-updated'));
            }}

        }} catch (e) {{
            console.error('Workeron CMS Sync Error:', e);
        }}
    }});
}})();
"""

with open("cms-client.js", "w", encoding="utf-8") as f:
    f.write(js_code)

print("Created cms-client.js")

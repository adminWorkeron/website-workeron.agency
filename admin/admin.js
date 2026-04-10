let quill;
let currentContent = {};
let currentSettings = {};
let currentArticles = [];
let uploadEndpoint = '/api/upload';
let isHtmlMode = false;
let htmlTextarea = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/admin/login.html';
            return;
        }
    } catch {
        window.location.href = '/admin/login.html';
        return;
    }

    quill = new Quill('#quill-editor', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                ['link', 'image', 'video'],
                ['clean']
            ]
        }
    });

    const toolbar = quill.getModule('toolbar');
    const toolbarContainer = document.querySelector('.ql-toolbar');
    const htmlButton = document.createElement('button');
    htmlButton.innerHTML = '&lt;/&gt;';
    htmlButton.title = 'HTML Source';
    htmlButton.className = 'ql-html-source';
    htmlButton.style.cssText = 'width: auto; padding: 0 8px; font-weight: bold;';
    toolbarContainer.appendChild(htmlButton);

    htmlButton.addEventListener('click', function(e) {
        e.preventDefault();
        isHtmlMode = !isHtmlMode;
        
        if (isHtmlMode) {
            const html = quill.root.innerHTML;
            if (!htmlTextarea) {
                htmlTextarea = document.createElement('textarea');
                htmlTextarea.style.cssText = 'width: 100%; height: 400px; font-family: monospace; font-size: 14px; padding: 12px; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; background: #0f172a; color: #e2e8f0;';
                quill.container.parentNode.insertBefore(htmlTextarea, quill.container);
            }
            htmlTextarea.value = html;
            htmlTextarea.style.display = 'block';
            quill.container.style.display = 'none';
            htmlButton.style.background = '#21F0D1';
            htmlButton.style.color = '#000';
        } else {
            const html = htmlTextarea.value;
            quill.root.innerHTML = html;
            htmlTextarea.style.display = 'none';
            quill.container.style.display = 'block';
            htmlButton.style.background = '';
            htmlButton.style.color = '';
        }
    });

    quill.getModule('toolbar').addHandler('image', () => {
        selectLocalImage();
    });
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => n.classList.remove('active'));
            e.target.classList.add('active');
            
            const target = e.target.getAttribute('data-target');
            document.querySelectorAll('.main-content > .content-area > .section').forEach(s => s.classList.remove('active'));
            const sec = document.getElementById(target);
            if(sec) sec.classList.add('active');

            if (target === 'content') loadContent();
            if (target === 'settings') loadSettings();
            if (target === 'blog') loadArticles();
        });
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/admin/login.html';
    });

    document.getElementById('art-image-upload').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const url = await uploadFile(file);
        if(url) {
            document.getElementById('art-image').value = url;
            const preview = document.getElementById('art-image-preview');
            preview.src = url;
            preview.style.display = 'block';
        }
    });

    document.getElementById('save-article-btn').addEventListener('click', saveArticle);

    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }
    if (menuToggle) {
        menuToggle.addEventListener('click', openSidebar);
    }
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) closeSidebar();
        });
    });

    document.getElementById('dashboard').classList.add('active');
});

function switchSection(target) {
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(n => {
        if(n.getAttribute('data-target') === target) n.classList.add('active');
        else n.classList.remove('active');
    });
    document.querySelectorAll('.main-content > .content-area > .section').forEach(s => s.classList.remove('active'));
    document.getElementById(target).classList.add('active');

    if (target === 'content') loadContent();
    if (target === 'settings') loadSettings();
    if (target === 'blog') loadArticles();
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('image', file);
    try {
        const res = await fetch(uploadEndpoint, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if(data.ok) return data.url;
    } catch(err) {
        alert('Upload failed: ' + err.message);
    }
    return null;
}

function selectLocalImage() {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
        const file = input.files[0];
        const url = await uploadFile(file);
        if (url) {
            const range = quill.getSelection();
            quill.insertEmbed(range.index, 'image', url);
        }
    };
}

async function loadContent() {
    const res = await fetch('/api/content');
    currentContent = await res.json();
    
    const select = document.getElementById('content-section-select');
    select.onchange = () => renderContentSection(select.value);
    
    if(select.value) renderContentSection(select.value);
}

function renderContentSection(sectionKey) {
    const container = document.getElementById('content-editor-container');
    container.innerHTML = '';
    
    if(!sectionKey || !currentContent[sectionKey]) {
        container.innerHTML = '<p style="color:var(--text-muted)">Select a section to edit.</p>';
        return;
    }
    
    const data = currentContent[sectionKey];
    container.appendChild(buildEditorForm(data, sectionKey, currentContent));
}

function buildEditorForm(data, path, rootData) {
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '16px';

    if (typeof data === 'string' || typeof data === 'number') {
        const isImage = typeof data === 'string' && (data.includes('.png') || data.includes('.jpg') || data.includes('.svg') || data.includes('/uploads/'));
        const isLongText = typeof data === 'string' && data.length > 60;
        
        let label = (path.split('.').pop()).replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        
        const group = document.createElement('div');
        group.className = 'form-group';
        group.innerHTML = `<label>${label}</label>`;
        
        if (isImage) {
            const inputGroup = document.createElement('div');
            inputGroup.style.display = 'flex';
            inputGroup.style.gap = '8px';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.value = data;
            input.dataset.path = path;
            input.className = 'content-input';
            
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.style.display = 'none';
            fileInput.accept = 'image/*';
            fileInput.onchange = async (e) => {
                const url = await uploadFile(e.target.files[0]);
                if(url) {
                    input.value = url;
                    preview.src = url;
                }
            };
            
            const uploadBtn = document.createElement('button');
            uploadBtn.className = 'btn-secondary';
            uploadBtn.textContent = 'Upload';
            uploadBtn.onclick = () => fileInput.click();
            
            const preview = document.createElement('img');
            preview.src = data;
            preview.className = 'image-preview';
            preview.style.display = data ? 'block' : 'none';
            preview.style.width = '100px';
            preview.onerror = () => preview.style.display = 'none';
            
            inputGroup.appendChild(input);
            inputGroup.appendChild(fileInput);
            inputGroup.appendChild(uploadBtn);
            
            group.appendChild(inputGroup);
            group.appendChild(preview);
        } else if (isLongText) {
            const textarea = document.createElement('textarea');
            textarea.value = data;
            textarea.dataset.path = path;
            textarea.className = 'content-input';
            group.appendChild(textarea);
        } else {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = data;
            input.dataset.path = path;
            input.className = 'content-input';
            group.appendChild(input);
        }
        wrapper.appendChild(group);
        return wrapper;
    }

    if (Array.isArray(data)) {
        const listWrapper = document.createElement('div');
        listWrapper.className = 'list-container';
        listWrapper.innerHTML = `<h3>${path.split('.').pop()} Items (${data.length})</h3>`;
        
        data.forEach((item, index) => {
            const itemWrapper = document.createElement('div');
            itemWrapper.className = 'list-item';
            itemWrapper.innerHTML = `<strong>Item #${index + 1}</strong>`;
            itemWrapper.appendChild(buildEditorForm(item, `${path}.${index}`, rootData));
            listWrapper.appendChild(itemWrapper);
        });
        
        wrapper.appendChild(listWrapper);
        return wrapper;
    }

    if (typeof data === 'object' && data !== null) {
        Object.keys(data).forEach(key => {
            wrapper.appendChild(buildEditorForm(data[key], path ? `${path}.${key}` : key, rootData));
        });
        return wrapper;
    }

    return wrapper;
}

document.getElementById('save-content-btn').addEventListener('click', async () => {
    const select = document.getElementById('content-section-select');
    const sectionKey = select.value;
    if(!sectionKey) return;

    document.querySelectorAll('.content-input').forEach(input => {
        let path = input.dataset.path;
        if(!path) return;
        
        // Remove section key prefix if present
        if(path.startsWith(sectionKey + '.')) {
            path = path.substring(sectionKey.length + 1);
        }
        
        const parts = path.split('.');
        const last = parts.pop();
        let curr = currentContent[sectionKey];
        parts.forEach(p => curr = curr[p]);
        curr[last] = input.value;
    });

    const status = document.getElementById('content-status');
    status.innerHTML = 'Saving...';
    try {
        const res = await fetch(`/api/content/${sectionKey}`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(currentContent[sectionKey])
        });
        if(res.ok) {
            status.innerHTML = `<span style="color:var(--success)">Saved section "${sectionKey}" successfully!</span>`;
            setTimeout(() => status.innerHTML='', 3000);
        } else {
            throw new Error('Save failed');
        }
    } catch(err) {
        status.innerHTML = `<span style="color:var(--danger)">${err.message}</span>`;
    }
});


async function loadSettings() {
    const res = await fetch('/api/settings');
    currentSettings = await res.json();
    
    const container = document.getElementById('settings-editor-container');
    container.innerHTML = '';
    container.appendChild(buildEditorForm(currentSettings, '', currentSettings));
    
    container.querySelectorAll('.content-input').forEach(el => {
        el.classList.remove('content-input');
        el.classList.add('settings-input');
    });
}

document.getElementById('save-settings-btn').addEventListener('click', async () => {
    document.querySelectorAll('.settings-input').forEach(input => {
        let path = input.dataset.path;
        if(path.startsWith('.')) path = path.substring(1);
        const parts = path.split('.');
        const last = parts.pop();
        let curr = currentSettings;
        parts.forEach(p => curr = curr[p]);
        curr[last] = input.value;
    });

    const status = document.getElementById('settings-status');
    status.innerHTML = 'Saving...';
    try {
        const res = await fetch(`/api/settings`, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(currentSettings)
        });
        if(res.ok) {
            status.innerHTML = `<span style="color:var(--success)">Settings saved successfully!</span>`;
            setTimeout(() => status.innerHTML='', 3000);
        } else {
            throw new Error('Save failed');
        }
    } catch(err) {
        status.innerHTML = `<span style="color:var(--danger)">${err.message}</span>`;
    }
});


async function loadArticles() {
    const res = await fetch('/api/articles');
    currentArticles = await res.json();
    
    const tbody = document.querySelector('#articles-table tbody');
    tbody.innerHTML = '';
    
    currentArticles.forEach(art => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${art.title}</strong></td>
            <td>${art.date}</td>
            <td>${art.category}</td>
            <td class="actions">
                <button class="btn-secondary" onclick="editArticle(${art.id})">Edit</button>
                <button class="btn-danger" onclick="deleteArticle(${art.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openArticleEditor(article = null) {
    switchSection('article-editor');
    
    document.getElementById('article-status').innerHTML = '';
    const imgPreview = document.getElementById('art-image-preview');

    if(article) {
        document.getElementById('article-editor-title').textContent = 'Edit Article';
        document.getElementById('art-id').value = article.id;
        document.getElementById('art-title').value = article.title;
        document.getElementById('art-slug').value = article.slug;
        document.getElementById('art-date').value = article.date;
        document.getElementById('art-category').value = article.category;
        document.getElementById('art-author').value = article.author;
        document.getElementById('art-image').value = article.image;
        document.getElementById('art-excerpt').value = article.excerpt;
        quill.root.innerHTML = article.content || '';
        
        if(article.image) {
            imgPreview.src = article.image;
            imgPreview.style.display = 'block';
        } else {
            imgPreview.style.display = 'none';
        }
    } else {
        document.getElementById('article-editor-title').textContent = 'Create Article';
        document.getElementById('art-id').value = '';
        document.getElementById('art-title').value = '';
        document.getElementById('art-slug').value = '';
        document.getElementById('art-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('art-category').value = '';
        document.getElementById('art-author').value = 'Workeron Team';
        document.getElementById('art-image').value = '';
        document.getElementById('art-excerpt').value = '';
        quill.root.innerHTML = '';
        imgPreview.style.display = 'none';
    }
}

function editArticle(id) {
    const art = currentArticles.find(a => a.id === id);
    if(art) openArticleEditor(art);
}

async function deleteArticle(id) {
    if(!confirm('Are you sure you want to delete this article?')) return;
    
    await fetch(`/api/articles/${id}`, { method: 'DELETE' });
    loadArticles();
}

function generateSlug() {
    const title = document.getElementById('art-title').value;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    document.getElementById('art-slug').value = slug;
}

async function saveArticle() {
    const id = document.getElementById('art-id').value;
    
    let content;
    if (isHtmlMode && htmlTextarea) {
        content = htmlTextarea.value;
    } else {
        content = quill.root.innerHTML;
    }
    
    const payload = {
        title: document.getElementById('art-title').value,
        slug: document.getElementById('art-slug').value,
        date: document.getElementById('art-date').value,
        category: document.getElementById('art-category').value,
        author: document.getElementById('art-author').value,
        image: document.getElementById('art-image').value,
        excerpt: document.getElementById('art-excerpt').value,
        content: content
    };

    const status = document.getElementById('article-status');
    status.innerHTML = 'Saving...';
    
    try {
        const url = id ? `/api/articles/${id}` : '/api/articles';
        const method = id ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
            method: method,
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });
        
        const data = await res.json();
        if(res.ok) {
            status.innerHTML = `<span style="color:var(--success)">Article saved!</span>`;
            setTimeout(() => switchSection('blog'), 1000);
        } else {
            throw new Error(data.error || 'Save failed');
        }
    } catch(err) {
        status.innerHTML = `<span style="color:var(--danger)">${err.message}</span>`;
    }
}
